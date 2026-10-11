"""Which avatar_url values a profile update accepts."""
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.services import tokens

User = get_user_model()

R2 = dict(
    R2_ACCOUNT_ID='acct123',
    R2_ENDPOINT_URL='',
    R2_ACCESS_KEY_ID='AKIATESTKEY',
    R2_SECRET_ACCESS_KEY='super-secret-value',
    R2_BUCKET_NAME='structra-assets',
    R2_PUBLIC_URL='https://assets.example.test',
)
PROFILE_URL = '/api/auth/profile/'


class AvatarTestBase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='av@example.com', username='avuser', full_name='Av User')
        self.other = User.objects.create_user(email='other@example.com', username='otheruser', full_name='Other')
        access = tokens.issue_token_pair(self.user)['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

    def prefix(self, user=None):
        return f"https://assets.example.test/users/{(user or self.user).user_id}/"


class AvatarUrlValidationTests(AvatarTestBase):
    def patch_avatar(self, value, **extra):
        return self.client.patch(PROFILE_URL, {'avatar_url': value, **extra}, format='json')

    @override_settings(**R2)
    def test_own_storage_url_is_accepted(self):
        url = self.prefix() + 'avatar-abc.png'
        self.assertEqual(self.patch_avatar(url).status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.avatar_url, url)

    @override_settings(**R2)
    def test_arbitrary_remote_url_is_rejected(self):
        for url in ('https://evil.example/pixel.png', 'http://assets.example.test/users/x/a.png',
                    'https://assets.example.test.evil.example/users/x/a.png', 'javascript:alert(1)'):
            self.assertEqual(self.patch_avatar(url).status_code, status.HTTP_400_BAD_REQUEST, url)
        self.user.refresh_from_db()
        self.assertFalse(self.user.avatar_url)

    @override_settings(**R2)
    def test_another_users_folder_is_rejected(self):
        url = self.prefix(self.other) + 'avatar-abc.png'
        self.assertEqual(self.patch_avatar(url).status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(**R2)
    def test_prefix_lookalike_is_rejected(self):
        # A user id that merely starts with the same characters must not pass the prefix check.
        url = self.prefix()[:-1] + 'x/avatar-abc.png'
        self.assertEqual(self.patch_avatar(url).status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(**R2)
    def test_avatar_can_be_cleared(self):
        self.user.avatar_url = self.prefix() + 'avatar-abc.png'
        self.user.save()
        self.assertEqual(self.patch_avatar(None).status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertIsNone(self.user.avatar_url)

    @override_settings(**R2)
    def test_unchanged_provider_avatar_survives_a_profile_save(self):
        self.user.avatar_url = 'https://lh3.googleusercontent.com/a/photo'
        self.user.save()
        resp = self.patch_avatar('https://lh3.googleusercontent.com/a/photo', full_name='Renamed')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['full_name'], 'Renamed')

    def test_without_storage_configured_new_avatars_are_rejected(self):
        self.assertEqual(self.patch_avatar('https://assets.example.test/x.png').status_code, 400)

    def test_profile_updates_without_avatar_still_work(self):
        resp = self.client.patch(PROFILE_URL, {'full_name': 'Only Name'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
