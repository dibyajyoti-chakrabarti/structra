import json
import logging
import hashlib
from datetime import datetime, timedelta, timezone as dt_timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

import razorpay
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.downgrade_service import validate_voluntary_downgrade_or_400
from .constants import PLAN_INDIVIDUAL, PLAN_PRICES
from core.pricing import PLAN_CORE, PLAN_TEAM
from .models import PaymentTransaction, WebhookEventLog
from .serializers import (
    CancelSubscriptionRequestSerializer,
    CheckoutSubscriptionRequestSerializer,
    CreateSubscriptionRequestSerializer,
    CreateSubscriptionResponseSerializer,
    VoluntaryDowngradeRequestSerializer,
    VerifySubscriptionRequestSerializer,
)
from workspaces.credit_service import ensure_workspace_credit_state
from workspaces.models import Workspace

logger = logging.getLogger(__name__)


def _get_razorpay_client():
    key_id = (settings.RAZORPAY_KEY_ID or '').strip()
    key_secret = (settings.RAZORPAY_KEY_SECRET or '').strip()
    if not key_id or not key_secret:
        raise ValueError('Razorpay credentials are missing in settings.')
    return razorpay.Client(auth=(key_id, key_secret))


def _get_plan_subscription_id(plan_name):
    if plan_name == PLAN_INDIVIDUAL:
        preferred = (getattr(settings, "RAZORPAY_INDIVIDUAL_PLAN_ID", "") or "").strip()
        legacy = (getattr(settings, "RAZORPAY_PLAN_ID_INDIVIDUAL", "") or "").strip()
        return preferred or legacy
    if plan_name == PLAN_TEAM:
        preferred = (getattr(settings, "RAZORPAY_TEAM_PLAN_ID", "") or "").strip()
        legacy = (getattr(settings, "RAZORPAY_PLAN_ID_TEAM", "") or "").strip()
        return preferred or legacy
    return ''


def _provision_user_plan(user, plan_name, duration_days=30, extend_from_existing=False):
    now = timezone.now()
    base_expiry = now
    if extend_from_existing and user.plan_expires_at and user.plan_expires_at > now:
        base_expiry = user.plan_expires_at

    user.current_plan = plan_name
    user.plan_expires_at = base_expiry + timedelta(days=duration_days)
    user.save(update_fields=['current_plan', 'plan_expires_at'])
    return user


def _mark_transaction_active(
    transaction,
    payment_id=None,
    payment_signature=None,
    duration_days=30,
    extend_from_existing=False,
):
    transaction.status = PaymentTransaction.Status.ACTIVE
    update_fields = ['status', 'updated_at']

    if payment_id is not None:
        transaction.razorpay_payment_id = payment_id
        update_fields.append('razorpay_payment_id')
    if payment_signature is not None:
        transaction.razorpay_signature = payment_signature
        update_fields.append('razorpay_signature')

    transaction.save(update_fields=update_fields)
    return _provision_user_plan(
        transaction.user,
        transaction.plan_name,
        duration_days=duration_days,
        extend_from_existing=extend_from_existing,
    )


class CreateSubscriptionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        request_serializer = CreateSubscriptionRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            plan_errors = request_serializer.errors.get('plan_name')
            if plan_errors:
                return Response(
                    {'error': str(plan_errors[0])},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response(
                {'error': 'Invalid request payload'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if request.user.current_plan != request.user.CurrentPlan.CORE:
            return Response(
                {'error': 'You already have an active plan.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            client = _get_razorpay_client()
        except ValueError:
            logger.error('Razorpay credentials are missing in settings.')
            return Response(
                {'error': 'Payment service unavailable'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        plan_name = request_serializer.validated_data['plan_name']
        plan_id = _get_plan_subscription_id(plan_name)
        if not plan_id:
            logger.error('Razorpay plan id is missing for plan %s', plan_name)
            return Response(
                {'error': 'Payment service unavailable'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        amount_inr = PLAN_PRICES[plan_name]

        try:
            amount_paise = int((Decimal(amount_inr) * 100).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
        except (InvalidOperation, TypeError, ValueError):
            logger.exception('Invalid configured amount for plan %s', plan_name)
            return Response(
                {'error': 'Payment service unavailable'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if amount_paise <= 0:
            logger.error('Non-positive configured amount for plan %s', plan_name)
            return Response(
                {'error': 'Payment service unavailable'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            subscription_payload = client.subscription.create(
                {
                    'plan_id': plan_id,
                    'total_count': 12,
                    'customer_notify': 1,
                }
            )
        except Exception:
            logger.exception('Razorpay subscription creation failed for user %s and plan %s', request.user.user_id, plan_name)
            return Response(
                {'error': 'Unable to create subscription'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        razorpay_subscription_id = (subscription_payload or {}).get('id')
        if not razorpay_subscription_id:
            logger.error(
                'Razorpay subscription response missing id for user %s and plan %s',
                request.user.user_id,
                plan_name,
            )
            return Response(
                {'error': 'Unable to create subscription'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        PaymentTransaction.objects.create(
            user=request.user,
            plan_name=plan_name,
            amount=amount_inr,
            status=PaymentTransaction.Status.PENDING,
            razorpay_subscription_id=razorpay_subscription_id,
        )

        response_serializer = CreateSubscriptionResponseSerializer(
            data={
                'razorpay_subscription_id': razorpay_subscription_id,
                'amount': amount_inr,
                'currency': 'INR',
            }
        )
        response_serializer.is_valid(raise_exception=True)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class CheckoutSubscriptionView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    ALLOWED_TRANSITIONS = {
        (PLAN_CORE, PLAN_INDIVIDUAL),
        (PLAN_CORE, PLAN_TEAM),
        (PLAN_INDIVIDUAL, PLAN_TEAM),
    }

    @staticmethod
    def _validate_checkout_transition(current_plan, target_plan):
        if target_plan == current_plan:
            return "You are already on this plan."
        if (current_plan, target_plan) not in CheckoutSubscriptionView.ALLOWED_TRANSITIONS:
            return "Downgrades are not allowed via checkout. Use plan downgrade flow."
        return None

    def post(self, request):
        request_serializer = CheckoutSubscriptionRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            plan_errors = request_serializer.errors.get("plan_name")
            quantity_errors = request_serializer.errors.get("quantity")
            if plan_errors:
                return Response(
                    {"error": str(plan_errors[0])},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if quantity_errors:
                return Response(
                    {"error": str(quantity_errors[0])},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response(
                {"error": "Invalid request payload"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        plan_name = request_serializer.validated_data["plan_name"]
        effective_quantity = int(request_serializer.validated_data.get("quantity") or 1)
        current_plan = (request.user.current_plan or PLAN_CORE).upper()
        transition_error = self._validate_checkout_transition(current_plan, plan_name)
        if transition_error:
            return Response(
                {"error": transition_error},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            client = _get_razorpay_client()
        except ValueError:
            logger.error("Razorpay credentials are missing in settings.")
            return Response(
                {"error": "Payment service unavailable"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        plan_id = _get_plan_subscription_id(plan_name)
        if not plan_id:
            logger.error("Razorpay plan id is missing for plan %s", plan_name)
            return Response(
                {"error": "Payment service unavailable"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        unit_amount_inr = PLAN_PRICES[plan_name]
        amount_inr = (Decimal(unit_amount_inr) * Decimal(effective_quantity)).quantize(Decimal("0.01"))
        try:
            amount_paise = int((Decimal(amount_inr) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
        except (InvalidOperation, TypeError, ValueError):
            logger.exception("Invalid configured amount for plan %s", plan_name)
            return Response(
                {"error": "Payment service unavailable"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        if amount_paise <= 0:
            logger.error("Non-positive configured amount for plan %s", plan_name)
            return Response(
                {"error": "Payment service unavailable"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        create_payload = {
            "plan_id": plan_id,
            "total_count": 120,
            "customer_notify": 1,
        }
        if plan_name == PLAN_TEAM:
            create_payload["quantity"] = effective_quantity

        try:
            subscription_payload = client.subscription.create(create_payload)
        except Exception:
            logger.exception(
                "Razorpay checkout subscription creation failed for user %s and plan %s",
                request.user.user_id,
                plan_name,
            )
            return Response(
                {"error": "Unable to create subscription"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        razorpay_subscription_id = (subscription_payload or {}).get("id")
        if not razorpay_subscription_id:
            logger.error(
                "Razorpay checkout response missing id for user %s and plan %s",
                request.user.user_id,
                plan_name,
            )
            return Response(
                {"error": "Unable to create subscription"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        PaymentTransaction.objects.create(
            user=request.user,
            plan_name=plan_name,
            amount=amount_inr,
            requested_seats=effective_quantity,
            status=PaymentTransaction.Status.PENDING,
            razorpay_subscription_id=razorpay_subscription_id,
        )

        response_serializer = CreateSubscriptionResponseSerializer(
            data={
                "razorpay_subscription_id": razorpay_subscription_id,
                "amount": amount_inr,
                "currency": "INR",
            }
        )
        response_serializer.is_valid(raise_exception=True)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class VerifySubscriptionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @staticmethod
    def _success_response(user):
        return Response(
            {
                'message': 'Payment verified',
                'current_plan': user.current_plan,
                'expires_at': user.plan_expires_at,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        request_serializer = VerifySubscriptionRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response(
                {'error': 'Invalid request payload'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        razorpay_subscription_id = request_serializer.validated_data['razorpay_subscription_id']
        razorpay_payment_id = request_serializer.validated_data['razorpay_payment_id']
        razorpay_signature = request_serializer.validated_data['razorpay_signature']

        payment_tx = PaymentTransaction.objects.filter(
            razorpay_subscription_id=razorpay_subscription_id,
            user=request.user,
        ).select_related('user').first()
        if not payment_tx:
            return Response(
                {'error': 'Invalid transaction state'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if payment_tx.status == PaymentTransaction.Status.ACTIVE:
            return self._success_response(payment_tx.user)

        if payment_tx.status != PaymentTransaction.Status.PENDING:
            return Response(
                {'error': 'Invalid transaction state'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            client = _get_razorpay_client()
        except ValueError:
            logger.error('Razorpay credentials are missing in settings.')
            return Response(
                {'error': 'Payment service unavailable'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            client.utility.verify_subscription_payment_signature(
                {
                    'razorpay_subscription_id': razorpay_subscription_id,
                    'razorpay_payment_id': razorpay_payment_id,
                    'razorpay_signature': razorpay_signature,
                }
            )
        except razorpay.errors.SignatureVerificationError:
            with transaction.atomic():
                locked_tx = (
                    PaymentTransaction.objects.select_for_update()
                    .filter(id=payment_tx.id)
                    .first()
                )
                if locked_tx:
                    locked_tx.status = PaymentTransaction.Status.FAILED
                    locked_tx.razorpay_payment_id = razorpay_payment_id
                    locked_tx.razorpay_signature = razorpay_signature
                    locked_tx.save(
                        update_fields=[
                            'status',
                            'razorpay_payment_id',
                            'razorpay_signature',
                            'updated_at',
                        ]
                    )
            return Response(
                {'error': 'Invalid payment signature'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            logger.exception(
                'Razorpay verification failed for user %s and subscription %s',
                request.user.user_id,
                razorpay_subscription_id,
            )
            return Response(
                {'error': 'Unable to verify payment'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        with transaction.atomic():
            locked_tx = (
                PaymentTransaction.objects.select_related('user')
                .select_for_update()
                .filter(id=payment_tx.id, user=request.user)
                .first()
            )
            if not locked_tx:
                return Response(
                    {'error': 'Invalid transaction state'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if locked_tx.status == PaymentTransaction.Status.ACTIVE:
                return self._success_response(locked_tx.user)
            if locked_tx.status != PaymentTransaction.Status.PENDING:
                return Response(
                    {'error': 'Invalid transaction state'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user = _mark_transaction_active(
                locked_tx,
                payment_id=razorpay_payment_id,
                payment_signature=razorpay_signature,
                duration_days=30,
                extend_from_existing=False,
            )

            if locked_tx.plan_name == PLAN_TEAM:
                purchased_team_seats = max(int(locked_tx.requested_seats or 1), 1)
                if user.purchased_team_seats != purchased_team_seats:
                    user.purchased_team_seats = purchased_team_seats
                    user.save(update_fields=['purchased_team_seats'])

                now = timezone.now()
                workspaces = list(
                    Workspace.objects.select_for_update()
                    .select_related("owner")
                    .filter(owner=user)
                    .order_by("id")
                )
                for workspace in workspaces:
                    ensure_workspace_credit_state(workspace, now=now, force_reset=True)

        return self._success_response(user)


class CancelSubscriptionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @staticmethod
    def _success_response(user):
        return Response(
            {
                'message': 'Subscription cancelled',
                'current_plan': user.current_plan,
                'expires_at': user.plan_expires_at,
            },
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        request_serializer = CancelSubscriptionRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response(
                {'error': 'Invalid request payload'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        razorpay_subscription_id = request_serializer.validated_data['razorpay_subscription_id']

        transaction = PaymentTransaction.objects.filter(
            razorpay_subscription_id=razorpay_subscription_id,
            user=request.user,
        ).select_related('user').first()
        if not transaction:
            return Response(
                {'error': 'Invalid transaction state'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if transaction.status == PaymentTransaction.Status.CANCELLED:
            return self._success_response(transaction.user)

        if transaction.status != PaymentTransaction.Status.ACTIVE:
            return Response(
                {'error': 'Invalid transaction state'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not razorpay_subscription_id.startswith('sub_'):
            logger.warning(
                'Skipping Razorpay cancellation for legacy non-subscription id %s for user %s',
                razorpay_subscription_id,
                request.user.user_id,
            )
            transaction.status = PaymentTransaction.Status.CANCELLED
            transaction.save(update_fields=['status', 'updated_at'])
            return self._success_response(transaction.user)

        try:
            client = _get_razorpay_client()
        except ValueError:
            logger.error('Razorpay credentials are missing in settings.')
            return Response(
                {'error': 'Payment service unavailable'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            client.subscription.cancel(
                razorpay_subscription_id,
                {'cancel_at_cycle_end': 1},
            )
        except Exception:
            logger.exception(
                'Razorpay subscription cancellation failed for user %s and subscription %s',
                request.user.user_id,
                razorpay_subscription_id,
            )
            return Response(
                {'error': 'Unable to cancel subscription'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        transaction.status = PaymentTransaction.Status.CANCELLED
        transaction.save(update_fields=['status', 'updated_at'])

        return self._success_response(transaction.user)


class VoluntaryDowngradeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = VoluntaryDowngradeRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target_plan = serializer.validated_data["target_plan"]
        current_plan = (request.user.current_plan or PLAN_CORE).upper()
        if current_plan == PLAN_CORE:
            return Response(
                {"error": "Core plan cannot be downgraded further."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if target_plan == current_plan:
            return Response(
                {"error": "Current plan already matches the requested plan."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        validate_voluntary_downgrade_or_400(user=request.user, target_plan=target_plan)

        request.user.current_plan = target_plan
        request.user.save(update_fields=["current_plan"])

        return Response(
            {
                "message": f"Plan downgraded to {target_plan}.",
                "current_plan": request.user.current_plan,
                "expires_at": request.user.plan_expires_at,
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name='dispatch')
class RazorpayWebhookView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    SUPPORTED_EVENTS = {
        "subscription.charged",
        "subscription.cancelled",
        "subscription.halted",
        "subscription.updated",
    }

    class InvalidWebhookPayload(ValueError):
        pass

    @staticmethod
    def _safe_payload_context(payload):
        if not isinstance(payload, dict):
            return {"event": None, "event_id": None, "top_level_keys": []}
        return {
            "event": payload.get("event"),
            "event_id": payload.get("id"),
            "top_level_keys": sorted(list(payload.keys())),
        }

    @staticmethod
    def _event_id(payload):
        event_id = payload.get("id")
        if not isinstance(event_id, str) or not event_id.strip():
            # Razorpay webhook payloads may omit top-level event ids. In that case,
            # derive a deterministic idempotency key from canonical payload content.
            canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
            derived = f"derived_{hashlib.sha256(canonical.encode('utf-8')).hexdigest()}"
            logger.warning(
                "Razorpay webhook payload missing top-level id; using derived id. event=%s",
                payload.get("event"),
            )
            return derived
        return event_id.strip()

    @staticmethod
    def _get_subscription_entity(payload):
        try:
            return payload["payload"]["subscription"]["entity"]
        except (TypeError, KeyError):
            raise RazorpayWebhookView.InvalidWebhookPayload("Missing subscription entity")

    @staticmethod
    def _get_payment_entity(payload):
        try:
            return payload["payload"]["payment"]["entity"]
        except (TypeError, KeyError):
            raise RazorpayWebhookView.InvalidWebhookPayload("Missing payment entity")

    @staticmethod
    def _to_aware_datetime(epoch_seconds):
        try:
            return datetime.fromtimestamp(int(epoch_seconds), tz=dt_timezone.utc)
        except (TypeError, ValueError, OSError, OverflowError):
            raise RazorpayWebhookView.InvalidWebhookPayload("Invalid current_end timestamp")

    @staticmethod
    def _lock_event_log(event_id, event_type):
        event_log = (
            WebhookEventLog.objects.select_for_update()
            .filter(razorpay_event_id=event_id)
            .first()
        )
        if event_log is None:
            return WebhookEventLog.objects.create(
                razorpay_event_id=event_id,
                event_type=event_type or "",
                status=WebhookEventLog.Status.PROCESSING,
            )
        return event_log

    @staticmethod
    def _mark_event_failed(event_log, message):
        event_log.status = WebhookEventLog.Status.FAILED
        event_log.last_error = (message or "")[:1000]
        event_log.processed_at = None
        event_log.save(update_fields=["status", "last_error", "processed_at", "updated_at"])

    @staticmethod
    def _mark_event_succeeded(event_log, *, subscription_id=None):
        if subscription_id:
            event_log.subscription_id = subscription_id
        event_log.status = WebhookEventLog.Status.SUCCEEDED
        event_log.last_error = ""
        event_log.processed_at = timezone.now()
        event_log.save(
            update_fields=[
                "subscription_id",
                "status",
                "last_error",
                "processed_at",
                "updated_at",
            ]
        )

    @staticmethod
    def _mark_event_processing(event_log, event_type):
        event_log.event_type = event_type or event_log.event_type
        event_log.status = WebhookEventLog.Status.PROCESSING
        event_log.last_error = ""
        event_log.processed_at = None
        event_log.save(update_fields=["event_type", "status", "last_error", "processed_at", "updated_at"])

    def _warn_untracked_subscription(self, subscription_id, event_type):
        logger.warning(
            "Received valid webhook for untracked subscription_id=%s event=%s",
            subscription_id,
            event_type,
        )

    def _parse_positive_quantity(self, raw_quantity):
        try:
            quantity = int(raw_quantity)
        except (TypeError, ValueError):
            raise self.InvalidWebhookPayload("Missing or invalid subscription quantity")
        if quantity < 1:
            raise self.InvalidWebhookPayload("Missing or invalid subscription quantity")
        return quantity

    @staticmethod
    def _apply_team_pool_update(workspace, quantity):
        old_monthly = int(workspace.ai_credits_monthly or 0)
        old_remaining = int(workspace.ai_credits_remaining or 0)
        consumed = max(old_monthly - old_remaining, 0)

        new_monthly = int(quantity) * 80
        new_remaining = max(new_monthly - consumed, 0)

        update_fields = []
        if workspace.ai_credits_monthly != new_monthly:
            workspace.ai_credits_monthly = new_monthly
            update_fields.append("ai_credits_monthly")
        if workspace.ai_credits_remaining != new_remaining:
            workspace.ai_credits_remaining = new_remaining
            update_fields.append("ai_credits_remaining")

        if update_fields:
            workspace.save(update_fields=[*update_fields, "updated_at"])

    @staticmethod
    def _cancel_previous_active_subscriptions_after_commit(user_id, subscriptions_to_cancel):
        if not subscriptions_to_cancel:
            return

        try:
            client = _get_razorpay_client()
        except ValueError:
            logger.error(
                "Unable to cancel prior subscriptions after upgrade for user %s due to missing Razorpay credentials.",
                user_id,
            )
            return

        for tx_id, subscription_id in subscriptions_to_cancel:
            try:
                client.subscription.cancel(subscription_id)
            except Exception:
                logger.exception(
                    "Failed to cancel old active subscription %s for transaction %s (user=%s).",
                    subscription_id,
                    tx_id,
                    user_id,
                )
                continue

            PaymentTransaction.objects.filter(id=tx_id).update(
                status=PaymentTransaction.Status.CANCELLED,
                updated_at=timezone.now(),
            )

    def _handle_subscription_charged(self, payload):
        payment_entity = self._get_payment_entity(payload)
        subscription_entity = self._get_subscription_entity(payload)

        subscription_id = payment_entity.get("subscription_id") or subscription_entity.get("id")
        payment_id = payment_entity.get("id")
        current_end = subscription_entity.get("current_end")
        if not subscription_id:
            raise self.InvalidWebhookPayload("Missing subscription id")
        expires_at = self._to_aware_datetime(current_end)

        payment_tx = (
            PaymentTransaction.objects.select_related("user")
            .select_for_update()
            .filter(razorpay_subscription_id=subscription_id)
            .first()
        )
        if payment_tx is None:
            self._warn_untracked_subscription(subscription_id, "subscription.charged")
            return {"message": "Event ignored", "subscription_id": subscription_id}

        team_quantity = None
        if payment_tx.plan_name == PLAN_TEAM:
            team_quantity = self._parse_positive_quantity(subscription_entity.get("quantity"))

        user = (
            payment_tx.user.__class__.objects.select_for_update()
            .only("user_id", "current_plan", "plan_expires_at", "purchased_team_seats")
            .get(pk=payment_tx.user_id)
        )

        payment_tx.status = PaymentTransaction.Status.ACTIVE
        update_fields = ["status", "updated_at"]
        if payment_id:
            payment_tx.razorpay_payment_id = payment_id
            update_fields.append("razorpay_payment_id")
        payment_tx.save(update_fields=update_fields)

        user.current_plan = payment_tx.plan_name
        user.plan_expires_at = expires_at
        user_update_fields = ["current_plan", "plan_expires_at"]
        if team_quantity is not None and user.purchased_team_seats != team_quantity:
            user.purchased_team_seats = team_quantity
            user_update_fields.append("purchased_team_seats")
        user.save(update_fields=user_update_fields)

        now = timezone.now()
        workspaces = list(
            Workspace.objects.select_for_update()
            .select_related("owner")
            .filter(owner=user)
            .order_by("id")
        )
        for workspace in workspaces:
            ensure_workspace_credit_state(workspace, now=now, force_reset=True)
            if workspace.ai_credits_reset_at != expires_at:
                workspace.ai_credits_reset_at = expires_at
                workspace.save(update_fields=["ai_credits_reset_at", "updated_at"])

        subscriptions_to_cancel = []
        if user.current_plan == PLAN_TEAM:
            subscriptions_to_cancel = list(
                PaymentTransaction.objects.select_for_update()
                .filter(
                    user_id=user.user_id,
                    status=PaymentTransaction.Status.ACTIVE,
                )
                .exclude(id=payment_tx.id)
                .exclude(razorpay_subscription_id__isnull=True)
                .exclude(razorpay_subscription_id="")
                .values_list("id", "razorpay_subscription_id")
            )
            if subscriptions_to_cancel:
                transaction.on_commit(
                    lambda: self._cancel_previous_active_subscriptions_after_commit(
                        user.user_id,
                        subscriptions_to_cancel,
                    )
                )

        return {"message": "Webhook processed", "subscription_id": subscription_id}

    def _handle_subscription_cancelled_or_halted(self, payload, event_type):
        subscription_entity = self._get_subscription_entity(payload)
        subscription_id = subscription_entity.get("id")
        if not subscription_id:
            raise self.InvalidWebhookPayload("Missing subscription id")

        payment_tx = (
            PaymentTransaction.objects.select_for_update()
            .filter(razorpay_subscription_id=subscription_id)
            .first()
        )
        if payment_tx is None:
            self._warn_untracked_subscription(subscription_id, event_type)
            return {"message": "Event ignored", "subscription_id": subscription_id}

        payment_tx.status = (
            PaymentTransaction.Status.CANCELLED
            if event_type == "subscription.cancelled"
            else PaymentTransaction.Status.FAILED
        )
        payment_tx.save(update_fields=["status", "updated_at"])
        return {"message": "Webhook processed", "subscription_id": subscription_id}

    def _handle_subscription_updated(self, payload):
        subscription_entity = self._get_subscription_entity(payload)
        subscription_id = subscription_entity.get("id")
        if not subscription_id:
            raise self.InvalidWebhookPayload("Missing subscription id")
        payload_quantity = self._parse_positive_quantity(subscription_entity.get("quantity"))

        payment_tx = (
            PaymentTransaction.objects.select_related("user")
            .select_for_update()
            .filter(razorpay_subscription_id=subscription_id)
            .first()
        )
        if payment_tx is None:
            self._warn_untracked_subscription(subscription_id, "subscription.updated")
            return {"message": "Event ignored", "subscription_id": subscription_id}

        if payment_tx.plan_name != PLAN_TEAM:
            return {"message": "Webhook processed", "subscription_id": subscription_id}

        user = (
            payment_tx.user.__class__.objects.select_for_update()
            .only("user_id", "purchased_team_seats")
            .get(pk=payment_tx.user_id)
        )
        if user.purchased_team_seats != payload_quantity:
            user.purchased_team_seats = payload_quantity
            user.save(update_fields=["purchased_team_seats"])

        workspaces = list(
            Workspace.objects.select_for_update()
            .filter(owner=user)
            .order_by("id")
        )
        for workspace in workspaces:
            self._apply_team_pool_update(workspace, payload_quantity)

        return {"message": "Webhook processed", "subscription_id": subscription_id}

    def _dispatch_event(self, payload):
        event_type = payload.get("event")
        if event_type not in self.SUPPORTED_EVENTS:
            return {"message": "Event ignored", "subscription_id": None}
        if event_type == "subscription.charged":
            return self._handle_subscription_charged(payload)
        if event_type == "subscription.updated":
            return self._handle_subscription_updated(payload)
        return self._handle_subscription_cancelled_or_halted(payload, event_type)

    def post(self, request):
        signature = request.headers.get('X-Razorpay-Signature')
        if not signature:
            return Response({'error': 'Missing webhook signature'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload_raw = request.body.decode('utf-8')
        except UnicodeDecodeError:
            return Response({'error': 'Invalid webhook payload'}, status=status.HTTP_400_BAD_REQUEST)

        webhook_secret = (settings.RAZORPAY_WEBHOOK_SECRET or '').strip()
        if not webhook_secret:
            logger.error('Razorpay webhook secret is missing in settings.')
            return Response(
                {'error': 'Payment service unavailable'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            client = _get_razorpay_client()
        except ValueError:
            logger.error('Razorpay credentials are missing in settings.')
            return Response(
                {'error': 'Payment service unavailable'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            client.utility.verify_webhook_signature(payload_raw, signature, webhook_secret)
        except razorpay.errors.SignatureVerificationError:
            return Response({'error': 'Invalid webhook signature'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception('Webhook signature verification failed unexpectedly.')
            return Response({'error': 'Invalid webhook signature'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = json.loads(payload_raw)
        except json.JSONDecodeError:
            return Response({'error': 'Invalid webhook payload'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            event_id = self._event_id(payload)
        except self.InvalidWebhookPayload as exc:
            context = self._safe_payload_context(payload)
            logger.warning(
                "Rejected Razorpay webhook payload: reason=%s event=%s event_id=%s keys=%s",
                str(exc),
                context["event"],
                context["event_id"],
                context["top_level_keys"],
            )
            return Response({'error': 'Invalid webhook payload'}, status=status.HTTP_400_BAD_REQUEST)

        event_type = payload.get("event") or ""
        with transaction.atomic():
            event_log = self._lock_event_log(event_id, event_type)
            if event_log.status == WebhookEventLog.Status.SUCCEEDED:
                return Response({'message': 'Already processed'}, status=status.HTTP_200_OK)
            self._mark_event_processing(event_log, event_type)

            try:
                result = self._dispatch_event(payload)
            except self.InvalidWebhookPayload as exc:
                logger.warning(
                    "Rejected Razorpay webhook payload: reason=%s event=%s event_id=%s",
                    str(exc),
                    event_type,
                    event_id,
                )
                self._mark_event_failed(event_log, str(exc))
                return Response({'error': 'Invalid webhook payload'}, status=status.HTTP_400_BAD_REQUEST)
            except Exception:
                logger.exception('Failed to process webhook event %s', event_id)
                self._mark_event_failed(event_log, "Unexpected webhook processing error")
                return Response({'error': 'Unable to process webhook'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            self._mark_event_succeeded(event_log, subscription_id=result.get("subscription_id"))
            return Response({'message': result['message']}, status=status.HTTP_200_OK)
