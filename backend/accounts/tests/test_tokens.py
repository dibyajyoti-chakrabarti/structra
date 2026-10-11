"""Own JWT access and refresh tokens, the DRF authentication class, logout, account deletion."""
from datetime import timedelta
from unittest.mock import patch

import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import RefreshToken
from accounts.services import tokens

User = get_user_model()


class TokenTestBase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='tok@example.com', username='tokuser', full_name='Tok User')
        self.profile_url = reverse('profile')

    def get_profile(self, access):
        return self.client.get(self.profile_url, HTTP_AUTHORIZATION=f'Bearer {access}')

    def forge(self, token_type='access', **overrides):
        now = timezone.now()
        claims = {
            'iss': settings.JWT_ISSUER,
            'sub': str(self.user.user_id),
            'typ': token_type,
            'jti': 'forged',
            'iat': now,
            'exp': now + timedelta(minutes=5),
        }
        claims.update(overrides)
        return jwt.encode(claims, settings.JWT_SIGNING_KEY, algorithm='HS256')


class JWTAuthenticationTests(TokenTestBase):
    def test_valid_access_token_authenticates(self):
        pair = tokens.issue_token_pair(self.user)
        resp = self.get_profile(pair['access'])
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['email'], 'tok@example.com')

    def test_pair_shape(self):
        pair = tokens.issue_token_pair(self.user)
        self.assertEqual(pair['token_type'], 'Bearer')
        self.assertEqual(pair['expires_in'], settings.JWT_ACCESS_TTL_SECONDS)
        self.assertNotEqual(pair['access'], pair['refresh'])

    def test_missing_header_is_401_with_challenge(self):
        resp = self.client.get(self.profile_url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(resp['WWW-Authenticate'], 'Bearer')

    def test_garbage_token_is_401(self):
        self.assertEqual(self.get_profile('not-a-jwt').status_code, status.HTTP_401_UNAUTHORIZED)

    def test_expired_access_token_is_401(self):
        with override_settings(JWT_ACCESS_TTL_SECONDS=-30):
            pair = tokens.issue_token_pair(self.user)
        self.assertEqual(self.get_profile(pair['access']).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_signed_with_another_key_is_401(self):
        bad = jwt.encode(
            {'iss': settings.JWT_ISSUER, 'sub': str(self.user.user_id), 'typ': 'access', 'jti': 'x',
             'iat': timezone.now(), 'exp': timezone.now() + timedelta(minutes=5)},
            'some-other-key-that-is-long-enough-for-hs256', algorithm='HS256',
        )
        self.assertEqual(self.get_profile(bad).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unsigned_alg_none_token_is_401(self):
        now = timezone.now()
        unsigned = jwt.encode(
            {'iss': settings.JWT_ISSUER, 'sub': str(self.user.user_id), 'typ': 'access', 'jti': 'x',
             'iat': now, 'exp': now + timedelta(minutes=5)},
            None, algorithm='none',
        )
        self.assertEqual(self.get_profile(unsigned).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_wrong_issuer_is_401(self):
        self.assertEqual(self.get_profile(self.forge(iss='someone-else')).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_token_cannot_be_used_as_access_token(self):
        pair = tokens.issue_token_pair(self.user)
        self.assertEqual(self.get_profile(pair['refresh']).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_missing_required_claim_is_401(self):
        now = timezone.now()
        no_jti = jwt.encode(
            {'iss': settings.JWT_ISSUER, 'sub': str(self.user.user_id), 'typ': 'access',
             'iat': now, 'exp': now + timedelta(minutes=5)},
            settings.JWT_SIGNING_KEY, algorithm='HS256',
        )
        self.assertEqual(self.get_profile(no_jti).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_inactive_user_is_401(self):
        pair = tokens.issue_token_pair(self.user)
        self.user.is_active = False
        self.user.save()
        self.assertEqual(self.get_profile(pair['access']).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_deleted_user_is_401(self):
        pair = tokens.issue_token_pair(self.user)
        self.user.delete()
        self.assertEqual(self.get_profile(pair['access']).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_is_not_provisioned_into_a_user(self):
        # The old Cognito class created users from a valid token. Ours only accepts known users.
        ghost = self.forge(sub='00000000-0000-0000-0000-000000000000')
        before = User.objects.count()
        self.assertEqual(self.get_profile(ghost).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(User.objects.count(), before)

    def test_user_model_has_no_cognito_sub(self):
        self.assertFalse(hasattr(User, 'cognito_sub'))


class RefreshTokenTests(TokenTestBase):
    url = '/api/auth/token/refresh/'

    def refresh(self, token):
        return self.client.post(self.url, {'refresh': token}, format='json')

    def test_refresh_returns_a_working_new_pair(self):
        pair = tokens.issue_token_pair(self.user)
        resp = self.refresh(pair['refresh'])
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(self.get_profile(resp.data['access']).status_code, status.HTTP_200_OK)
        self.assertNotEqual(resp.data['refresh'], pair['refresh'])

    def test_refresh_token_is_single_use(self):
        pair = tokens.issue_token_pair(self.user)
        self.assertEqual(self.refresh(pair['refresh']).status_code, status.HTTP_200_OK)
        self.assertEqual(self.refresh(pair['refresh']).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_reusing_a_rotated_token_revokes_the_whole_family(self):
        first = tokens.issue_token_pair(self.user)
        second = self.refresh(first['refresh']).data
        self.assertEqual(self.refresh(first['refresh']).status_code, status.HTTP_401_UNAUTHORIZED)
        # The thief replayed the old token, so the legitimate newer one is dead as well.
        self.assertEqual(self.refresh(second['refresh']).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(RefreshToken.objects.filter(user=self.user, revoked_at__isnull=True).exists())

    def test_other_sessions_survive_reuse_in_one_family(self):
        phone = tokens.issue_token_pair(self.user)
        laptop = tokens.issue_token_pair(self.user)
        self.refresh(phone['refresh'])
        self.refresh(phone['refresh'])  # replay, kills the phone family only
        self.assertEqual(self.refresh(laptop['refresh']).status_code, status.HTTP_200_OK)

    def test_access_token_is_rejected_as_refresh(self):
        pair = tokens.issue_token_pair(self.user)
        self.assertEqual(self.refresh(pair['access']).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_garbage_and_missing_refresh_are_401(self):
        self.assertEqual(self.refresh('nope').status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.post(self.url, {}, format='json').status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.post(self.url, {'refresh': 123}, format='json').status_code, status.HTTP_401_UNAUTHORIZED)

    def test_expired_refresh_token_is_401(self):
        with override_settings(JWT_REFRESH_TTL_SECONDS=-30):
            pair = tokens.issue_token_pair(self.user)
        self.assertEqual(self.refresh(pair['refresh']).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_validly_signed_refresh_without_server_record_is_401(self):
        self.assertEqual(self.refresh(self.forge('refresh')).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_inactive_user_cannot_refresh(self):
        pair = tokens.issue_token_pair(self.user)
        self.user.is_active = False
        self.user.save()
        self.assertEqual(self.refresh(pair['refresh']).status_code, status.HTTP_401_UNAUTHORIZED)


class LogoutAndDeleteTests(TokenTestBase):
    def test_logout_revokes_the_refresh_token(self):
        pair = tokens.issue_token_pair(self.user)
        resp = self.client.post('/api/auth/logout/', {'refresh': pair['refresh']}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        again = self.client.post('/api/auth/token/refresh/', {'refresh': pair['refresh']}, format='json')
        self.assertEqual(again.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_with_garbage_is_a_quiet_204(self):
        for body in ({'refresh': 'garbage'}, {}, {'refresh': 5}):
            resp = self.client.post('/api/auth/logout/', body, format='json')
            self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_account_removes_user_without_any_aws_call(self):
        pair = tokens.issue_token_pair(self.user)
        with patch('boto3.client') as boto_client:
            resp = self.client.delete(reverse('account-delete'), HTTP_AUTHORIZATION=f"Bearer {pair['access']}")
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        boto_client.assert_not_called()
        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())
        self.assertFalse(RefreshToken.objects.filter(jti__isnull=False).exists())

    def test_delete_account_requires_authentication(self):
        self.assertEqual(self.client.delete(reverse('account-delete')).status_code, status.HTTP_401_UNAUTHORIZED)
