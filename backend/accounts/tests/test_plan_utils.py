from django.contrib.auth import get_user_model
from django.test import TestCase

from accounts.services.plan import get_active_razorpay_subscription_id
from payments.models import PaymentTransaction

User = get_user_model()


class ActiveSubscriptionLookupTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='plan-utils@example.com',
            username='planutils',
            password='password123',
            full_name='Plan Utils',
        )

    def test_returns_active_sub_prefix_subscription_id(self):
        PaymentTransaction.objects.create(
            user=self.user,
            plan_name='INDIVIDUAL',
            amount='599.00',
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id='sub_active_123',
        )

        active_id = get_active_razorpay_subscription_id(self.user)

        self.assertEqual(active_id, 'sub_active_123')

    def test_ignores_legacy_non_subscription_ids(self):
        PaymentTransaction.objects.create(
            user=self.user,
            plan_name='INDIVIDUAL',
            amount='599.00',
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id='order_legacy_123',
        )

        active_id = get_active_razorpay_subscription_id(self.user)

        self.assertIsNone(active_id)
