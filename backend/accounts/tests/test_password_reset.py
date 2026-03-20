from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.test import override_settings
from django.urls import reverse
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APITestCase


User = get_user_model()


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class PasswordResetAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="reset@example.com",
            username="resetuser",
            password="old-password-123",
            full_name="Reset User",
        )
        self.request_url = reverse("password_reset_request")
        self.validate_url = reverse("password_reset_validate")
        self.confirm_url = reverse("password_reset_confirm")
        self.login_url = reverse("token_obtain_pair")

    def _uid_and_token(self):
        uid = urlsafe_base64_encode(str(self.user.pk).encode("utf-8"))
        token = PasswordResetTokenGenerator().make_token(self.user)
        return uid, token

    def test_password_reset_request_succeeds_for_existing_user(self):
        response = self.client.post(
            self.request_url,
            {"identifier": self.user.email},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("password reset link has been sent", response.data["message"].lower())

    def test_password_reset_request_returns_same_message_for_non_existent_user(self):
        response = self.client.post(
            self.request_url,
            {"identifier": "missing@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("password reset link has been sent", response.data["message"].lower())

    def test_password_reset_validate_succeeds_with_valid_uid_and_token(self):
        uid, token = self._uid_and_token()

        response = self.client.post(
            self.validate_url,
            {"uid": uid, "token": token},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["valid"])

    def test_password_reset_validate_fails_with_invalid_token(self):
        uid, _token = self._uid_and_token()

        response = self.client.post(
            self.validate_url,
            {"uid": uid, "token": "invalid-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_password_reset_confirm_successfully_changes_password(self):
        uid, token = self._uid_and_token()

        response = self.client.post(
            self.confirm_url,
            {"uid": uid, "token": token, "password": "new-password-123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("new-password-123"))

    def test_password_reset_confirm_fails_with_invalid_token(self):
        uid, _token = self._uid_and_token()

        response = self.client.post(
            self.confirm_url,
            {"uid": uid, "token": "invalid-token", "password": "new-password-123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("old-password-123"))

    def test_after_password_reset_user_can_login_with_new_password(self):
        uid, token = self._uid_and_token()
        self.client.post(
            self.confirm_url,
            {"uid": uid, "token": token, "password": "new-password-123"},
            format="json",
        )

        response = self.client.post(
            self.login_url,
            {"identifier": self.user.email, "password": "new-password-123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
