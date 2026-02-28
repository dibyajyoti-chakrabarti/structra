from unittest.mock import patch
from datetime import timedelta

import razorpay
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import PaymentTransaction

User = get_user_model()


@override_settings(
    RAZORPAY_KEY_ID='rzp_test_key',
    RAZORPAY_KEY_SECRET='rzp_test_secret',
    RAZORPAY_WEBHOOK_SECRET='webhook_secret',
)
class CreateOrderViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='password123',
            full_name='Test User',
        )
        self.create_url = reverse('payments-order-create')
        self.verify_url = reverse('payments-order-verify')
        self.webhook_url = reverse('payments-webhook')

    def test_requires_authentication(self):
        response = self.client.post(self.create_url, {'plan_name': 'INDIVIDUAL'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        response = self.client.post(
            self.verify_url,
            {
                'razorpay_order_id': 'order_x',
                'razorpay_payment_id': 'pay_x',
                'razorpay_signature': 'sig_x',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch('payments.views.razorpay.Client')
    def test_creates_order_for_valid_plan(self, mock_client_cls):
        mock_client_cls.return_value.order.create.return_value = {'id': 'order_abc123'}
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.create_url, {'plan_name': 'INDIVIDUAL'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['razorpay_order_id'], 'order_abc123')
        self.assertEqual(response.data['amount'], '299.00')
        self.assertEqual(response.data['currency'], 'INR')

        tx = PaymentTransaction.objects.get()
        self.assertEqual(tx.user, self.user)
        self.assertEqual(tx.plan_name, 'INDIVIDUAL')
        self.assertEqual(str(tx.amount), '299.00')
        self.assertEqual(tx.status, PaymentTransaction.Status.PENDING)
        self.assertEqual(tx.razorpay_order_id, 'order_abc123')

    @patch('payments.views.razorpay.Client')
    def test_rejects_invalid_plan(self, mock_client_cls):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.create_url, {'plan_name': 'UNKNOWN'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'Invalid plan selected')
        mock_client_cls.assert_not_called()
        self.assertEqual(PaymentTransaction.objects.count(), 0)

    @patch('payments.views.razorpay.Client')
    def test_lowercase_plan_is_normalized(self, mock_client_cls):
        mock_client_cls.return_value.order.create.return_value = {'id': 'order_lowercase'}
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.create_url, {'plan_name': 'individual'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        tx = PaymentTransaction.objects.get()
        self.assertEqual(tx.plan_name, 'INDIVIDUAL')

    @patch('payments.views.razorpay.Client')
    def test_razorpay_failure_returns_502(self, mock_client_cls):
        mock_client_cls.return_value.order.create.side_effect = Exception('Razorpay error')
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.create_url, {'plan_name': 'INDIVIDUAL'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(response.data['error'], 'Unable to create payment order')
        self.assertEqual(PaymentTransaction.objects.count(), 0)

    @patch('payments.views.razorpay.Client')
    def test_missing_order_id_returns_502(self, mock_client_cls):
        mock_client_cls.return_value.order.create.return_value = {'status': 'created'}
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.create_url, {'plan_name': 'INDIVIDUAL'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(response.data['error'], 'Unable to create payment order')
        self.assertEqual(PaymentTransaction.objects.count(), 0)

    @override_settings(RAZORPAY_KEY_ID='', RAZORPAY_KEY_SECRET='')
    def test_missing_credentials_returns_500(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.create_url, {'plan_name': 'INDIVIDUAL'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data['error'], 'Payment service unavailable')
        self.assertEqual(PaymentTransaction.objects.count(), 0)

    @patch('payments.views.razorpay.Client')
    def test_verify_payment_success(self, mock_client_cls):
        tx = PaymentTransaction.objects.create(
            user=self.user,
            plan_name='INDIVIDUAL',
            amount='299.00',
            status=PaymentTransaction.Status.PENDING,
            razorpay_order_id='order_success_1',
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.verify_url,
            {
                'razorpay_order_id': 'order_success_1',
                'razorpay_payment_id': 'pay_success_1',
                'razorpay_signature': 'sig_success_1',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Payment verified')
        self.assertEqual(response.data['current_plan'], 'INDIVIDUAL')
        self.assertIsNotNone(response.data['expires_at'])
        tx.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(tx.status, PaymentTransaction.Status.SUCCESS)
        self.assertEqual(tx.razorpay_payment_id, 'pay_success_1')
        self.assertEqual(tx.razorpay_signature, 'sig_success_1')
        self.assertEqual(self.user.current_plan, 'INDIVIDUAL')
        self.assertIsNotNone(self.user.plan_expires_at)
        delta = self.user.plan_expires_at - timezone.now()
        self.assertGreater(delta.total_seconds(), 29 * 24 * 60 * 60)
        self.assertLess(delta.total_seconds(), 31 * 24 * 60 * 60)
        mock_client_cls.return_value.utility.verify_payment_signature.assert_called_once()

    @patch('payments.views.razorpay.Client')
    def test_verify_signature_failure_marks_transaction_failed(self, mock_client_cls):
        tx = PaymentTransaction.objects.create(
            user=self.user,
            plan_name='INDIVIDUAL',
            amount='299.00',
            status=PaymentTransaction.Status.PENDING,
            razorpay_order_id='order_fail_1',
        )
        mock_client_cls.return_value.utility.verify_payment_signature.side_effect = (
            razorpay.errors.SignatureVerificationError('bad signature')
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.verify_url,
            {
                'razorpay_order_id': 'order_fail_1',
                'razorpay_payment_id': 'pay_fail_1',
                'razorpay_signature': 'sig_fail_1',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'Invalid payment signature')
        tx.refresh_from_db()
        self.assertEqual(tx.status, PaymentTransaction.Status.FAILED)
        self.assertEqual(tx.razorpay_payment_id, 'pay_fail_1')
        self.assertEqual(tx.razorpay_signature, 'sig_fail_1')

    @patch('payments.views.razorpay.Client')
    def test_verify_is_idempotent_for_success_transaction(self, mock_client_cls):
        original_expiry = timezone.now() + timedelta(days=15)
        self.user.current_plan = 'INDIVIDUAL'
        self.user.plan_expires_at = original_expiry
        self.user.save(update_fields=['current_plan', 'plan_expires_at'])
        PaymentTransaction.objects.create(
            user=self.user,
            plan_name='INDIVIDUAL',
            amount='299.00',
            status=PaymentTransaction.Status.SUCCESS,
            razorpay_order_id='order_already_done',
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.verify_url,
            {
                'razorpay_order_id': 'order_already_done',
                'razorpay_payment_id': 'pay_already_done',
                'razorpay_signature': 'sig_already_done',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Payment verified')
        self.assertEqual(response.data['current_plan'], 'INDIVIDUAL')
        self.user.refresh_from_db()
        self.assertEqual(self.user.plan_expires_at, original_expiry)
        mock_client_cls.assert_not_called()

    @patch('payments.views.razorpay.Client')
    def test_verify_rejects_failed_transaction(self, mock_client_cls):
        PaymentTransaction.objects.create(
            user=self.user,
            plan_name='INDIVIDUAL',
            amount='299.00',
            status=PaymentTransaction.Status.FAILED,
            razorpay_order_id='order_failed_state',
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.verify_url,
            {
                'razorpay_order_id': 'order_failed_state',
                'razorpay_payment_id': 'pay_failed_state',
                'razorpay_signature': 'sig_failed_state',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'Invalid transaction state')
        mock_client_cls.assert_not_called()

    @patch('payments.views.razorpay.Client')
    def test_verify_rejects_transaction_of_another_user(self, mock_client_cls):
        other_user = User.objects.create_user(
            email='other@example.com',
            username='otheruser',
            password='password123',
            full_name='Other User',
        )
        PaymentTransaction.objects.create(
            user=other_user,
            plan_name='INDIVIDUAL',
            amount='299.00',
            status=PaymentTransaction.Status.PENDING,
            razorpay_order_id='order_other_user',
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.verify_url,
            {
                'razorpay_order_id': 'order_other_user',
                'razorpay_payment_id': 'pay_other_user',
                'razorpay_signature': 'sig_other_user',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'Invalid transaction state')
        mock_client_cls.assert_not_called()

    @patch('payments.views.razorpay.Client')
    def test_webhook_ignores_non_order_paid_event(self, mock_client_cls):
        response = self.client.post(
            self.webhook_url,
            {
                'event': 'payment.authorized',
                'payload': {'payment': {'entity': {'order_id': 'order_x', 'id': 'pay_x'}}},
            },
            format='json',
            HTTP_X_RAZORPAY_SIGNATURE='valid_signature',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Event ignored')
        mock_client_cls.return_value.utility.verify_webhook_signature.assert_called_once()

    @patch('payments.views.razorpay.Client')
    def test_webhook_invalid_signature_returns_400(self, mock_client_cls):
        mock_client_cls.return_value.utility.verify_webhook_signature.side_effect = (
            razorpay.errors.SignatureVerificationError('bad webhook signature')
        )

        response = self.client.post(
            self.webhook_url,
            {
                'event': 'order.paid',
                'payload': {'payment': {'entity': {'order_id': 'order_x', 'id': 'pay_x'}}},
            },
            format='json',
            HTTP_X_RAZORPAY_SIGNATURE='invalid_signature',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'Invalid webhook signature')

    @patch('payments.views.razorpay.Client')
    def test_webhook_provisions_pending_transaction(self, mock_client_cls):
        tx = PaymentTransaction.objects.create(
            user=self.user,
            plan_name='INDIVIDUAL',
            amount='299.00',
            status=PaymentTransaction.Status.PENDING,
            razorpay_order_id='order_webhook_success',
        )

        response = self.client.post(
            self.webhook_url,
            {
                'event': 'order.paid',
                'payload': {
                    'payment': {
                        'entity': {
                            'order_id': 'order_webhook_success',
                            'id': 'pay_webhook_success',
                        }
                    }
                },
            },
            format='json',
            HTTP_X_RAZORPAY_SIGNATURE='valid_signature',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Webhook processed')
        tx.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(tx.status, PaymentTransaction.Status.SUCCESS)
        self.assertEqual(tx.razorpay_payment_id, 'pay_webhook_success')
        self.assertEqual(self.user.current_plan, 'INDIVIDUAL')
        self.assertIsNotNone(self.user.plan_expires_at)

    @patch('payments.views.razorpay.Client')
    def test_webhook_is_idempotent_for_success_transaction(self, mock_client_cls):
        original_expiry = timezone.now() + timedelta(days=10)
        self.user.current_plan = 'INDIVIDUAL'
        self.user.plan_expires_at = original_expiry
        self.user.save(update_fields=['current_plan', 'plan_expires_at'])
        PaymentTransaction.objects.create(
            user=self.user,
            plan_name='INDIVIDUAL',
            amount='299.00',
            status=PaymentTransaction.Status.SUCCESS,
            razorpay_order_id='order_webhook_done',
        )

        response = self.client.post(
            self.webhook_url,
            {
                'event': 'order.paid',
                'payload': {
                    'payment': {'entity': {'order_id': 'order_webhook_done', 'id': 'pay_webhook_done'}}
                },
            },
            format='json',
            HTTP_X_RAZORPAY_SIGNATURE='valid_signature',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Already processed')
        self.user.refresh_from_db()
        self.assertEqual(self.user.plan_expires_at, original_expiry)

    @patch('payments.views.razorpay.Client')
    def test_webhook_returns_400_when_transaction_not_found(self, mock_client_cls):
        response = self.client.post(
            self.webhook_url,
            {
                'event': 'order.paid',
                'payload': {'payment': {'entity': {'order_id': 'missing_order', 'id': 'pay_missing'}}},
            },
            format='json',
            HTTP_X_RAZORPAY_SIGNATURE='valid_signature',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'Transaction not found')
