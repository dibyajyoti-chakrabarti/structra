from datetime import timedelta
from unittest.mock import patch

import razorpay
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from payments.models import PaymentTransaction
from workspaces.models import Workspace


User = get_user_model()


@override_settings(
    RAZORPAY_KEY_ID="rzp_test_key",
    RAZORPAY_KEY_SECRET="rzp_test_secret",
    RAZORPAY_WEBHOOK_SECRET="webhook_secret",
    RAZORPAY_PLAN_ID_INDIVIDUAL="plan_individual_test",
    RAZORPAY_PLAN_ID_TEAM="plan_team_test",
)
class CheckoutAndSubscriptionAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="password123",
            full_name="Test User",
        )
        self.create_url = reverse("payments-order-create")
        self.checkout_url = reverse("payments-checkout")
        self.verify_url = reverse("payments-order-verify")
        self.cancel_url = reverse("payments-subscription-cancel")

    def test_requires_authentication(self):
        response = self.client.post(self.create_url, {"plan_name": "INDIVIDUAL"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        response = self.client.post(
            self.verify_url,
            {
                "razorpay_subscription_id": "sub_x",
                "razorpay_payment_id": "pay_x",
                "razorpay_signature": "sig_x",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        response = self.client.post(
            self.cancel_url,
            {"razorpay_subscription_id": "sub_x"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch("payments.views.razorpay.Client")
    def test_creates_subscription_for_valid_plan(self, mock_client_cls):
        mock_client_cls.return_value.subscription.create.return_value = {"id": "sub_abc123"}
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.create_url, {"plan_name": "INDIVIDUAL"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["razorpay_subscription_id"], "sub_abc123")
        self.assertEqual(response.data["amount"], "599.00")
        self.assertEqual(response.data["currency"], "INR")
        mock_client_cls.return_value.subscription.create.assert_called_once_with(
            {"plan_id": "plan_individual_test", "total_count": 12, "customer_notify": 1}
        )

        tx = PaymentTransaction.objects.get()
        self.assertEqual(tx.user, self.user)
        self.assertEqual(tx.plan_name, "INDIVIDUAL")
        self.assertEqual(str(tx.amount), "599.00")
        self.assertEqual(tx.status, PaymentTransaction.Status.PENDING)
        self.assertEqual(tx.razorpay_subscription_id, "sub_abc123")

    @patch("payments.views.razorpay.Client")
    def test_checkout_creates_subscription_for_core_to_individual(self, mock_client_cls):
        mock_client_cls.return_value.subscription.create.return_value = {"id": "sub_checkout_individual"}
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.checkout_url,
            {"plan_name": "INDIVIDUAL", "quantity": 9},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["razorpay_subscription_id"], "sub_checkout_individual")
        self.assertEqual(response.data["amount"], "599.00")
        mock_client_cls.return_value.subscription.create.assert_called_once_with(
            {"plan_id": "plan_individual_test", "total_count": 120, "customer_notify": 1}
        )
        tx = PaymentTransaction.objects.get(razorpay_subscription_id="sub_checkout_individual")
        self.assertEqual(tx.requested_seats, 1)

    @patch("payments.views.razorpay.Client")
    def test_checkout_creates_team_subscription_with_requested_quantity(self, mock_client_cls):
        mock_client_cls.return_value.subscription.create.return_value = {"id": "sub_checkout_team"}
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.checkout_url,
            {"plan_name": "TEAM", "quantity": 3},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["razorpay_subscription_id"], "sub_checkout_team")
        self.assertEqual(response.data["amount"], "1047.00")
        mock_client_cls.return_value.subscription.create.assert_called_once_with(
            {
                "plan_id": "plan_team_test",
                "total_count": 120,
                "customer_notify": 1,
                "quantity": 3,
            }
        )
        tx = PaymentTransaction.objects.get(razorpay_subscription_id="sub_checkout_team")
        self.assertEqual(tx.requested_seats, 3)

    @patch("payments.views.razorpay.Client")
    def test_checkout_allows_individual_to_team_upgrade(self, mock_client_cls):
        mock_client_cls.return_value.subscription.create.return_value = {"id": "sub_checkout_upgrade"}
        self.user.current_plan = "INDIVIDUAL"
        self.user.save(update_fields=["current_plan"])
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.checkout_url,
            {"plan_name": "TEAM", "quantity": 2},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["razorpay_subscription_id"], "sub_checkout_upgrade")
        self.assertEqual(response.data["amount"], "698.00")
        tx = PaymentTransaction.objects.get(razorpay_subscription_id="sub_checkout_upgrade")
        self.assertEqual(tx.requested_seats, 2)

    @patch("payments.views.razorpay.Client")
    def test_checkout_rejects_team_when_quantity_missing(self, mock_client_cls):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.checkout_url, {"plan_name": "TEAM"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Quantity is required for TEAM plan.")
        mock_client_cls.assert_not_called()

    @patch("payments.views.razorpay.Client")
    def test_checkout_rejects_team_when_quantity_invalid(self, mock_client_cls):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.checkout_url, {"plan_name": "TEAM", "quantity": 0}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Ensure this value is greater than or equal to 1.")
        mock_client_cls.assert_not_called()

    @patch("payments.views.razorpay.Client")
    def test_checkout_blocks_same_plan(self, mock_client_cls):
        self.user.current_plan = "INDIVIDUAL"
        self.user.save(update_fields=["current_plan"])
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.checkout_url, {"plan_name": "INDIVIDUAL"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "You are already on this plan.")
        mock_client_cls.assert_not_called()

    @patch("payments.views.razorpay.Client")
    def test_checkout_blocks_downgrade_via_checkout(self, mock_client_cls):
        self.user.current_plan = "TEAM"
        self.user.save(update_fields=["current_plan"])
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.checkout_url, {"plan_name": "INDIVIDUAL"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["error"],
            "Downgrades are not allowed via checkout. Use plan downgrade flow.",
        )
        mock_client_cls.assert_not_called()

    @patch("payments.views.razorpay.Client")
    def test_creates_subscription_for_team_plan(self, mock_client_cls):
        mock_client_cls.return_value.subscription.create.return_value = {"id": "sub_team_abc123"}
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.create_url, {"plan_name": "TEAM"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["razorpay_subscription_id"], "sub_team_abc123")
        self.assertEqual(response.data["amount"], "349.00")
        self.assertEqual(response.data["currency"], "INR")
        mock_client_cls.return_value.subscription.create.assert_called_once_with(
            {"plan_id": "plan_team_test", "total_count": 12, "customer_notify": 1}
        )

        tx = PaymentTransaction.objects.get()
        self.assertEqual(tx.plan_name, "TEAM")
        self.assertEqual(str(tx.amount), "349.00")

    @patch("payments.views.razorpay.Client")
    def test_rejects_invalid_plan(self, mock_client_cls):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.create_url, {"plan_name": "UNKNOWN"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Invalid plan selected")
        mock_client_cls.assert_not_called()
        self.assertEqual(PaymentTransaction.objects.count(), 0)

    @patch("payments.views.razorpay.Client")
    def test_lowercase_plan_is_normalized(self, mock_client_cls):
        mock_client_cls.return_value.subscription.create.return_value = {"id": "sub_lowercase"}
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.create_url, {"plan_name": "individual"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        tx = PaymentTransaction.objects.get()
        self.assertEqual(tx.plan_name, "INDIVIDUAL")

    @patch("payments.views.razorpay.Client")
    def test_create_subscription_rejects_user_with_active_plan(self, mock_client_cls):
        self.user.current_plan = "INDIVIDUAL"
        self.user.plan_expires_at = timezone.now() + timedelta(days=20)
        self.user.save(update_fields=["current_plan", "plan_expires_at"])
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.create_url, {"plan_name": "INDIVIDUAL"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "You already have an active plan.")
        self.assertEqual(PaymentTransaction.objects.count(), 0)
        mock_client_cls.assert_not_called()

    @patch("payments.views.razorpay.Client")
    def test_razorpay_failure_returns_502(self, mock_client_cls):
        mock_client_cls.return_value.subscription.create.side_effect = Exception("Razorpay error")
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.create_url, {"plan_name": "INDIVIDUAL"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(response.data["error"], "Unable to create subscription")
        self.assertEqual(PaymentTransaction.objects.count(), 0)

    @patch("payments.views.razorpay.Client")
    def test_missing_subscription_id_returns_502(self, mock_client_cls):
        mock_client_cls.return_value.subscription.create.return_value = {"status": "created"}
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.create_url, {"plan_name": "INDIVIDUAL"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(response.data["error"], "Unable to create subscription")
        self.assertEqual(PaymentTransaction.objects.count(), 0)

    @override_settings(RAZORPAY_KEY_ID="", RAZORPAY_KEY_SECRET="")
    def test_missing_credentials_returns_500(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.create_url, {"plan_name": "INDIVIDUAL"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data["error"], "Payment service unavailable")
        self.assertEqual(PaymentTransaction.objects.count(), 0)

    @override_settings(RAZORPAY_KEY_ID="", RAZORPAY_KEY_SECRET="")
    def test_checkout_missing_credentials_returns_500(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.checkout_url, {"plan_name": "INDIVIDUAL"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data["error"], "Payment service unavailable")
        self.assertEqual(PaymentTransaction.objects.count(), 0)

    @override_settings(RAZORPAY_PLAN_ID_INDIVIDUAL="")
    @patch("payments.views.razorpay.Client")
    def test_missing_plan_id_returns_500(self, mock_client_cls):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.create_url, {"plan_name": "INDIVIDUAL"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data["error"], "Payment service unavailable")
        self.assertEqual(PaymentTransaction.objects.count(), 0)
        mock_client_cls.assert_called_once()

    @override_settings(RAZORPAY_PLAN_ID_INDIVIDUAL="", RAZORPAY_INDIVIDUAL_PLAN_ID="")
    @patch("payments.views.razorpay.Client")
    def test_checkout_missing_plan_id_returns_500(self, mock_client_cls):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(self.checkout_url, {"plan_name": "INDIVIDUAL"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data["error"], "Payment service unavailable")
        self.assertEqual(PaymentTransaction.objects.count(), 0)
        mock_client_cls.assert_called_once()

    @patch("payments.views.razorpay.Client")
    def test_verify_payment_success(self, mock_client_cls):
        tx = PaymentTransaction.objects.create(
            user=self.user,
            plan_name="INDIVIDUAL",
            amount="599.00",
            status=PaymentTransaction.Status.PENDING,
            razorpay_subscription_id="sub_success_1",
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.verify_url,
            {
                "razorpay_subscription_id": "sub_success_1",
                "razorpay_payment_id": "pay_success_1",
                "razorpay_signature": "sig_success_1",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Payment verified")
        self.assertEqual(response.data["current_plan"], "INDIVIDUAL")
        self.assertIsNotNone(response.data["expires_at"])
        tx.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(tx.status, PaymentTransaction.Status.ACTIVE)
        self.assertEqual(tx.razorpay_payment_id, "pay_success_1")
        self.assertEqual(tx.razorpay_signature, "sig_success_1")
        self.assertEqual(self.user.current_plan, "INDIVIDUAL")
        self.assertIsNotNone(self.user.plan_expires_at)
        delta = self.user.plan_expires_at - timezone.now()
        self.assertGreater(delta.total_seconds(), 29 * 24 * 60 * 60)
        self.assertLess(delta.total_seconds(), 31 * 24 * 60 * 60)
        mock_client_cls.return_value.utility.verify_subscription_payment_signature.assert_called_once()

    @patch("payments.views.razorpay.Client")
    def test_verify_team_payment_applies_requested_seats_and_workspace_pool(self, mock_client_cls):
        workspace = Workspace.objects.create(owner=self.user, name="Team Verify Workspace")
        workspace.ai_credits_monthly = 80
        workspace.ai_credits_remaining = 12
        workspace.save(update_fields=["ai_credits_monthly", "ai_credits_remaining"])

        tx = PaymentTransaction.objects.create(
            user=self.user,
            plan_name="TEAM",
            requested_seats=4,
            amount="1396.00",
            status=PaymentTransaction.Status.PENDING,
            razorpay_subscription_id="sub_team_verify_1",
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.verify_url,
            {
                "razorpay_subscription_id": "sub_team_verify_1",
                "razorpay_payment_id": "pay_team_verify_1",
                "razorpay_signature": "sig_team_verify_1",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["current_plan"], "TEAM")
        tx.refresh_from_db()
        self.user.refresh_from_db()
        workspace.refresh_from_db()
        self.assertEqual(tx.status, PaymentTransaction.Status.ACTIVE)
        self.assertEqual(self.user.purchased_team_seats, 4)
        self.assertEqual(workspace.ai_credits_monthly, 320)
        self.assertEqual(workspace.ai_credits_remaining, 320)

    @patch("payments.views.razorpay.Client")
    def test_verify_signature_failure_marks_transaction_failed(self, mock_client_cls):
        tx = PaymentTransaction.objects.create(
            user=self.user,
            plan_name="INDIVIDUAL",
            amount="599.00",
            status=PaymentTransaction.Status.PENDING,
            razorpay_subscription_id="sub_fail_1",
        )
        mock_client_cls.return_value.utility.verify_subscription_payment_signature.side_effect = (
            razorpay.errors.SignatureVerificationError("bad signature")
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.verify_url,
            {
                "razorpay_subscription_id": "sub_fail_1",
                "razorpay_payment_id": "pay_fail_1",
                "razorpay_signature": "sig_fail_1",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Invalid payment signature")
        tx.refresh_from_db()
        self.assertEqual(tx.status, PaymentTransaction.Status.FAILED)
        self.assertEqual(tx.razorpay_payment_id, "pay_fail_1")
        self.assertEqual(tx.razorpay_signature, "sig_fail_1")

    @patch("payments.views.razorpay.Client")
    def test_verify_is_idempotent_for_active_transaction(self, mock_client_cls):
        original_expiry = timezone.now() + timedelta(days=15)
        self.user.current_plan = "INDIVIDUAL"
        self.user.plan_expires_at = original_expiry
        self.user.save(update_fields=["current_plan", "plan_expires_at"])
        PaymentTransaction.objects.create(
            user=self.user,
            plan_name="INDIVIDUAL",
            amount="599.00",
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id="sub_already_done",
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.verify_url,
            {
                "razorpay_subscription_id": "sub_already_done",
                "razorpay_payment_id": "pay_already_done",
                "razorpay_signature": "sig_already_done",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Payment verified")
        self.assertEqual(response.data["current_plan"], "INDIVIDUAL")
        self.user.refresh_from_db()
        self.assertEqual(self.user.plan_expires_at, original_expiry)
        mock_client_cls.assert_not_called()

    @patch("payments.views.razorpay.Client")
    def test_verify_rejects_failed_transaction(self, mock_client_cls):
        PaymentTransaction.objects.create(
            user=self.user,
            plan_name="INDIVIDUAL",
            amount="599.00",
            status=PaymentTransaction.Status.FAILED,
            razorpay_subscription_id="sub_failed_state",
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.verify_url,
            {
                "razorpay_subscription_id": "sub_failed_state",
                "razorpay_payment_id": "pay_failed_state",
                "razorpay_signature": "sig_failed_state",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Invalid transaction state")
        mock_client_cls.assert_not_called()

    @patch("payments.views.razorpay.Client")
    def test_verify_rejects_transaction_of_another_user(self, mock_client_cls):
        other_user = User.objects.create_user(
            email="other@example.com",
            username="otheruser",
            password="password123",
            full_name="Other User",
        )
        PaymentTransaction.objects.create(
            user=other_user,
            plan_name="INDIVIDUAL",
            amount="599.00",
            status=PaymentTransaction.Status.PENDING,
            razorpay_subscription_id="sub_other_user",
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.verify_url,
            {
                "razorpay_subscription_id": "sub_other_user",
                "razorpay_payment_id": "pay_other_user",
                "razorpay_signature": "sig_other_user",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Invalid transaction state")
        mock_client_cls.assert_not_called()

    @patch("payments.views.razorpay.Client")
    def test_cancel_active_subscription_success(self, mock_client_cls):
        original_expiry = timezone.now() + timedelta(days=20)
        self.user.current_plan = "INDIVIDUAL"
        self.user.plan_expires_at = original_expiry
        self.user.save(update_fields=["current_plan", "plan_expires_at"])
        tx = PaymentTransaction.objects.create(
            user=self.user,
            plan_name="INDIVIDUAL",
            amount="599.00",
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id="sub_cancel_1",
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.cancel_url,
            {"razorpay_subscription_id": "sub_cancel_1"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Subscription cancelled")
        self.assertEqual(response.data["current_plan"], "INDIVIDUAL")
        self.assertIsNotNone(response.data["expires_at"])
        tx.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(tx.status, PaymentTransaction.Status.CANCELLED)
        self.assertEqual(self.user.current_plan, "INDIVIDUAL")
        self.assertEqual(self.user.plan_expires_at, original_expiry)
        mock_client_cls.return_value.subscription.cancel.assert_called_once_with(
            "sub_cancel_1",
            {"cancel_at_cycle_end": 1},
        )

    @patch("payments.views.razorpay.Client")
    def test_cancel_legacy_non_subscription_id_marks_cancelled_without_gateway_call(self, mock_client_cls):
        original_expiry = timezone.now() + timedelta(days=12)
        self.user.current_plan = "INDIVIDUAL"
        self.user.plan_expires_at = original_expiry
        self.user.save(update_fields=["current_plan", "plan_expires_at"])
        tx = PaymentTransaction.objects.create(
            user=self.user,
            plan_name="INDIVIDUAL",
            amount="599.00",
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id="order_legacy_1",
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.cancel_url,
            {"razorpay_subscription_id": "order_legacy_1"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Subscription cancelled")
        tx.refresh_from_db()
        self.assertEqual(tx.status, PaymentTransaction.Status.CANCELLED)
        mock_client_cls.assert_not_called()

    @patch("payments.views.razorpay.Client")
    def test_cancel_is_idempotent_for_cancelled_subscription(self, mock_client_cls):
        original_expiry = timezone.now() + timedelta(days=8)
        self.user.current_plan = "INDIVIDUAL"
        self.user.plan_expires_at = original_expiry
        self.user.save(update_fields=["current_plan", "plan_expires_at"])
        PaymentTransaction.objects.create(
            user=self.user,
            plan_name="INDIVIDUAL",
            amount="599.00",
            status=PaymentTransaction.Status.CANCELLED,
            razorpay_subscription_id="sub_cancel_done",
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.cancel_url,
            {"razorpay_subscription_id": "sub_cancel_done"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Subscription cancelled")
        self.user.refresh_from_db()
        self.assertEqual(self.user.current_plan, "INDIVIDUAL")
        self.assertEqual(self.user.plan_expires_at, original_expiry)
        mock_client_cls.assert_not_called()

    @patch("payments.views.razorpay.Client")
    def test_cancel_rejects_non_active_transaction(self, mock_client_cls):
        PaymentTransaction.objects.create(
            user=self.user,
            plan_name="INDIVIDUAL",
            amount="599.00",
            status=PaymentTransaction.Status.PENDING,
            razorpay_subscription_id="sub_cancel_pending",
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.cancel_url,
            {"razorpay_subscription_id": "sub_cancel_pending"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Invalid transaction state")
        mock_client_cls.assert_not_called()

    @patch("payments.views.razorpay.Client")
    def test_cancel_rejects_other_users_transaction(self, mock_client_cls):
        other_user = User.objects.create_user(
            email="cancel-other@example.com",
            username="cancelother",
            password="password123",
            full_name="Other User",
        )
        PaymentTransaction.objects.create(
            user=other_user,
            plan_name="INDIVIDUAL",
            amount="599.00",
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id="sub_cancel_other_user",
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.cancel_url,
            {"razorpay_subscription_id": "sub_cancel_other_user"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Invalid transaction state")
        mock_client_cls.assert_not_called()

    @override_settings(RAZORPAY_KEY_ID="", RAZORPAY_KEY_SECRET="")
    def test_cancel_with_missing_credentials_returns_500(self):
        PaymentTransaction.objects.create(
            user=self.user,
            plan_name="INDIVIDUAL",
            amount="599.00",
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id="sub_cancel_missing_creds",
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.cancel_url,
            {"razorpay_subscription_id": "sub_cancel_missing_creds"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data["error"], "Payment service unavailable")

    @patch("payments.views.razorpay.Client")
    def test_cancel_razorpay_failure_returns_502(self, mock_client_cls):
        PaymentTransaction.objects.create(
            user=self.user,
            plan_name="INDIVIDUAL",
            amount="599.00",
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id="sub_cancel_error",
        )
        mock_client_cls.return_value.subscription.cancel.side_effect = Exception("Razorpay cancel error")
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.cancel_url,
            {"razorpay_subscription_id": "sub_cancel_error"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(response.data["error"], "Unable to cancel subscription")
