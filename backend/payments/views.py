import json
import logging
from datetime import timedelta
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

import razorpay
from django.conf import settings
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .constants import PLAN_INDIVIDUAL, PLAN_PRICES
from core.pricing import PLAN_TEAM
from .models import PaymentTransaction
from .serializers import (
    CancelSubscriptionRequestSerializer,
    CreateSubscriptionRequestSerializer,
    CreateSubscriptionResponseSerializer,
    VerifySubscriptionRequestSerializer,
)

logger = logging.getLogger(__name__)


def _get_razorpay_client():
    key_id = (settings.RAZORPAY_KEY_ID or '').strip()
    key_secret = (settings.RAZORPAY_KEY_SECRET or '').strip()
    if not key_id or not key_secret:
        raise ValueError('Razorpay credentials are missing in settings.')
    return razorpay.Client(auth=(key_id, key_secret))


def _get_plan_subscription_id(plan_name):
    if plan_name == PLAN_INDIVIDUAL:
        return (settings.RAZORPAY_PLAN_ID_INDIVIDUAL or '').strip()
    if plan_name == PLAN_TEAM:
        return (settings.RAZORPAY_PLAN_ID_TEAM or '').strip()
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

        transaction = PaymentTransaction.objects.filter(
            razorpay_subscription_id=razorpay_subscription_id,
            user=request.user,
        ).select_related('user').first()
        if not transaction:
            return Response(
                {'error': 'Invalid transaction state'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if transaction.status == PaymentTransaction.Status.ACTIVE:
            return self._success_response(transaction.user)

        if transaction.status != PaymentTransaction.Status.PENDING:
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
            transaction.status = PaymentTransaction.Status.FAILED
            transaction.razorpay_payment_id = razorpay_payment_id
            transaction.razorpay_signature = razorpay_signature
            transaction.save(
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

        user = _mark_transaction_active(
            transaction,
            payment_id=razorpay_payment_id,
            payment_signature=razorpay_signature,
            duration_days=30,
            extend_from_existing=False,
        )

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


@method_decorator(csrf_exempt, name='dispatch')
class RazorpayWebhookView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

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

        event_type = payload.get('event')
        if event_type not in ('subscription.charged', 'subscription.cancelled', 'subscription.halted'):
            return Response({'message': 'Event ignored'}, status=status.HTTP_200_OK)

        try:
            if event_type == 'subscription.charged':
                payment_entity = payload['payload']['payment']['entity']
                subscription_id = payment_entity['subscription_id']
                payment_id = payment_entity['id']
            else:
                subscription_entity = payload['payload']['subscription']['entity']
                subscription_id = subscription_entity['id']
                payment_id = None
        except (TypeError, KeyError):
            return Response({'error': 'Invalid webhook payload'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            transaction = PaymentTransaction.objects.select_related('user').get(
                razorpay_subscription_id=subscription_id
            )
        except PaymentTransaction.DoesNotExist:
            return Response({'error': 'Transaction not found'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception('Failed to query transaction for subscription %s', subscription_id)
            return Response({'error': 'Unable to process webhook'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if event_type == 'subscription.cancelled':
            if transaction.status == PaymentTransaction.Status.CANCELLED:
                return Response({'message': 'Already processed'}, status=status.HTTP_200_OK)
            transaction.status = PaymentTransaction.Status.CANCELLED
            transaction.save(update_fields=['status', 'updated_at'])
            return Response({'message': 'Webhook processed'}, status=status.HTTP_200_OK)

        if event_type == 'subscription.halted':
            if transaction.status == PaymentTransaction.Status.FAILED:
                return Response({'message': 'Already processed'}, status=status.HTTP_200_OK)
            transaction.status = PaymentTransaction.Status.FAILED
            transaction.save(update_fields=['status', 'updated_at'])
            return Response({'message': 'Webhook processed'}, status=status.HTTP_200_OK)

        if transaction.status == PaymentTransaction.Status.CANCELLED:
            return Response({'error': 'Invalid transaction state'}, status=status.HTTP_400_BAD_REQUEST)

        if transaction.razorpay_payment_id == payment_id:
            return Response({'message': 'Already processed'}, status=status.HTTP_200_OK)

        if transaction.status not in (PaymentTransaction.Status.PENDING, PaymentTransaction.Status.ACTIVE):
            return Response({'error': 'Invalid transaction state'}, status=status.HTTP_400_BAD_REQUEST)

        _mark_transaction_active(
            transaction,
            payment_id=payment_id,
            duration_days=30,
            extend_from_existing=True,
        )
        return Response({'message': 'Webhook processed'}, status=status.HTTP_200_OK)
