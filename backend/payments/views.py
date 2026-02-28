import logging
import json
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

from .constants import PLAN_PRICES
from .models import PaymentTransaction
from .serializers import (
    CreateOrderRequestSerializer,
    CreateOrderResponseSerializer,
    VerifyOrderRequestSerializer,
)

logger = logging.getLogger(__name__)


def _get_razorpay_client():
    key_id = (settings.RAZORPAY_KEY_ID or '').strip()
    key_secret = (settings.RAZORPAY_KEY_SECRET or '').strip()
    if not key_id or not key_secret:
        raise ValueError('Razorpay credentials are missing in settings.')
    return razorpay.Client(auth=(key_id, key_secret))


def _provision_user_plan(user, plan_name):
    user.current_plan = plan_name
    user.plan_expires_at = timezone.now() + timedelta(days=30)
    user.save(update_fields=['current_plan', 'plan_expires_at'])
    return user


def _mark_transaction_success(transaction, payment_id=None, payment_signature=None):
    transaction.status = PaymentTransaction.Status.SUCCESS
    update_fields = ['status', 'updated_at']

    if payment_id is not None:
        transaction.razorpay_payment_id = payment_id
        update_fields.append('razorpay_payment_id')
    if payment_signature is not None:
        transaction.razorpay_signature = payment_signature
        update_fields.append('razorpay_signature')

    transaction.save(update_fields=update_fields)
    return _provision_user_plan(transaction.user, transaction.plan_name)


class CreateOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        request_serializer = CreateOrderRequestSerializer(data=request.data)
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

        try:
            client = _get_razorpay_client()
        except ValueError:
            logger.error('Razorpay credentials are missing in settings.')
            return Response(
                {'error': 'Payment service unavailable'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        plan_name = request_serializer.validated_data['plan_name']
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
            order_payload = client.order.create(
                {
                    'amount': amount_paise,
                    'currency': 'INR',
                }
            )
        except Exception:
            logger.exception('Razorpay order creation failed for user %s and plan %s', request.user.user_id, plan_name)
            return Response(
                {'error': 'Unable to create payment order'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        razorpay_order_id = (order_payload or {}).get('id')
        if not razorpay_order_id:
            logger.error('Razorpay order response missing id for user %s and plan %s', request.user.user_id, plan_name)
            return Response(
                {'error': 'Unable to create payment order'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        PaymentTransaction.objects.create(
            user=request.user,
            plan_name=plan_name,
            amount=amount_inr,
            status=PaymentTransaction.Status.PENDING,
            razorpay_order_id=razorpay_order_id,
        )

        response_serializer = CreateOrderResponseSerializer(
            data={
                'razorpay_order_id': razorpay_order_id,
                'amount': amount_inr,
                'currency': 'INR',
            }
        )
        response_serializer.is_valid(raise_exception=True)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class VerifyOrderView(APIView):
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
        request_serializer = VerifyOrderRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response(
                {'error': 'Invalid request payload'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        razorpay_order_id = request_serializer.validated_data['razorpay_order_id']
        razorpay_payment_id = request_serializer.validated_data['razorpay_payment_id']
        razorpay_signature = request_serializer.validated_data['razorpay_signature']

        transaction = PaymentTransaction.objects.filter(
            razorpay_order_id=razorpay_order_id,
            user=request.user,
        ).select_related('user').first()
        if not transaction:
            return Response(
                {'error': 'Invalid transaction state'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if transaction.status == PaymentTransaction.Status.SUCCESS:
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
            client.utility.verify_payment_signature(
                {
                    'razorpay_order_id': razorpay_order_id,
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
                'Razorpay verification failed for user %s and order %s',
                request.user.user_id,
                razorpay_order_id,
            )
            return Response(
                {'error': 'Unable to verify payment'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        user = _mark_transaction_success(
            transaction,
            payment_id=razorpay_payment_id,
            payment_signature=razorpay_signature,
        )

        return self._success_response(user)


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
        if event_type != 'order.paid':
            return Response({'message': 'Event ignored'}, status=status.HTTP_200_OK)

        try:
            payment_entity = payload['payload']['payment']['entity']
            order_id = payment_entity['order_id']
            payment_id = payment_entity['id']
        except (TypeError, KeyError):
            return Response({'error': 'Invalid webhook payload'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            transaction = PaymentTransaction.objects.select_related('user').get(
                razorpay_order_id=order_id
            )
        except PaymentTransaction.DoesNotExist:
            return Response({'error': 'Transaction not found'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception('Failed to query transaction for order %s', order_id)
            return Response({'error': 'Unable to process webhook'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if transaction.status == PaymentTransaction.Status.SUCCESS:
            return Response({'message': 'Already processed'}, status=status.HTTP_200_OK)

        if transaction.status != PaymentTransaction.Status.PENDING:
            return Response({'error': 'Invalid transaction state'}, status=status.HTTP_400_BAD_REQUEST)

        _mark_transaction_success(transaction, payment_id=payment_id)
        return Response({'message': 'Webhook processed'}, status=status.HTTP_200_OK)
