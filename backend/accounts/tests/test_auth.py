from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


User = get_user_model()


class AuthenticationAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="auth@example.com",
            username="authuser",
            password="password123",
            full_name="Auth User",
        )
        self.login_url = reverse("token_obtain_pair")
        self.refresh_url = reverse("token_refresh")
        self.profile_url = reverse("profile")

    def test_successful_login_with_email_and_password(self):
        response = self.client.post(
            self.login_url,
            {"identifier": self.user.email, "password": "password123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], self.user.email)

    def test_successful_login_with_username_and_password(self):
        response = self.client.post(
            self.login_url,
            {"identifier": self.user.username, "password": "password123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertEqual(response.data["user"]["username"], self.user.username)

    def test_login_fails_with_wrong_password(self):
        response = self.client.post(
            self.login_url,
            {"identifier": self.user.email, "password": "wrong-password"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_fails_with_non_existent_user(self):
        response = self.client.post(
            self.login_url,
            {"identifier": "missing@example.com", "password": "password123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_jwt_token_refresh_works(self):
        login_response = self.client.post(
            self.login_url,
            {"identifier": self.user.email, "password": "password123"},
            format="json",
        )

        response = self.client.post(
            self.refresh_url,
            {"refresh": login_response.data["refresh"]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_jwt_token_refresh_fails_with_invalid_token(self):
        response = self.client.post(
            self.refresh_url,
            {"refresh": "invalid-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_request_to_protected_endpoint_returns_401(self):
        response = self.client.get(self.profile_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
