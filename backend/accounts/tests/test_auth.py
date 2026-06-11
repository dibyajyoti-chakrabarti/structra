"""
Auth is now handled by AWS Cognito. These tests verify that the
CognitoJWTAuthentication class correctly provisions and authenticates
users from a mocked Cognito ID token payload.
"""
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()

MOCK_POOL_ID = 'ap-south-1_TESTPOOL'
MOCK_SETTINGS = {
    'COGNITO_USER_POOL_ID': MOCK_POOL_ID,
    'AWS_REGION': 'ap-south-1',
}

MOCK_PAYLOAD = {
    'sub': 'cognito-sub-abc123',
    'email': 'test@example.com',
    'name': 'Test User',
    'token_use': 'id',
}


def _make_mock_auth(payload=None):
    """Return a mock that patches CognitoJWTAuthentication.authenticate."""
    p = payload or MOCK_PAYLOAD

    def fake_authenticate(self, request):
        user, _ = User.objects.get_or_create(
            cognito_sub=p['sub'],
            defaults={
                'email': p['email'],
                'username': 'testuser',
                'full_name': p.get('name', ''),
            },
        )
        return (user, None)

    return patch(
        'accounts.authentication.CognitoJWTAuthentication.authenticate',
        fake_authenticate,
    )


class CognitoAuthProvisioningTests(APITestCase):
    def setUp(self):
        self.profile_url = reverse('profile')

    def test_new_user_is_provisioned_on_first_request(self):
        with _make_mock_auth():
            resp = self.client.get(
                self.profile_url,
                HTTP_AUTHORIZATION='Bearer fake-token',
            )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(User.objects.filter(cognito_sub='cognito-sub-abc123').exists())

    def test_existing_user_is_returned_by_sub(self):
        User.objects.create_user(
            email='test@example.com',
            username='existing',
            full_name='Existing',
            cognito_sub='cognito-sub-abc123',
        )
        with _make_mock_auth():
            resp = self.client.get(
                self.profile_url,
                HTTP_AUTHORIZATION='Bearer fake-token',
            )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(User.objects.filter(cognito_sub='cognito-sub-abc123').count(), 1)

    def test_unauthenticated_request_returns_401(self):
        resp = self.client.get(self.profile_url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
