from datetime import datetime, timedelta, timezone as dt_timezone
from unittest.mock import patch

import razorpay
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from audit.models import AuditLog, AuditStatus
from core.constants import WorkspaceRole
from permissions.models import WorkspaceMember
from workspaces.models import Workspace
from .models import PaymentTransaction, WebhookEventLog

User = get_user_model()


@override_settings(
    RAZORPAY_KEY_ID='rzp_test_key',
    RAZORPAY_KEY_SECRET='rzp_test_secret',
    RAZORPAY_WEBHOOK_SECRET='webhook_secret',
    RAZORPAY_PLAN_ID_INDIVIDUAL='plan_individual_test',
    RAZORPAY_PLAN_ID_TEAM='plan_team_test',
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
        self.checkout_url = reverse('payments-checkout')
        self.verify_url = reverse('payments-order-verify')
        self.cancel_url = reverse('payments-subscription-cancel')
        self.webhook_url = reverse('payments-webhook')

    def _post_webhook(self, payload, signature='valid_signature'):
        return self.client.post(
            self.webhook_url,
            payload,
            format='json',
            HTTP_X_RAZORPAY_SIGNATURE=signature,
        )

    def test_requires_authentication(self):
        response = self.client.post(self.create_url, {'plan_name': 'INDIVIDUAL'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        response = self.client.post(
            self.verify_url,
            {
                'razorpay_subscription_id': 'sub_x',
                'razorpay_payment_id': 'pay_x',
                'razorpay_signature': 'sig_x',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        response = self.client.post(
            self.cancel_url,
            {
                'razorpay_subscription_id': 'sub_x',
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch('payments.views.razorpay.Client')
    def test_creates_subscription_for_valid_plan(self, mock_client_cls):
        mock_client_cls.return_value.subscription.create.return_value = {'id': 'sub_abc123'}
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.create_url, {'plan_name': 'INDIVIDUAL'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['razorpay_subscription_id'], 'sub_abc123')
        self.assertEqual(response.data['amount'], '599.00')
        self.assertEqual(response.data['currency'], 'INR')

        mock_client_cls.return_value.subscription.create.assert_called_once_with(
            {
                'plan_id': 'plan_individual_test',
                'total_count': 12,
                'customer_notify': 1,
            }
        )

        tx = PaymentTransaction.objects.get()
        self.assertEqual(tx.user, self.user)
        self.assertEqual(tx.plan_name, 'INDIVIDUAL')
        self.assertEqual(str(tx.amount), '599.00')
        self.assertEqual(tx.status, PaymentTransaction.Status.PENDING)
        self.assertEqual(tx.razorpay_subscription_id, 'sub_abc123')

    @patch('payments.views.razorpay.Client')
    def test_checkout_creates_subscription_for_core_to_individual(self, mock_client_cls):
        mock_client_cls.return_value.subscription.create.return_value = {'id': 'sub_checkout_individual'}
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.checkout_url, {'plan_name': 'INDIVIDUAL'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['razorpay_subscription_id'], 'sub_checkout_individual')
        self.assertEqual(response.data['amount'], '599.00')
        mock_client_cls.return_value.subscription.create.assert_called_once_with(
            {
                'plan_id': 'plan_individual_test',
                'total_count': 120,
                'customer_notify': 1,
            }
        )

    @patch('payments.views.razorpay.Client')
    def test_checkout_creates_team_subscription_with_admin_seat_quantity_one(self, mock_client_cls):
        mock_client_cls.return_value.subscription.create.return_value = {'id': 'sub_checkout_team'}
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.checkout_url, {'plan_name': 'TEAM'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['razorpay_subscription_id'], 'sub_checkout_team')
        self.assertEqual(response.data['amount'], '349.00')
        mock_client_cls.return_value.subscription.create.assert_called_once_with(
            {
                'plan_id': 'plan_team_test',
                'total_count': 120,
                'customer_notify': 1,
                'quantity': 1,
            }
        )

    @patch('payments.views.razorpay.Client')
    def test_checkout_allows_individual_to_team_upgrade(self, mock_client_cls):
        mock_client_cls.return_value.subscription.create.return_value = {'id': 'sub_checkout_upgrade'}
        self.user.current_plan = 'INDIVIDUAL'
        self.user.save(update_fields=['current_plan'])
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.checkout_url, {'plan_name': 'TEAM'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['razorpay_subscription_id'], 'sub_checkout_upgrade')

    @patch('payments.views.razorpay.Client')
    def test_checkout_blocks_same_plan(self, mock_client_cls):
        self.user.current_plan = 'INDIVIDUAL'
        self.user.save(update_fields=['current_plan'])
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.checkout_url, {'plan_name': 'INDIVIDUAL'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'You are already on this plan.')
        mock_client_cls.assert_not_called()

    @patch('payments.views.razorpay.Client')
    def test_checkout_blocks_downgrade_via_checkout(self, mock_client_cls):
        self.user.current_plan = 'TEAM'
        self.user.save(update_fields=['current_plan'])
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.checkout_url, {'plan_name': 'INDIVIDUAL'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['error'],
            'Downgrades are not allowed via checkout. Use plan downgrade flow.',
        )
        mock_client_cls.assert_not_called()

    @patch('payments.views.razorpay.Client')
    def test_creates_subscription_for_team_plan(self, mock_client_cls):
        mock_client_cls.return_value.subscription.create.return_value = {'id': 'sub_team_abc123'}
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.create_url, {'plan_name': 'TEAM'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['razorpay_subscription_id'], 'sub_team_abc123')
        self.assertEqual(response.data['amount'], '349.00')
        self.assertEqual(response.data['currency'], 'INR')

        mock_client_cls.return_value.subscription.create.assert_called_once_with(
            {
                'plan_id': 'plan_team_test',
                'total_count': 12,
                'customer_notify': 1,
            }
        )

        tx = PaymentTransaction.objects.get()
        self.assertEqual(tx.plan_name, 'TEAM')
        self.assertEqual(str(tx.amount), '349.00')

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
        mock_client_cls.return_value.subscription.create.return_value = {'id': 'sub_lowercase'}
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.create_url, {'plan_name': 'individual'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        tx = PaymentTransaction.objects.get()
        self.assertEqual(tx.plan_name, 'INDIVIDUAL')

    @patch('payments.views.razorpay.Client')
    def test_create_subscription_rejects_user_with_active_plan(self, mock_client_cls):
        self.user.current_plan = 'INDIVIDUAL'
        self.user.plan_expires_at = timezone.now() + timedelta(days=20)
        self.user.save(update_fields=['current_plan', 'plan_expires_at'])
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.create_url, {'plan_name': 'INDIVIDUAL'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'You already have an active plan.')
        self.assertEqual(PaymentTransaction.objects.count(), 0)
        mock_client_cls.assert_not_called()

    @patch('payments.views.razorpay.Client')
    def test_razorpay_failure_returns_502(self, mock_client_cls):
        mock_client_cls.return_value.subscription.create.side_effect = Exception('Razorpay error')
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.create_url, {'plan_name': 'INDIVIDUAL'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(response.data['error'], 'Unable to create subscription')
        self.assertEqual(PaymentTransaction.objects.count(), 0)

    @patch('payments.views.razorpay.Client')
    def test_missing_subscription_id_returns_502(self, mock_client_cls):
        mock_client_cls.return_value.subscription.create.return_value = {'status': 'created'}
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.create_url, {'plan_name': 'INDIVIDUAL'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(response.data['error'], 'Unable to create subscription')
        self.assertEqual(PaymentTransaction.objects.count(), 0)

    @override_settings(RAZORPAY_KEY_ID='', RAZORPAY_KEY_SECRET='')
    def test_missing_credentials_returns_500(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.create_url, {'plan_name': 'INDIVIDUAL'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data['error'], 'Payment service unavailable')
        self.assertEqual(PaymentTransaction.objects.count(), 0)

    @override_settings(RAZORPAY_KEY_ID='', RAZORPAY_KEY_SECRET='')
    def test_checkout_missing_credentials_returns_500(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.checkout_url, {'plan_name': 'INDIVIDUAL'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data['error'], 'Payment service unavailable')
        self.assertEqual(PaymentTransaction.objects.count(), 0)

    @override_settings(RAZORPAY_PLAN_ID_INDIVIDUAL='')
    @patch('payments.views.razorpay.Client')
    def test_missing_plan_id_returns_500(self, mock_client_cls):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.create_url, {'plan_name': 'INDIVIDUAL'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data['error'], 'Payment service unavailable')
        self.assertEqual(PaymentTransaction.objects.count(), 0)
        mock_client_cls.assert_called_once()

    @override_settings(
        RAZORPAY_PLAN_ID_INDIVIDUAL='',
        RAZORPAY_INDIVIDUAL_PLAN_ID='',
    )
    @patch('payments.views.razorpay.Client')
    def test_checkout_missing_plan_id_returns_500(self, mock_client_cls):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.checkout_url, {'plan_name': 'INDIVIDUAL'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data['error'], 'Payment service unavailable')
        self.assertEqual(PaymentTransaction.objects.count(), 0)
        mock_client_cls.assert_called_once()

    @patch('payments.views.razorpay.Client')
    def test_verify_payment_success(self, mock_client_cls):
        tx = PaymentTransaction.objects.create(
            user=self.user,
            plan_name='INDIVIDUAL',
            amount='599.00',
            status=PaymentTransaction.Status.PENDING,
            razorpay_subscription_id='sub_success_1',
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.verify_url,
            {
                'razorpay_subscription_id': 'sub_success_1',
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
        self.assertEqual(tx.status, PaymentTransaction.Status.ACTIVE)
        self.assertEqual(tx.razorpay_payment_id, 'pay_success_1')
        self.assertEqual(tx.razorpay_signature, 'sig_success_1')
        self.assertEqual(self.user.current_plan, 'INDIVIDUAL')
        self.assertIsNotNone(self.user.plan_expires_at)
        delta = self.user.plan_expires_at - timezone.now()
        self.assertGreater(delta.total_seconds(), 29 * 24 * 60 * 60)
        self.assertLess(delta.total_seconds(), 31 * 24 * 60 * 60)
        mock_client_cls.return_value.utility.verify_subscription_payment_signature.assert_called_once()

    @patch('payments.views.razorpay.Client')
    def test_verify_signature_failure_marks_transaction_failed(self, mock_client_cls):
        tx = PaymentTransaction.objects.create(
            user=self.user,
            plan_name='INDIVIDUAL',
            amount='599.00',
            status=PaymentTransaction.Status.PENDING,
            razorpay_subscription_id='sub_fail_1',
        )
        mock_client_cls.return_value.utility.verify_subscription_payment_signature.side_effect = (
            razorpay.errors.SignatureVerificationError('bad signature')
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.verify_url,
            {
                'razorpay_subscription_id': 'sub_fail_1',
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
    def test_verify_is_idempotent_for_active_transaction(self, mock_client_cls):
        original_expiry = timezone.now() + timedelta(days=15)
        self.user.current_plan = 'INDIVIDUAL'
        self.user.plan_expires_at = original_expiry
        self.user.save(update_fields=['current_plan', 'plan_expires_at'])
        PaymentTransaction.objects.create(
            user=self.user,
            plan_name='INDIVIDUAL',
            amount='599.00',
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id='sub_already_done',
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.verify_url,
            {
                'razorpay_subscription_id': 'sub_already_done',
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
            amount='599.00',
            status=PaymentTransaction.Status.FAILED,
            razorpay_subscription_id='sub_failed_state',
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.verify_url,
            {
                'razorpay_subscription_id': 'sub_failed_state',
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
            amount='599.00',
            status=PaymentTransaction.Status.PENDING,
            razorpay_subscription_id='sub_other_user',
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.verify_url,
            {
                'razorpay_subscription_id': 'sub_other_user',
                'razorpay_payment_id': 'pay_other_user',
                'razorpay_signature': 'sig_other_user',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'Invalid transaction state')
        mock_client_cls.assert_not_called()

    @patch('payments.views.razorpay.Client')
    def test_cancel_active_subscription_success(self, mock_client_cls):
        original_expiry = timezone.now() + timedelta(days=20)
        self.user.current_plan = 'INDIVIDUAL'
        self.user.plan_expires_at = original_expiry
        self.user.save(update_fields=['current_plan', 'plan_expires_at'])
        tx = PaymentTransaction.objects.create(
            user=self.user,
            plan_name='INDIVIDUAL',
            amount='599.00',
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id='sub_cancel_1',
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.cancel_url,
            {'razorpay_subscription_id': 'sub_cancel_1'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Subscription cancelled')
        self.assertEqual(response.data['current_plan'], 'INDIVIDUAL')
        self.assertIsNotNone(response.data['expires_at'])
        tx.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(tx.status, PaymentTransaction.Status.CANCELLED)
        self.assertEqual(self.user.current_plan, 'INDIVIDUAL')
        self.assertEqual(self.user.plan_expires_at, original_expiry)
        mock_client_cls.return_value.subscription.cancel.assert_called_once_with(
            'sub_cancel_1',
            {'cancel_at_cycle_end': 1},
        )

    @patch('payments.views.razorpay.Client')
    def test_cancel_is_idempotent_for_cancelled_subscription(self, mock_client_cls):
        original_expiry = timezone.now() + timedelta(days=8)
        self.user.current_plan = 'INDIVIDUAL'
        self.user.plan_expires_at = original_expiry
        self.user.save(update_fields=['current_plan', 'plan_expires_at'])
        PaymentTransaction.objects.create(
            user=self.user,
            plan_name='INDIVIDUAL',
            amount='599.00',
            status=PaymentTransaction.Status.CANCELLED,
            razorpay_subscription_id='sub_cancel_done',
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.cancel_url,
            {'razorpay_subscription_id': 'sub_cancel_done'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Subscription cancelled')
        self.user.refresh_from_db()
        self.assertEqual(self.user.current_plan, 'INDIVIDUAL')
        self.assertEqual(self.user.plan_expires_at, original_expiry)
        mock_client_cls.assert_not_called()

    @patch('payments.views.razorpay.Client')
    def test_cancel_rejects_non_active_transaction(self, mock_client_cls):
        PaymentTransaction.objects.create(
            user=self.user,
            plan_name='INDIVIDUAL',
            amount='599.00',
            status=PaymentTransaction.Status.PENDING,
            razorpay_subscription_id='sub_cancel_pending',
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.cancel_url,
            {'razorpay_subscription_id': 'sub_cancel_pending'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'Invalid transaction state')
        mock_client_cls.assert_not_called()

    @patch('payments.views.razorpay.Client')
    def test_cancel_rejects_other_users_transaction(self, mock_client_cls):
        other_user = User.objects.create_user(
            email='cancel-other@example.com',
            username='cancelother',
            password='password123',
            full_name='Other User',
        )
        PaymentTransaction.objects.create(
            user=other_user,
            plan_name='INDIVIDUAL',
            amount='599.00',
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id='sub_cancel_other_user',
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.cancel_url,
            {'razorpay_subscription_id': 'sub_cancel_other_user'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'Invalid transaction state')
        mock_client_cls.assert_not_called()

    @override_settings(RAZORPAY_KEY_ID='', RAZORPAY_KEY_SECRET='')
    def test_cancel_with_missing_credentials_returns_500(self):
        PaymentTransaction.objects.create(
            user=self.user,
            plan_name='INDIVIDUAL',
            amount='599.00',
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id='sub_cancel_missing_creds',
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.cancel_url,
            {'razorpay_subscription_id': 'sub_cancel_missing_creds'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data['error'], 'Payment service unavailable')

    @patch('payments.views.razorpay.Client')
    def test_cancel_razorpay_failure_returns_502(self, mock_client_cls):
        PaymentTransaction.objects.create(
            user=self.user,
            plan_name='INDIVIDUAL',
            amount='599.00',
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id='sub_cancel_error',
        )
        mock_client_cls.return_value.subscription.cancel.side_effect = Exception('Razorpay cancel error')
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.cancel_url,
            {'razorpay_subscription_id': 'sub_cancel_error'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(response.data['error'], 'Unable to cancel subscription')

    @patch('payments.views.razorpay.Client')
    def test_webhook_ignores_non_subscription_charged_event(self, mock_client_cls):
        response = self._post_webhook(
            {
                'id': 'ev_ignore_1',
                'event': 'payment.authorized',
                'payload': {'payment': {'entity': {'subscription_id': 'sub_x', 'id': 'pay_x'}}},
            }
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Event ignored')
        self.assertTrue(
            WebhookEventLog.objects.filter(
                razorpay_event_id='ev_ignore_1',
                status=WebhookEventLog.Status.SUCCEEDED,
            ).exists()
        )
        mock_client_cls.return_value.utility.verify_webhook_signature.assert_called_once()

    @patch('payments.views.razorpay.Client')
    def test_webhook_invalid_signature_returns_400(self, mock_client_cls):
        mock_client_cls.return_value.utility.verify_webhook_signature.side_effect = (
            razorpay.errors.SignatureVerificationError('bad webhook signature')
        )

        response = self._post_webhook(
            {
                'id': 'ev_invalid_sig',
                'event': 'subscription.charged',
                'payload': {'payment': {'entity': {'subscription_id': 'sub_x', 'id': 'pay_x'}}},
            },
            signature='invalid_signature',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'Invalid webhook signature')
        self.assertFalse(WebhookEventLog.objects.filter(razorpay_event_id='ev_invalid_sig').exists())

    @patch('payments.views.razorpay.Client')
    def test_webhook_missing_event_id_uses_derived_idempotency_key(self, mock_client_cls):
        tx = PaymentTransaction.objects.create(
            user=self.user,
            plan_name='INDIVIDUAL',
            amount='599.00',
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id='sub_no_event_id',
        )
        response = self._post_webhook(
            {
                'event': 'subscription.cancelled',
                'payload': {'subscription': {'entity': {'id': 'sub_no_event_id'}}},
            }
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Webhook processed')
        tx.refresh_from_db()
        self.assertEqual(tx.status, PaymentTransaction.Status.CANCELLED)
        self.assertEqual(WebhookEventLog.objects.count(), 1)

    @patch('payments.views.razorpay.Client')
    def test_webhook_marks_transaction_cancelled_for_subscription_cancelled(self, mock_client_cls):
        tx = PaymentTransaction.objects.create(
            user=self.user,
            plan_name='INDIVIDUAL',
            amount='599.00',
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id='sub_webhook_cancelled',
        )

        response = self._post_webhook(
            {
                'id': 'ev_cancelled_1',
                'event': 'subscription.cancelled',
                'payload': {
                    'subscription': {
                        'entity': {
                            'id': 'sub_webhook_cancelled',
                        }
                    }
                },
            }
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Webhook processed')
        tx.refresh_from_db()
        self.assertEqual(tx.status, PaymentTransaction.Status.CANCELLED)
        self.assertTrue(
            WebhookEventLog.objects.filter(
                razorpay_event_id='ev_cancelled_1',
                status=WebhookEventLog.Status.SUCCEEDED,
            ).exists()
        )

    @patch('payments.views.razorpay.Client')
    def test_webhook_marks_transaction_failed_for_subscription_halted(self, mock_client_cls):
        tx = PaymentTransaction.objects.create(
            user=self.user,
            plan_name='INDIVIDUAL',
            amount='599.00',
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id='sub_webhook_halted',
        )

        response = self._post_webhook(
            {
                'id': 'ev_halted_1',
                'event': 'subscription.halted',
                'payload': {
                    'subscription': {
                        'entity': {
                            'id': 'sub_webhook_halted',
                        }
                    }
                },
            }
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Webhook processed')
        tx.refresh_from_db()
        self.assertEqual(tx.status, PaymentTransaction.Status.FAILED)

    @patch('payments.views.razorpay.Client')
    def test_webhook_activates_pending_transaction_and_resets_workspace_credits(self, mock_client_cls):
        workspace = Workspace.objects.create(name='Webhook WS', owner=self.user)
        workspace.ai_credits_monthly = 50
        workspace.ai_credits_remaining = 3
        workspace.ai_credits_purchased_pack_remaining = 17
        workspace.ai_credits_overage_used_monthly = 5
        workspace.save(
            update_fields=[
                'ai_credits_monthly',
                'ai_credits_remaining',
                'ai_credits_purchased_pack_remaining',
                'ai_credits_overage_used_monthly',
            ]
        )

        tx = PaymentTransaction.objects.create(
            user=self.user,
            plan_name='INDIVIDUAL',
            amount='599.00',
            status=PaymentTransaction.Status.PENDING,
            razorpay_subscription_id='sub_webhook_success',
        )
        current_end = int((timezone.now() + timedelta(days=27)).timestamp())

        response = self._post_webhook(
            {
                'id': 'ev_charge_1',
                'event': 'subscription.charged',
                'payload': {
                    'payment': {
                        'entity': {
                            'subscription_id': 'sub_webhook_success',
                            'id': 'pay_webhook_success',
                        }
                    },
                    'subscription': {
                        'entity': {
                            'id': 'sub_webhook_success',
                            'current_end': current_end,
                        }
                    },
                },
            }
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Webhook processed')
        tx.refresh_from_db()
        self.user.refresh_from_db()
        workspace.refresh_from_db()
        self.assertEqual(tx.status, PaymentTransaction.Status.ACTIVE)
        self.assertEqual(tx.razorpay_payment_id, 'pay_webhook_success')
        self.assertEqual(self.user.current_plan, 'INDIVIDUAL')
        self.assertEqual(
            self.user.plan_expires_at,
            datetime.fromtimestamp(current_end, tz=dt_timezone.utc),
        )
        self.assertEqual(workspace.ai_credits_remaining, workspace.ai_credits_monthly)
        self.assertEqual(workspace.ai_credits_overage_used_monthly, 0)
        self.assertEqual(workspace.ai_credits_purchased_pack_remaining, 17)

    @patch('payments.views.razorpay.Client')
    def test_webhook_sets_plan_expiry_from_current_end(self, mock_client_cls):
        self.user.current_plan = 'INDIVIDUAL'
        self.user.plan_expires_at = timezone.now() + timedelta(days=10)
        self.user.save(update_fields=['current_plan', 'plan_expires_at'])

        tx = PaymentTransaction.objects.create(
            user=self.user,
            plan_name='INDIVIDUAL',
            amount='599.00',
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id='sub_webhook_active',
            razorpay_payment_id='pay_previous_cycle',
        )
        current_end = int((timezone.now() + timedelta(days=45)).timestamp())

        response = self._post_webhook(
            {
                'id': 'ev_charge_2',
                'event': 'subscription.charged',
                'payload': {
                    'payment': {
                        'entity': {
                            'subscription_id': 'sub_webhook_active',
                            'id': 'pay_new_cycle',
                        }
                    },
                    'subscription': {
                        'entity': {
                            'id': 'sub_webhook_active',
                            'current_end': current_end,
                        }
                    },
                },
            }
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Webhook processed')
        tx.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(tx.status, PaymentTransaction.Status.ACTIVE)
        self.assertEqual(tx.razorpay_payment_id, 'pay_new_cycle')
        self.assertEqual(
            self.user.plan_expires_at,
            datetime.fromtimestamp(current_end, tz=dt_timezone.utc),
        )

    @patch('payments.views.razorpay.Client')
    def test_webhook_team_upgrade_cancels_other_active_subscriptions_after_commit(self, mock_client_cls):
        self.user.current_plan = 'INDIVIDUAL'
        self.user.save(update_fields=['current_plan'])
        old_tx = PaymentTransaction.objects.create(
            user=self.user,
            plan_name='INDIVIDUAL',
            amount='599.00',
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id='sub_old_active',
            razorpay_payment_id='pay_old_active',
        )
        new_tx = PaymentTransaction.objects.create(
            user=self.user,
            plan_name='TEAM',
            amount='349.00',
            status=PaymentTransaction.Status.PENDING,
            razorpay_subscription_id='sub_new_team',
        )
        current_end = int((timezone.now() + timedelta(days=30)).timestamp())

        response = self._post_webhook(
            {
                'id': 'ev_team_upgrade_1',
                'event': 'subscription.charged',
                'payload': {
                    'payment': {
                        'entity': {
                            'subscription_id': 'sub_new_team',
                            'id': 'pay_new_team',
                        }
                    },
                    'subscription': {
                        'entity': {
                            'id': 'sub_new_team',
                            'current_end': current_end,
                        }
                    },
                },
            }
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Webhook processed')
        old_tx.refresh_from_db()
        new_tx.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(new_tx.status, PaymentTransaction.Status.ACTIVE)
        self.assertEqual(new_tx.razorpay_payment_id, 'pay_new_team')
        self.assertEqual(self.user.current_plan, 'TEAM')
        self.assertEqual(old_tx.status, PaymentTransaction.Status.CANCELLED)
        mock_client_cls.return_value.subscription.cancel.assert_called_once_with('sub_old_active')

    @patch('payments.views.logger.exception')
    @patch('payments.views.razorpay.Client')
    def test_webhook_team_upgrade_cancel_failure_is_logged_and_does_not_fail_event(
        self,
        mock_client_cls,
        mock_logger_exception,
    ):
        self.user.current_plan = 'INDIVIDUAL'
        self.user.save(update_fields=['current_plan'])
        old_tx = PaymentTransaction.objects.create(
            user=self.user,
            plan_name='INDIVIDUAL',
            amount='599.00',
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id='sub_old_active_fail',
            razorpay_payment_id='pay_old_active_fail',
        )
        PaymentTransaction.objects.create(
            user=self.user,
            plan_name='TEAM',
            amount='349.00',
            status=PaymentTransaction.Status.PENDING,
            razorpay_subscription_id='sub_new_team_fail',
        )
        mock_client_cls.return_value.subscription.cancel.side_effect = Exception('cancel failed')

        response = self._post_webhook(
            {
                'id': 'ev_team_upgrade_2',
                'event': 'subscription.charged',
                'payload': {
                    'payment': {
                        'entity': {
                            'subscription_id': 'sub_new_team_fail',
                            'id': 'pay_new_team_fail',
                        }
                    },
                    'subscription': {
                        'entity': {
                            'id': 'sub_new_team_fail',
                            'current_end': int((timezone.now() + timedelta(days=30)).timestamp()),
                        }
                    },
                },
            }
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        old_tx.refresh_from_db()
        self.assertEqual(old_tx.status, PaymentTransaction.Status.ACTIVE)
        self.assertTrue(mock_logger_exception.called)

    @patch('payments.views.razorpay.Client')
    def test_webhook_is_idempotent_for_same_event_id(self, mock_client_cls):
        current_end = int((timezone.now() + timedelta(days=10)).timestamp())
        self.user.current_plan = 'INDIVIDUAL'
        self.user.plan_expires_at = timezone.now() + timedelta(days=2)
        self.user.save(update_fields=['current_plan', 'plan_expires_at'])

        PaymentTransaction.objects.create(
            user=self.user,
            plan_name='INDIVIDUAL',
            amount='599.00',
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id='sub_webhook_done',
            razorpay_payment_id='pay_previous',
        )

        payload = {
            'id': 'ev_charge_dupe',
            'event': 'subscription.charged',
            'payload': {
                'payment': {'entity': {'subscription_id': 'sub_webhook_done', 'id': 'pay_webhook_done'}},
                'subscription': {'entity': {'id': 'sub_webhook_done', 'current_end': current_end}},
            },
        }
        first = self._post_webhook(payload)
        second = self._post_webhook(payload)

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(first.data['message'], 'Webhook processed')
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.data['message'], 'Already processed')
        self.assertEqual(WebhookEventLog.objects.filter(razorpay_event_id='ev_charge_dupe').count(), 1)
        self.user.refresh_from_db()
        self.assertEqual(
            self.user.plan_expires_at,
            datetime.fromtimestamp(current_end, tz=dt_timezone.utc),
        )

    @patch('payments.views.razorpay.Client')
    def test_webhook_returns_200_when_transaction_not_found(self, mock_client_cls):
        response = self._post_webhook(
            {
                'id': 'ev_missing_sub',
                'event': 'subscription.charged',
                'payload': {
                    'payment': {'entity': {'subscription_id': 'missing_sub', 'id': 'pay_missing'}},
                    'subscription': {'entity': {'id': 'missing_sub', 'current_end': int(timezone.now().timestamp())}},
                },
            }
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Event ignored')

    @patch('payments.views.razorpay.Client')
    def test_webhook_subscription_updated_quantity_match_logs_success(self, mock_client_cls):
        workspace = Workspace.objects.create(name='Billing WS', owner=self.user)
        invited_user = User.objects.create_user(
            email='member1@example.com',
            username='member1',
            password='password123',
            full_name='Member 1',
        )
        WorkspaceMember.objects.create(
            workspace=workspace,
            user=invited_user,
            role=WorkspaceRole.MEMBER,
            joined_at=timezone.now() - timedelta(hours=1),
        )
        PaymentTransaction.objects.create(
            user=self.user,
            plan_name='TEAM',
            amount='349.00',
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id='sub_update_match',
        )

        response = self._post_webhook(
            {
                'id': 'ev_update_match',
                'event': 'subscription.updated',
                'payload': {
                    'subscription': {
                        'entity': {
                            'id': 'sub_update_match',
                            'quantity': 2,
                        }
                    }
                },
            }
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Webhook processed')
        audit = AuditLog.objects.filter(
            workspace=workspace,
            action='billing.subscription_quantity_sync',
        ).latest('created_at')
        self.assertEqual(audit.status, AuditStatus.SUCCESS)
        self.assertEqual(audit.metadata['payload_quantity'], 2)
        self.assertEqual(audit.metadata['expected_quantity'], 2)

    @patch('payments.views.razorpay.Client')
    def test_webhook_subscription_updated_quantity_mismatch_logs_warning(self, mock_client_cls):
        workspace_a = Workspace.objects.create(name='Billing A', owner=self.user)
        workspace_b = Workspace.objects.create(name='Billing B', owner=self.user)

        invited_1 = User.objects.create_user(
            email='member2@example.com',
            username='member2',
            password='password123',
            full_name='Member 2',
        )
        invited_2 = User.objects.create_user(
            email='member3@example.com',
            username='member3',
            password='password123',
            full_name='Member 3',
        )
        WorkspaceMember.objects.create(
            workspace=workspace_a,
            user=invited_1,
            role=WorkspaceRole.MEMBER,
            joined_at=timezone.now() - timedelta(hours=1),
        )
        WorkspaceMember.objects.create(
            workspace=workspace_b,
            user=invited_2,
            role=WorkspaceRole.MEMBER,
            joined_at=timezone.now() - timedelta(hours=1),
        )

        PaymentTransaction.objects.create(
            user=self.user,
            plan_name='TEAM',
            amount='349.00',
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id='sub_update_mismatch',
        )

        response = self._post_webhook(
            {
                'id': 'ev_update_mismatch',
                'event': 'subscription.updated',
                'payload': {
                    'subscription': {
                        'entity': {
                            'id': 'sub_update_mismatch',
                            'quantity': 2,
                        }
                    }
                },
            }
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Webhook processed')
        warnings = AuditLog.objects.filter(
            action='billing.subscription_quantity_sync',
            status=AuditStatus.WARNING,
        )
        self.assertEqual(warnings.count(), 2)
        self.assertTrue(all(log.metadata['expected_quantity'] == 3 for log in warnings))
