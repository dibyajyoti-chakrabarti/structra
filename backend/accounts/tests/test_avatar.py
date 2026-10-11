"""Avatar storage on Cloudflare R2: presigned upload, URL validation, cleanup on account deletion."""
from unittest.mock import MagicMock, patch
from urllib.parse import parse_qs, urlparse

from botocore.exceptions import ClientError
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.services import storage, tokens

User = get_user_model()

R2 = dict(
    R2_ACCOUNT_ID='acct123',
    R2_ENDPOINT_URL='',
    R2_ACCESS_KEY_ID='AKIATESTKEY',
    R2_SECRET_ACCESS_KEY='super-secret-value',
    R2_BUCKET_NAME='structra-assets',
    R2_PUBLIC_URL='https://assets.example.test',
)
UPLOAD_URL = '/api/auth/profile/avatar-upload-url/'
PROFILE_URL = '/api/auth/profile/'


class AvatarTestBase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='av@example.com', username='avuser', full_name='Av User')
        self.other = User.objects.create_user(email='other@example.com', username='otheruser', full_name='Other')
        access = tokens.issue_token_pair(self.user)['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

    def prefix(self, user=None):
        return f"https://assets.example.test/users/{(user or self.user).user_id}/"


@override_settings(**R2)
class AvatarUploadUrlTests(AvatarTestBase):
    def test_returns_a_presigned_put_for_the_r2_endpoint(self):
        resp = self.client.get(UPLOAD_URL, {'ext': 'png'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        parsed = urlparse(resp.data['upload_url'])
        query = parse_qs(parsed.query)
        self.assertEqual(parsed.netloc, 'acct123.r2.cloudflarestorage.com')
        self.assertTrue(parsed.path.startswith(f'/structra-assets/users/{self.user.user_id}/avatar-'))
        self.assertTrue(parsed.path.endswith('.png'))
        self.assertEqual(query['X-Amz-Expires'], ['300'])
        self.assertIn('X-Amz-Signature', query)
        self.assertIn('auto/s3/aws4_request', query['X-Amz-Credential'][0])
        self.assertIn('content-type', query['X-Amz-SignedHeaders'][0])
        self.assertEqual(resp.data['content_type'], 'image/png')

    def test_object_url_is_the_public_url_of_the_same_key(self):
        resp = self.client.get(UPLOAD_URL, {'ext': 'webp'})
        key = urlparse(resp.data['upload_url']).path.split('/structra-assets/', 1)[1]
        self.assertEqual(resp.data['object_url'], f'https://assets.example.test/{key}')
        self.assertTrue(resp.data['object_url'].startswith(self.prefix()))

    def test_every_upload_gets_a_new_key(self):
        first = self.client.get(UPLOAD_URL).data['object_url']
        second = self.client.get(UPLOAD_URL).data['object_url']
        self.assertNotEqual(first, second)

    def test_extension_maps_to_a_content_type_and_unknown_falls_back_to_png(self):
        self.assertEqual(self.client.get(UPLOAD_URL, {'ext': '.JPG'}).data['content_type'], 'image/jpeg')
        for bad in ('exe', 'svg', 'png/../../x', ''):
            resp = self.client.get(UPLOAD_URL, {'ext': bad})
            self.assertEqual(resp.data['content_type'], 'image/png', bad)
            self.assertTrue(resp.data['object_url'].endswith('.png'), bad)

    @patch.dict('os.environ', {'AWS_PROFILE': 'a-profile-that-does-not-exist'})
    def test_ambient_aws_profile_is_ignored(self):
        self.assertEqual(self.client.get(UPLOAD_URL).status_code, status.HTTP_200_OK)

    def test_secret_key_never_appears_in_the_response(self):
        body = str(self.client.get(UPLOAD_URL).data)
        self.assertNotIn('super-secret-value', body)

    @override_settings(R2_ENDPOINT_URL='http://localhost:9000')
    def test_endpoint_can_be_overridden(self):
        resp = self.client.get(UPLOAD_URL)
        self.assertEqual(urlparse(resp.data['upload_url']).netloc, 'localhost:9000')

    def test_requires_authentication(self):
        self.client.credentials()
        self.assertEqual(self.client.get(UPLOAD_URL).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_storage_error_is_a_500_not_a_crash(self):
        error = ClientError({'Error': {'Code': 'Boom', 'Message': 'x'}}, 'PutObject')
        with patch('accounts.services.storage._client', side_effect=error):
            self.assertEqual(self.client.get(UPLOAD_URL).status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)


class AvatarNotConfiguredTests(AvatarTestBase):
    @override_settings(**{**R2, 'R2_BUCKET_NAME': ''})
    def test_missing_bucket_is_503(self):
        self.assertEqual(self.client.get(UPLOAD_URL).status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    @override_settings(**{**R2, 'R2_PUBLIC_URL': ''})
    def test_missing_public_url_is_503(self):
        self.assertEqual(self.client.get(UPLOAD_URL).status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    @override_settings(**{**R2, 'R2_ACCOUNT_ID': ''})
    def test_missing_endpoint_is_503(self):
        self.assertEqual(self.client.get(UPLOAD_URL).status_code, status.HTTP_503_SERVICE_UNAVAILABLE)


@override_settings(**R2)
class AccountDeletionStorageTests(AvatarTestBase):
    def test_deleting_the_account_removes_the_users_objects(self):
        client = MagicMock()
        client.list_objects_v2.return_value = {'Contents': [{'Key': f'users/{self.user.user_id}/avatar-a.png'}]}
        with patch('accounts.services.storage._client', return_value=client):
            resp = self.client.delete('/api/auth/account/delete/')
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        client.list_objects_v2.assert_called_once_with(
            Bucket='structra-assets', Prefix=f'users/{self.user.user_id}/'
        )
        client.delete_objects.assert_called_once_with(
            Bucket='structra-assets', Delete={'Objects': [{'Key': f'users/{self.user.user_id}/avatar-a.png'}]}
        )
        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())

    def test_storage_failure_does_not_block_account_deletion(self):
        client = MagicMock()
        client.list_objects_v2.side_effect = ClientError({'Error': {'Code': 'Boom', 'Message': 'x'}}, 'List')
        with patch('accounts.services.storage._client', return_value=client):
            resp = self.client.delete('/api/auth/account/delete/')
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())

    def test_nothing_is_deleted_when_the_folder_is_empty(self):
        client = MagicMock()
        client.list_objects_v2.return_value = {}
        with patch('accounts.services.storage._client', return_value=client):
            storage.delete_user_objects(self.user.user_id)
        client.delete_objects.assert_not_called()

    @override_settings(R2_BUCKET_NAME='')
    def test_unconfigured_storage_is_skipped_silently(self):
        with patch('accounts.services.storage._client') as boto_client:
            resp = self.client.delete('/api/auth/account/delete/')
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        boto_client.assert_not_called()
