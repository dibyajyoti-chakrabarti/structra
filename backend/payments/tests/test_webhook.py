from datetime import datetime, timedelta, timezone as dt_timezone
from unittest.mock import patch

import razorpay
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from payments.models import PaymentTransaction, WebhookEventLog
from workspaces.models import Workspace


User = get_user_model()


@override_settings(
    RAZORPAY_KEY_ID="rzp_test_key",
    RAZORPAY_KEY_SECRET="rzp_test_secret",
    RAZORPAY_WEBHOOK_SECRET="webhook_secret",
    RAZORPAY_PLAN_ID_INDIVIDUAL="plan_individual_test",
    RAZORPAY_PLAN_ID_TEAM="plan_team_test",
)
class RazorpayWebhookAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="webhook@example.com",
            username="webhookuser",
            password="password123",
            full_name="Webhook User",
        )
        self.webhook_url = reverse("payments-webhook")

    def _post_webhook(self, payload, signature="valid_signature"):
        return self.client.post(
            self.webhook_url,
            payload,
            format="json",
            HTTP_X_RAZORPAY_SIGNATURE=signature,
        )

    @patch("payments.views.razorpay.Client")
    def test_webhook_ignores_non_subscription_charged_event(self, mock_client_cls):
        response = self._post_webhook(
            {
                "id": "ev_ignore_1",
                "event": "payment.authorized",
                "payload": {"payment": {"entity": {"subscription_id": "sub_x", "id": "pay_x"}}},
            }
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Event ignored")
        self.assertTrue(
            WebhookEventLog.objects.filter(
                razorpay_event_id="ev_ignore_1",
                status=WebhookEventLog.Status.SUCCEEDED,
            ).exists()
        )
        mock_client_cls.return_value.utility.verify_webhook_signature.assert_called_once()

    @patch("payments.views.razorpay.Client")
    def test_webhook_invalid_signature_returns_400(self, mock_client_cls):
        mock_client_cls.return_value.utility.verify_webhook_signature.side_effect = (
            razorpay.errors.SignatureVerificationError("bad webhook signature")
        )

        response = self._post_webhook(
            {
                "id": "ev_invalid_sig",
                "event": "subscription.charged",
                "payload": {"payment": {"entity": {"subscription_id": "sub_x", "id": "pay_x"}}},
            },
            signature="invalid_signature",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Invalid webhook signature")
        self.assertFalse(WebhookEventLog.objects.filter(razorpay_event_id="ev_invalid_sig").exists())

    @patch("payments.views.razorpay.Client")
    def test_webhook_missing_event_id_uses_derived_idempotency_key(self, mock_client_cls):
        tx = PaymentTransaction.objects.create(
            user=self.user,
            plan_name="INDIVIDUAL",
            amount="599.00",
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id="sub_no_event_id",
        )

        response = self._post_webhook(
            {
                "event": "subscription.cancelled",
                "payload": {"subscription": {"entity": {"id": "sub_no_event_id"}}},
            }
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Webhook processed")
        tx.refresh_from_db()
        self.assertEqual(tx.status, PaymentTransaction.Status.CANCELLED)
        self.assertEqual(WebhookEventLog.objects.count(), 1)

    @patch("payments.views.razorpay.Client")
    def test_webhook_marks_transaction_cancelled_for_subscription_cancelled(self, mock_client_cls):
        tx = PaymentTransaction.objects.create(
            user=self.user,
            plan_name="INDIVIDUAL",
            amount="599.00",
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id="sub_webhook_cancelled",
        )

        response = self._post_webhook(
            {
                "id": "ev_cancelled_1",
                "event": "subscription.cancelled",
                "payload": {"subscription": {"entity": {"id": "sub_webhook_cancelled"}}},
            }
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Webhook processed")
        tx.refresh_from_db()
        self.assertEqual(tx.status, PaymentTransaction.Status.CANCELLED)
        self.assertTrue(
            WebhookEventLog.objects.filter(
                razorpay_event_id="ev_cancelled_1",
                status=WebhookEventLog.Status.SUCCEEDED,
            ).exists()
        )

    @patch("payments.views.razorpay.Client")
    def test_webhook_marks_transaction_failed_for_subscription_halted(self, mock_client_cls):
        tx = PaymentTransaction.objects.create(
            user=self.user,
            plan_name="INDIVIDUAL",
            amount="599.00",
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id="sub_webhook_halted",
        )

        response = self._post_webhook(
            {
                "id": "ev_halted_1",
                "event": "subscription.halted",
                "payload": {"subscription": {"entity": {"id": "sub_webhook_halted"}}},
            }
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Webhook processed")
        tx.refresh_from_db()
        self.assertEqual(tx.status, PaymentTransaction.Status.FAILED)

    @patch("payments.views.razorpay.Client")
    def test_webhook_activates_pending_transaction_and_resets_workspace_credits(self, mock_client_cls):
        workspace = Workspace.objects.create(name="Webhook WS", owner=self.user)
        workspace.ai_credits_monthly = 50
        workspace.ai_credits_remaining = 3
        workspace.ai_credits_purchased_pack_remaining = 17
        workspace.ai_credits_overage_used_monthly = 5
        workspace.save(
            update_fields=[
                "ai_credits_monthly",
                "ai_credits_remaining",
                "ai_credits_purchased_pack_remaining",
                "ai_credits_overage_used_monthly",
            ]
        )

        tx = PaymentTransaction.objects.create(
            user=self.user,
            plan_name="INDIVIDUAL",
            amount="599.00",
            status=PaymentTransaction.Status.PENDING,
            razorpay_subscription_id="sub_webhook_success",
        )
        current_end = int((timezone.now() + timedelta(days=27)).timestamp())

        response = self._post_webhook(
            {
                "id": "ev_charge_1",
                "event": "subscription.charged",
                "payload": {
                    "payment": {
                        "entity": {
                            "subscription_id": "sub_webhook_success",
                            "id": "pay_webhook_success",
                        }
                    },
                    "subscription": {
                        "entity": {
                            "id": "sub_webhook_success",
                            "current_end": current_end,
                        }
                    },
                },
            }
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Webhook processed")
        tx.refresh_from_db()
        self.user.refresh_from_db()
        workspace.refresh_from_db()
        self.assertEqual(tx.status, PaymentTransaction.Status.ACTIVE)
        self.assertEqual(tx.razorpay_payment_id, "pay_webhook_success")
        self.assertEqual(self.user.current_plan, "INDIVIDUAL")
        self.assertEqual(self.user.plan_expires_at, datetime.fromtimestamp(current_end, tz=dt_timezone.utc))
        self.assertEqual(workspace.ai_credits_remaining, workspace.ai_credits_monthly)
        self.assertEqual(workspace.ai_credits_overage_used_monthly, 0)
        self.assertEqual(workspace.ai_credits_purchased_pack_remaining, 17)

    @patch("payments.views.razorpay.Client")
    def test_webhook_sets_plan_expiry_from_current_end(self, mock_client_cls):
        self.user.current_plan = "INDIVIDUAL"
        self.user.plan_expires_at = timezone.now() + timedelta(days=10)
        self.user.save(update_fields=["current_plan", "plan_expires_at"])

        tx = PaymentTransaction.objects.create(
            user=self.user,
            plan_name="INDIVIDUAL",
            amount="599.00",
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id="sub_webhook_active",
            razorpay_payment_id="pay_previous_cycle",
        )
        current_end = int((timezone.now() + timedelta(days=45)).timestamp())

        response = self._post_webhook(
            {
                "id": "ev_charge_2",
                "event": "subscription.charged",
                "payload": {
                    "payment": {
                        "entity": {
                            "subscription_id": "sub_webhook_active",
                            "id": "pay_new_cycle",
                        }
                    },
                    "subscription": {
                        "entity": {
                            "id": "sub_webhook_active",
                            "current_end": current_end,
                        }
                    },
                },
            }
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Webhook processed")
        tx.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(tx.status, PaymentTransaction.Status.ACTIVE)
        self.assertEqual(tx.razorpay_payment_id, "pay_new_cycle")
        self.assertEqual(self.user.plan_expires_at, datetime.fromtimestamp(current_end, tz=dt_timezone.utc))

    @patch("payments.views.razorpay.Client")
    def test_webhook_team_upgrade_cancels_other_active_subscriptions_after_commit(self, mock_client_cls):
        self.user.current_plan = "INDIVIDUAL"
        self.user.save(update_fields=["current_plan"])
        old_tx = PaymentTransaction.objects.create(
            user=self.user,
            plan_name="INDIVIDUAL",
            amount="599.00",
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id="sub_old_active",
            razorpay_payment_id="pay_old_active",
        )
        new_tx = PaymentTransaction.objects.create(
            user=self.user,
            plan_name="TEAM",
            amount="349.00",
            status=PaymentTransaction.Status.PENDING,
            razorpay_subscription_id="sub_new_team",
        )
        current_end = int((timezone.now() + timedelta(days=30)).timestamp())

        with self.captureOnCommitCallbacks(execute=True):
            response = self._post_webhook(
                {
                    "id": "ev_team_upgrade_1",
                    "event": "subscription.charged",
                    "payload": {
                        "payment": {"entity": {"subscription_id": "sub_new_team", "id": "pay_new_team"}},
                        "subscription": {
                            "entity": {
                                "id": "sub_new_team",
                                "current_end": current_end,
                                "quantity": 2,
                            }
                        },
                    },
                }
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Webhook processed")
        old_tx.refresh_from_db()
        new_tx.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(new_tx.status, PaymentTransaction.Status.ACTIVE)
        self.assertEqual(new_tx.razorpay_payment_id, "pay_new_team")
        self.assertEqual(self.user.current_plan, "TEAM")
        self.assertEqual(self.user.purchased_team_seats, 2)
        self.assertEqual(old_tx.status, PaymentTransaction.Status.CANCELLED)
        mock_client_cls.return_value.subscription.cancel.assert_called_once_with("sub_old_active")

    @patch("payments.views.logger.exception")
    @patch("payments.views.razorpay.Client")
    def test_webhook_team_upgrade_cancel_failure_is_logged_and_does_not_fail_event(
        self,
        mock_client_cls,
        mock_logger_exception,
    ):
        self.user.current_plan = "INDIVIDUAL"
        self.user.save(update_fields=["current_plan"])
        old_tx = PaymentTransaction.objects.create(
            user=self.user,
            plan_name="INDIVIDUAL",
            amount="599.00",
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id="sub_old_active_fail",
            razorpay_payment_id="pay_old_active_fail",
        )
        PaymentTransaction.objects.create(
            user=self.user,
            plan_name="TEAM",
            amount="349.00",
            status=PaymentTransaction.Status.PENDING,
            razorpay_subscription_id="sub_new_team_fail",
        )
        mock_client_cls.return_value.subscription.cancel.side_effect = Exception("cancel failed")

        with self.captureOnCommitCallbacks(execute=True):
            response = self._post_webhook(
                {
                    "id": "ev_team_upgrade_2",
                    "event": "subscription.charged",
                    "payload": {
                        "payment": {
                            "entity": {
                                "subscription_id": "sub_new_team_fail",
                                "id": "pay_new_team_fail",
                            }
                        },
                        "subscription": {
                            "entity": {
                                "id": "sub_new_team_fail",
                                "current_end": int((timezone.now() + timedelta(days=30)).timestamp()),
                                "quantity": 3,
                            }
                        },
                    },
                }
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        old_tx.refresh_from_db()
        self.assertEqual(old_tx.status, PaymentTransaction.Status.ACTIVE)
        self.assertTrue(mock_logger_exception.called)

    @patch("payments.views.razorpay.Client")
    def test_webhook_is_idempotent_for_same_event_id(self, mock_client_cls):
        current_end = int((timezone.now() + timedelta(days=10)).timestamp())
        self.user.current_plan = "INDIVIDUAL"
        self.user.plan_expires_at = timezone.now() + timedelta(days=2)
        self.user.save(update_fields=["current_plan", "plan_expires_at"])

        PaymentTransaction.objects.create(
            user=self.user,
            plan_name="INDIVIDUAL",
            amount="599.00",
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id="sub_webhook_done",
            razorpay_payment_id="pay_previous",
        )

        payload = {
            "id": "ev_charge_dupe",
            "event": "subscription.charged",
            "payload": {
                "payment": {"entity": {"subscription_id": "sub_webhook_done", "id": "pay_webhook_done"}},
                "subscription": {"entity": {"id": "sub_webhook_done", "current_end": current_end}},
            },
        }
        first = self._post_webhook(payload)
        second = self._post_webhook(payload)

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(first.data["message"], "Webhook processed")
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(second.data["message"], "Already processed")
        self.assertEqual(WebhookEventLog.objects.filter(razorpay_event_id="ev_charge_dupe").count(), 1)
        self.user.refresh_from_db()
        self.assertEqual(self.user.plan_expires_at, datetime.fromtimestamp(current_end, tz=dt_timezone.utc))

    @patch("payments.views.razorpay.Client")
    def test_webhook_returns_200_when_transaction_not_found(self, mock_client_cls):
        response = self._post_webhook(
            {
                "id": "ev_missing_sub",
                "event": "subscription.charged",
                "payload": {
                    "payment": {"entity": {"subscription_id": "missing_sub", "id": "pay_missing"}},
                    "subscription": {
                        "entity": {"id": "missing_sub", "current_end": int(timezone.now().timestamp())}
                    },
                },
            }
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Event ignored")

    @patch("payments.views.razorpay.Client")
    def test_webhook_subscription_updated_applies_team_quantity_and_pool(self, mock_client_cls):
        workspace = Workspace.objects.create(name="Billing WS", owner=self.user)
        workspace.ai_credits_monthly = 160
        workspace.ai_credits_remaining = 60
        workspace.save(update_fields=["ai_credits_monthly", "ai_credits_remaining"])
        PaymentTransaction.objects.create(
            user=self.user,
            plan_name="TEAM",
            amount="349.00",
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id="sub_update_match",
        )

        response = self._post_webhook(
            {
                "id": "ev_update_match",
                "event": "subscription.updated",
                "payload": {"subscription": {"entity": {"id": "sub_update_match", "quantity": 2}}},
            }
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Webhook processed")
        self.user.refresh_from_db()
        workspace.refresh_from_db()
        self.assertEqual(self.user.purchased_team_seats, 2)
        self.assertEqual(workspace.ai_credits_monthly, 160)
        self.assertEqual(workspace.ai_credits_remaining, 60)

    @patch("payments.views.razorpay.Client")
    def test_webhook_subscription_updated_preserves_consumed_credits(self, mock_client_cls):
        workspace = Workspace.objects.create(name="Billing A", owner=self.user)
        workspace.ai_credits_monthly = 160
        workspace.ai_credits_remaining = 20
        workspace.save(update_fields=["ai_credits_monthly", "ai_credits_remaining"])
        self.user.purchased_team_seats = 2
        self.user.save(update_fields=["purchased_team_seats"])
        PaymentTransaction.objects.create(
            user=self.user,
            plan_name="TEAM",
            amount="349.00",
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id="sub_update_pool",
        )

        response = self._post_webhook(
            {
                "id": "ev_update_pool",
                "event": "subscription.updated",
                "payload": {"subscription": {"entity": {"id": "sub_update_pool", "quantity": 3}}},
            }
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Webhook processed")
        self.user.refresh_from_db()
        workspace.refresh_from_db()
        self.assertEqual(self.user.purchased_team_seats, 3)
        self.assertEqual(workspace.ai_credits_monthly, 240)
        self.assertEqual(workspace.ai_credits_remaining, 100)
