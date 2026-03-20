from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


User = get_user_model()


class SocialLoginAPITests(APITestCase):
    def setUp(self):
        self.google_url = reverse("google_login")
        self.github_url = reverse("github_login")

    @patch("accounts.views.requests.get")
    def test_google_login_creates_new_user_if_email_not_found(self, mock_get):
        mock_response = Mock(ok=True)
        mock_response.json.return_value = {
            "email": "google-new@example.com",
            "name": "Google New User",
        }
        mock_get.return_value = mock_response

        response = self.client.post(
            self.google_url,
            {"access_token": "google-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(User.objects.filter(email="google-new@example.com").exists())
        self.assertIn("access", response.data)

    @patch("accounts.views.requests.get")
    def test_google_login_returns_tokens_for_existing_user(self, mock_get):
        existing_user = User.objects.create_user(
            email="google-existing@example.com",
            username="googleexisting",
            password="password123",
            full_name="Existing User",
        )
        mock_response = Mock(ok=True)
        mock_response.json.return_value = {
            "email": existing_user.email,
            "name": "Updated Name Ignored",
        }
        mock_get.return_value = mock_response

        response = self.client.post(
            self.google_url,
            {"access_token": "google-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["email"], existing_user.email)
        self.assertEqual(User.objects.filter(email=existing_user.email).count(), 1)

    @patch("accounts.views.requests.get")
    def test_google_login_fails_if_access_token_is_invalid(self, mock_get):
        mock_get.return_value = Mock(ok=False)

        response = self.client.post(
            self.google_url,
            {"access_token": "bad-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Invalid token")

    @patch("accounts.views.requests.get")
    @patch("accounts.views.requests.post")
    def test_github_login_creates_new_user_if_email_not_found(self, mock_post, mock_get):
        token_response = Mock(ok=True)
        token_response.json.return_value = {"access_token": "github-access"}
        mock_post.return_value = token_response

        user_response = Mock(ok=True)
        user_response.json.return_value = {
            "email": "github-new@example.com",
            "name": "GitHub New User",
            "login": "githubnew",
        }
        mock_get.return_value = user_response

        response = self.client.post(
            self.github_url,
            {"code": "github-code"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(User.objects.filter(email="github-new@example.com").exists())
        self.assertIn("access", response.data)

    @patch("accounts.views.requests.get")
    @patch("accounts.views.requests.post")
    def test_github_login_returns_tokens_for_existing_user(self, mock_post, mock_get):
        existing_user = User.objects.create_user(
            email="github-existing@example.com",
            username="githubexisting",
            password="password123",
            full_name="Existing User",
        )
        token_response = Mock(ok=True)
        token_response.json.return_value = {"access_token": "github-access"}
        mock_post.return_value = token_response

        user_response = Mock(ok=True)
        user_response.json.return_value = {
            "email": existing_user.email,
            "name": "GitHub Existing User",
            "login": "githubexisting",
        }
        mock_get.return_value = user_response

        response = self.client.post(
            self.github_url,
            {"code": "github-code"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["email"], existing_user.email)
        self.assertEqual(User.objects.filter(email=existing_user.email).count(), 1)
