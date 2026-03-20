from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import EmailOTP
from accounts.views import _hash_otp


User = get_user_model()


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class EmailOTPAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="otp@example.com",
            username="otpuser",
            password="password123",
            full_name="OTP User",
        )
        self.request_url = reverse("email_otp_request")
        self.verify_url = reverse("email_otp_verify")

    def test_otp_request_succeeds_for_existing_user_login_purpose(self):
        response = self.client.post(
            self.request_url,
            {"identifier": self.user.email, "purpose": EmailOTP.PURPOSE_LOGIN},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(EmailOTP.objects.filter(email=self.user.email).count(), 1)

    def test_otp_request_fails_for_non_existent_user_login_purpose(self):
        response = self.client.post(
            self.request_url,
            {"identifier": "missing@example.com", "purpose": EmailOTP.PURPOSE_LOGIN},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_otp_request_succeeds_for_new_email_signup_purpose(self):
        response = self.client.post(
            self.request_url,
            {"email": "new-user@example.com", "purpose": EmailOTP.PURPOSE_SIGNUP},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            EmailOTP.objects.filter(email="new-user@example.com", purpose=EmailOTP.PURPOSE_SIGNUP).count(),
            1,
        )

    def test_otp_request_fails_if_email_already_has_an_account_signup_purpose(self):
        response = self.client.post(
            self.request_url,
            {"email": self.user.email, "purpose": EmailOTP.PURPOSE_SIGNUP},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("accounts.views._generate_otp", return_value="123456")
    def test_otp_verify_succeeds_and_returns_jwt_tokens(self, _generate_otp_mock):
        self.client.post(
            self.request_url,
            {"identifier": self.user.email, "purpose": EmailOTP.PURPOSE_LOGIN},
            format="json",
        )

        response = self.client.post(
            self.verify_url,
            {
                "identifier": self.user.email,
                "otp": "123456",
                "purpose": EmailOTP.PURPOSE_LOGIN,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_otp_verify_fails_with_wrong_otp(self):
        EmailOTP.objects.create(
            email=self.user.email,
            purpose=EmailOTP.PURPOSE_LOGIN,
            otp_hash=_hash_otp("654321"),
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        response = self.client.post(
            self.verify_url,
            {
                "identifier": self.user.email,
                "otp": "111111",
                "purpose": EmailOTP.PURPOSE_LOGIN,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Invalid OTP")

    def test_otp_verify_fails_with_expired_otp(self):
        EmailOTP.objects.create(
            email=self.user.email,
            purpose=EmailOTP.PURPOSE_LOGIN,
            otp_hash=_hash_otp("654321"),
            expires_at=timezone.now() - timedelta(minutes=1),
        )

        response = self.client.post(
            self.verify_url,
            {
                "identifier": self.user.email,
                "otp": "654321",
                "purpose": EmailOTP.PURPOSE_LOGIN,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "OTP not found or expired")

    def test_otp_verify_fails_after_max_attempts_five_attempts(self):
        otp_record = EmailOTP.objects.create(
            email=self.user.email,
            purpose=EmailOTP.PURPOSE_LOGIN,
            otp_hash=_hash_otp("654321"),
            expires_at=timezone.now() + timedelta(minutes=10),
            attempts=4,
        )

        response = self.client.post(
            self.verify_url,
            {
                "identifier": self.user.email,
                "otp": "111111",
                "purpose": EmailOTP.PURPOSE_LOGIN,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        otp_record.refresh_from_db()
        self.assertEqual(otp_record.attempts, 5)
        self.assertTrue(otp_record.is_used)

    @patch("accounts.views._generate_otp", return_value="123456")
    def test_resend_is_blocked_within_cooldown_period_sixty_seconds(self, _generate_otp_mock):
        first_response = self.client.post(
            self.request_url,
            {"identifier": self.user.email, "purpose": EmailOTP.PURPOSE_LOGIN},
            format="json",
        )
        second_response = self.client.post(
            self.request_url,
            {"identifier": self.user.email, "purpose": EmailOTP.PURPOSE_LOGIN},
            format="json",
        )

        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn("retry_after_seconds", second_response.data)
