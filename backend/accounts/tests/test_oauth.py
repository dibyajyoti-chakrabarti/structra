"""Google and GitHub login through the backend driven code flow, and account linking rules.

The provider HTTP calls are mocked at accounts.services.oauth._post and ._get.
"""
import base64
import hashlib
from datetime import timedelta
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

import requests
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import AuthTicket, UserIdentity

User = get_user_model()

FRONTEND = 'https://app.test'
OAUTH_SETTINGS = dict(
    API_PUBLIC_URL='https://api.test',
    FRONTEND_BASE_URL=FRONTEND,
    OAUTH_GOOGLE_CLIENT_ID='google-id',
    OAUTH_GOOGLE_CLIENT_SECRET='google-secret',
    OAUTH_GITHUB_CLIENT_ID='github-id',
    OAUTH_GITHUB_CLIENT_SECRET='github-secret',
)


class FakeResponse:
    def __init__(self, data, status_code=200):
        self._data = data
        self.status_code = status_code

    def json(self):
        if isinstance(self._data, Exception):
            raise self._data
        return self._data


def google_userinfo(sub='g-1', email='person@example.com', verified=True, name='Person', **extra):
    body = {'sub': sub, 'email': email, 'name': name, 'picture': 'https://img.test/p.png'}
    if verified is not None:
        body['email_verified'] = verified
    body.update(extra)
    return body


def github_responses(user_id=4242, emails=None, public_email='public@example.com', login='octo'):
    if emails is None:
        emails = [{'email': 'person@example.com', 'primary': True, 'verified': True}]
    return {
        'https://api.github.com/user': FakeResponse(
            {'id': user_id, 'login': login, 'name': 'Octo Person', 'email': public_email, 'avatar_url': 'https://img.test/o.png'}
        ),
        'https://api.github.com/user/emails': FakeResponse(emails),
    }


@override_settings(**OAUTH_SETTINGS)
class OAuthTestBase(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.post_calls = []
        self.get_calls = []
        self.token_response = FakeResponse({'access_token': 'provider-token'})
        self.get_responses = {}

    def _fake_post(self, url, **kwargs):
        self.post_calls.append((url, kwargs))
        return self.token_response

    def _fake_get(self, url, **kwargs):
        self.get_calls.append((url, kwargs))
        return self.get_responses[url]

    def run_callback(self, provider, query=None, start=True):
        """Start a login (to get the state cookie) and hit the callback. Returns the callback response."""
        challenge = state = None
        if start:
            started = self.client.get(f'/api/auth/oauth/{provider}/start/')
            self.assertEqual(started.status_code, status.HTTP_302_FOUND)
            params = parse_qs(urlparse(started['Location']).query)
            state = params['state'][0]
            challenge = params['code_challenge'][0]
        self.challenge = challenge
        params = {'code': 'provider-code', 'state': state or 'x'}
        params.update(query or {})
        with patch('accounts.services.oauth._post', side_effect=self._fake_post), \
                patch('accounts.services.oauth._get', side_effect=self._fake_get):
            return self.client.get(f'/api/auth/oauth/{provider}/callback/', params)

    def login_google(self, **userinfo):
        self.get_responses = {'https://openidconnect.googleapis.com/v1/userinfo': FakeResponse(google_userinfo(**userinfo))}
        return self.run_callback('google')

    def login_github(self, **kwargs):
        self.get_responses = github_responses(**kwargs)
        return self.run_callback('github')

    @staticmethod
    def location(response):
        parsed = urlparse(response['Location'])
        return parsed, {k: v[0] for k, v in parse_qs(parsed.query).items()}

    def assert_error(self, response, code):
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        parsed, query = self.location(response)
        self.assertEqual(f'{parsed.scheme}://{parsed.netloc}{parsed.path}', f'{FRONTEND}/auth/callback')
        self.assertEqual(query, {'error': code})

    def assert_ticket(self, response):
        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        parsed, query = self.location(response)
        self.assertEqual(f'{parsed.scheme}://{parsed.netloc}{parsed.path}', f'{FRONTEND}/auth/callback')
        self.assertEqual(list(query), ['code'])
        return query['code']

    def exchange(self, code):
        return self.client.post('/api/auth/oauth/exchange/', {'code': code}, format='json')


class OAuthStartTests(OAuthTestBase):
    def test_google_start_redirects_with_pkce_and_state(self):
        resp = self.client.get('/api/auth/oauth/google/start/')
        self.assertEqual(resp.status_code, status.HTTP_302_FOUND)
        parsed = urlparse(resp['Location'])
        self.assertEqual(f'{parsed.scheme}://{parsed.netloc}{parsed.path}', 'https://accounts.google.com/o/oauth2/v2/auth')
        params = {k: v[0] for k, v in parse_qs(parsed.query).items()}
        self.assertEqual(params['client_id'], 'google-id')
        self.assertEqual(params['redirect_uri'], 'https://api.test/api/auth/oauth/google/callback/')
        self.assertEqual(params['response_type'], 'code')
        self.assertEqual(params['code_challenge_method'], 'S256')
        self.assertIn('email', params['scope'])
        self.assertGreaterEqual(len(params['state']), 20)
        self.assertNotIn('google-secret', resp['Location'])

    def test_github_start_asks_for_email_scope(self):
        resp = self.client.get('/api/auth/oauth/github/start/')
        parsed = urlparse(resp['Location'])
        self.assertEqual(parsed.netloc, 'github.com')
        self.assertIn('user:email', parse_qs(parsed.query)['scope'][0])

    def test_state_cookie_is_httponly_lax_and_scoped(self):
        resp = self.client.get('/api/auth/oauth/google/start/')
        cookie = resp.cookies['structra_oauth']
        self.assertTrue(cookie['httponly'])
        self.assertEqual(cookie['samesite'], 'Lax')
        self.assertEqual(cookie['path'], '/api/auth/oauth/')
        self.assertGreater(int(cookie['max-age']), 0)

    def test_each_start_gets_a_fresh_state(self):
        first = parse_qs(urlparse(self.client.get('/api/auth/oauth/google/start/')['Location']).query)['state']
        second = parse_qs(urlparse(self.client.get('/api/auth/oauth/google/start/')['Location']).query)['state']
        self.assertNotEqual(first, second)

    @override_settings(OAUTH_GOOGLE_CLIENT_ID='', OAUTH_GOOGLE_CLIENT_SECRET='')
    def test_unconfigured_provider_sends_the_user_back_with_an_error(self):
        self.assert_error(self.client.get('/api/auth/oauth/google/start/'), 'provider_not_configured')

    def test_unknown_provider_is_an_error_redirect(self):
        self.assert_error(self.client.get('/api/auth/oauth/facebook/start/'), 'unknown_provider')
        self.assert_error(self.client.get('/api/auth/oauth/facebook/callback/', {'code': 'c', 'state': 's'}), 'unknown_provider')


class OAuthCallbackSecurityTests(OAuthTestBase):
    def test_callback_without_the_state_cookie_is_rejected_before_any_provider_call(self):
        resp = self.run_callback('google', start=False)
        self.assert_error(resp, 'invalid_state')
        self.assertEqual(self.post_calls, [])

    def test_state_mismatch_is_rejected(self):
        resp = self.run_callback('google', query={'state': 'attacker-chosen-state'})
        self.assert_error(resp, 'invalid_state')
        self.assertEqual(self.post_calls, [])
        self.assertFalse(User.objects.exists())

    def test_missing_state_param_is_rejected(self):
        resp = self.run_callback('google', query={'state': ''})
        self.assert_error(resp, 'invalid_state')

    def test_cookie_started_for_one_provider_cannot_complete_another(self):
        started = self.client.get('/api/auth/oauth/google/start/')
        state = parse_qs(urlparse(started['Location']).query)['state'][0]
        with patch('accounts.services.oauth._post', side_effect=self._fake_post):
            resp = self.client.get('/api/auth/oauth/github/callback/', {'code': 'c', 'state': state})
        self.assert_error(resp, 'invalid_state')
        self.assertEqual(self.post_calls, [])

    def test_tampered_state_cookie_is_rejected(self):
        started = self.client.get('/api/auth/oauth/google/start/')
        state = parse_qs(urlparse(started['Location']).query)['state'][0]
        self.client.cookies['structra_oauth'] = started.cookies['structra_oauth'].value[:-3] + 'abc'
        resp = self.client.get('/api/auth/oauth/google/callback/', {'code': 'c', 'state': state})
        self.assert_error(resp, 'invalid_state')

    def test_expired_state_cookie_is_rejected(self):
        started = self.client.get('/api/auth/oauth/google/start/')
        state = parse_qs(urlparse(started['Location']).query)['state'][0]
        with override_settings(OAUTH_STATE_TTL_SECONDS=-1):
            resp = self.client.get('/api/auth/oauth/google/callback/', {'code': 'c', 'state': state})
        self.assert_error(resp, 'invalid_state')

    def test_provider_denial_is_reported_as_access_denied(self):
        resp = self.run_callback('google', query={'error': 'access_denied'})
        self.assert_error(resp, 'access_denied')

    def test_missing_code_is_an_exchange_failure(self):
        self.get_responses = {}
        started = self.client.get('/api/auth/oauth/google/start/')
        state = parse_qs(urlparse(started['Location']).query)['state'][0]
        resp = self.client.get('/api/auth/oauth/google/callback/', {'state': state})
        self.assert_error(resp, 'exchange_failed')

    def test_state_cookie_is_cleared_after_use(self):
        resp = self.login_google()
        self.assertEqual(resp.cookies['structra_oauth'].value, '')

    def test_state_cannot_be_replayed(self):
        first = self.login_google()
        self.assert_ticket(first)
        # The cookie was cleared by the browser, so a second callback with the same state fails.
        self.client.cookies.pop('structra_oauth', None)
        with patch('accounts.services.oauth._post', side_effect=self._fake_post):
            replay = self.client.get('/api/auth/oauth/google/callback/', {'code': 'c', 'state': 'old'})
        self.assert_error(replay, 'invalid_state')

    def test_pkce_verifier_sent_to_the_provider_matches_the_challenge(self):
        self.login_google()
        _, sent = self.post_calls[0]
        digest = hashlib.sha256(sent['data']['code_verifier'].encode()).digest()
        self.assertEqual(base64.urlsafe_b64encode(digest).rstrip(b'=').decode(), self.challenge)
        self.assertEqual(sent['data']['client_secret'], 'google-secret')
        self.assertEqual(sent['data']['redirect_uri'], 'https://api.test/api/auth/oauth/google/callback/')

    def test_redirect_target_is_never_taken_from_the_request(self):
        self.get_responses = {'https://openidconnect.googleapis.com/v1/userinfo': FakeResponse(google_userinfo())}
        resp = self.run_callback('google', query={'next': 'https://evil.test', 'redirect': 'https://evil.test'})
        self.assertTrue(resp['Location'].startswith(f'{FRONTEND}/auth/callback?'))
        self.assertNotIn('evil.test', resp['Location'])


class GoogleLoginTests(OAuthTestBase):
    def test_new_user_is_created_and_can_exchange_the_ticket_for_tokens(self):
        code = self.assert_ticket(self.login_google(sub='g-new', email='Brand.New@Example.com', name='Brand New'))
        user = User.objects.get(email='brand.new@example.com')
        self.assertEqual(user.full_name, 'Brand New')
        self.assertEqual(user.avatar_url, 'https://img.test/p.png')
        identity = UserIdentity.objects.get(user=user)
        self.assertEqual((identity.provider, identity.subject), ('google', 'g-new'))

        resp = self.exchange(code)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['user']['email'], 'brand.new@example.com')
        profile = self.client.get('/api/auth/profile/', HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
        self.assertEqual(profile.status_code, status.HTTP_200_OK)

    def test_tokens_never_appear_in_the_redirect_url(self):
        resp = self.login_google()
        self.assertNotIn('access', resp['Location'])
        self.assertNotIn('eyJ', resp['Location'])

    def test_verified_email_links_to_an_existing_account(self):
        existing = User.objects.create_user(email='Person@Example.com', username='person', full_name='Original Name')
        self.assert_ticket(self.login_google(sub='g-1', email='person@example.com', name='Different Name'))
        self.assertEqual(User.objects.count(), 1)
        self.assertTrue(UserIdentity.objects.filter(user=existing, provider='google', subject='g-1').exists())
        existing.refresh_from_db()
        self.assertEqual(existing.full_name, 'Original Name')

    def test_unverified_email_never_links_to_an_existing_account(self):
        victim = User.objects.create_user(email='person@example.com', username='victim', full_name='Victim')
        resp = self.login_google(sub='attacker', email='person@example.com', verified=False)
        self.assert_error(resp, 'email_not_verified')
        self.assertFalse(UserIdentity.objects.exists())
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(AuthTicket.objects.count(), 0)
        self.assertTrue(User.objects.filter(pk=victim.pk).exists())

    def test_unverified_email_never_creates_an_account(self):
        self.assert_error(self.login_google(email='new@example.com', verified=False), 'email_not_verified')
        self.assertFalse(User.objects.exists())

    def test_missing_email_verified_flag_counts_as_unverified(self):
        User.objects.create_user(email='person@example.com', username='victim', full_name='V')
        self.assert_error(self.login_google(verified=None), 'email_not_verified')
        self.assertFalse(UserIdentity.objects.exists())

    def test_email_verified_as_string_true_is_accepted_and_string_false_is_not(self):
        self.assert_ticket(self.login_google(sub='s1', email='a@example.com', verified='true'))
        self.assert_error(self.login_google(sub='s2', email='b@example.com', verified='false'), 'email_not_verified')
        self.assertFalse(User.objects.filter(email='b@example.com').exists())

    def test_non_boolean_truthy_verified_values_do_not_count(self):
        for value in ('yes', 1, 'True', 'TRUE', ['true']):
            self.assert_error(self.login_google(sub='s', email='c@example.com', verified=value), 'email_not_verified')

    def test_missing_email_is_rejected(self):
        self.assert_error(self.login_google(email=''), 'email_not_verified')
        self.assertFalse(User.objects.exists())

    def test_returning_identity_logs_in_the_same_user_even_if_the_email_changed(self):
        self.assert_ticket(self.login_google(sub='g-1', email='old@example.com'))
        user = User.objects.get()
        self.assert_ticket(self.login_google(sub='g-1', email='renamed@example.com'))
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(UserIdentity.objects.get().user, user)

    def test_second_identity_from_the_same_provider_is_refused(self):
        existing = User.objects.create_user(email='person@example.com', username='person', full_name='P')
        UserIdentity.objects.create(user=existing, provider='google', subject='g-original', email='person@example.com')
        resp = self.login_google(sub='g-other', email='person@example.com')
        self.assert_error(resp, 'identity_conflict')
        self.assertEqual(UserIdentity.objects.filter(user=existing).count(), 1)

    def test_inactive_account_is_refused_by_email_link_and_by_identity(self):
        off = User.objects.create_user(email='off@example.com', username='off', full_name='Off', is_active=False)
        self.assert_error(self.login_google(sub='g-a', email='off@example.com'), 'account_disabled')
        self.assertFalse(UserIdentity.objects.exists())
        UserIdentity.objects.create(user=off, provider='google', subject='g-b', email='off@example.com')
        self.assert_error(self.login_google(sub='g-b', email='off@example.com'), 'account_disabled')

    def test_oversized_avatar_url_is_dropped(self):
        self.assert_ticket(self.login_google(picture='https://img.test/' + 'a' * 600))
        self.assertIsNone(User.objects.get().avatar_url)

    def test_token_endpoint_failure_is_a_provider_error(self):
        self.token_response = FakeResponse({}, status_code=500)
        self.get_responses = {}
        self.assert_error(self.run_callback('google'), 'provider_error')

    def test_network_error_to_the_provider_is_a_provider_error(self):
        self.get_responses = {}
        started = self.client.get('/api/auth/oauth/google/start/')
        state = parse_qs(urlparse(started['Location']).query)['state'][0]
        with patch('accounts.services.oauth._post', side_effect=requests.ConnectionError('boom')):
            resp = self.client.get('/api/auth/oauth/google/callback/', {'code': 'c', 'state': state})
        self.assert_error(resp, 'provider_error')

    def test_userinfo_network_error_is_a_provider_error(self):
        started = self.client.get('/api/auth/oauth/google/start/')
        state = parse_qs(urlparse(started['Location']).query)['state'][0]
        with patch('accounts.services.oauth._post', side_effect=self._fake_post), \
                patch('accounts.services.oauth._get', side_effect=requests.Timeout('slow')):
            resp = self.client.get('/api/auth/oauth/google/callback/', {'code': 'c', 'state': state})
        self.assert_error(resp, 'provider_error')

    def test_non_json_provider_reply_is_a_provider_error(self):
        self.token_response = FakeResponse(ValueError('not json'))
        self.get_responses = {}
        self.assert_error(self.run_callback('google'), 'provider_error')


class GitHubLoginTests(OAuthTestBase):
    def test_new_user_from_the_verified_primary_email(self):
        self.assert_ticket(self.login_github())
        user = User.objects.get()
        self.assertEqual(user.email, 'person@example.com')
        self.assertEqual(user.full_name, 'Octo Person')
        identity = UserIdentity.objects.get()
        self.assertEqual((identity.provider, identity.subject), ('github', '4242'))

    def test_identity_is_keyed_on_the_numeric_id_not_the_login(self):
        self.assert_ticket(self.login_github(login='old-name'))
        self.assert_ticket(self.login_github(login='new-name'))
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(UserIdentity.objects.count(), 1)

    def test_verified_primary_email_links_to_an_existing_account(self):
        existing = User.objects.create_user(email='person@example.com', username='person', full_name='P')
        self.assert_ticket(self.login_github())
        self.assertEqual(User.objects.count(), 1)
        self.assertTrue(UserIdentity.objects.filter(user=existing, provider='github').exists())

    def test_unverified_primary_email_never_links(self):
        User.objects.create_user(email='person@example.com', username='victim', full_name='V')
        emails = [{'email': 'person@example.com', 'primary': True, 'verified': False}]
        self.assert_error(self.login_github(emails=emails), 'email_not_verified')
        self.assertFalse(UserIdentity.objects.exists())
        self.assertEqual(User.objects.count(), 1)

    def test_public_profile_email_is_ignored(self):
        # The "email" on /user is whatever the user typed. Only /user/emails carries verification.
        User.objects.create_user(email='victim@example.com', username='victim', full_name='V')
        self.assert_error(self.login_github(emails=[], public_email='victim@example.com'), 'email_not_verified')
        self.assertFalse(UserIdentity.objects.exists())

    def test_verified_but_not_primary_email_is_not_used(self):
        User.objects.create_user(email='person@example.com', username='victim', full_name='V')
        emails = [
            {'email': 'other@example.com', 'primary': True, 'verified': False},
            {'email': 'person@example.com', 'primary': False, 'verified': True},
        ]
        self.assert_error(self.login_github(emails=emails), 'email_not_verified')
        self.assertFalse(UserIdentity.objects.exists())

    def test_verified_flag_must_be_a_real_true(self):
        emails = [{'email': 'person@example.com', 'primary': True, 'verified': 'true'}]
        self.assert_error(self.login_github(emails=emails), 'email_not_verified')

    def test_primary_is_chosen_among_several_emails(self):
        emails = [
            {'email': 'first@example.com', 'primary': False, 'verified': True},
            {'email': 'Main@Example.com', 'primary': True, 'verified': True},
        ]
        self.assert_ticket(self.login_github(emails=emails))
        self.assertEqual(User.objects.get().email, 'main@example.com')

    def test_bad_code_reported_by_github_as_http_200_with_an_error_field(self):
        self.token_response = FakeResponse({'error': 'bad_verification_code'})
        self.get_responses = github_responses()
        self.assert_error(self.run_callback('github'), 'exchange_failed')
        self.assertFalse(User.objects.exists())

    def test_github_api_failure_is_a_provider_error(self):
        self.get_responses = github_responses()
        self.get_responses['https://api.github.com/user/emails'] = FakeResponse({}, status_code=403)
        self.assert_error(self.run_callback('github'), 'provider_error')

    def test_github_then_google_with_the_same_verified_email_share_one_account(self):
        self.assert_ticket(self.login_github())
        self.assert_ticket(self.login_google(sub='g-1', email='person@example.com'))
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(
            sorted(UserIdentity.objects.values_list('provider', flat=True)), ['github', 'google']
        )

    def test_otp_account_then_social_login_links_by_the_verified_email(self):
        otp_user = User.objects.create_user(email='person@example.com', full_name='')
        self.assert_ticket(self.login_google(sub='g-1', email='person@example.com'))
        self.assertEqual(UserIdentity.objects.get().user, otp_user)


class OAuthExchangeTests(OAuthTestBase):
    def ticket(self, **overrides):
        user = User.objects.create_user(email='t@example.com', username='ticketuser', full_name='T')
        raw = 'raw-ticket-value'
        fields = dict(
            code_hash=hashlib.sha256(raw.encode()).hexdigest(),
            user=user,
            expires_at=timezone.now() + timedelta(seconds=60),
        )
        fields.update(overrides)
        AuthTicket.objects.create(**fields)
        return raw, user

    def test_ticket_is_exchanged_once(self):
        raw, user = self.ticket()
        first = self.exchange(raw)
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(first.data['user']['user_id'], str(user.user_id))
        self.assertEqual(self.exchange(raw).status_code, status.HTTP_400_BAD_REQUEST)

    def test_expired_ticket_is_rejected(self):
        raw, _ = self.ticket(expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.exchange(raw).status_code, status.HTTP_400_BAD_REQUEST)

    def test_unknown_and_malformed_codes_are_rejected(self):
        for value in ('does-not-exist', '', None, 5, ['x']):
            self.assertEqual(self.exchange(value).status_code, status.HTTP_400_BAD_REQUEST, value)

    def test_tickets_are_stored_hashed(self):
        self.assert_ticket(self.login_google())
        self.assertEqual(len(AuthTicket.objects.get().code_hash), 64)

    def test_ticket_of_a_disabled_account_is_refused(self):
        raw, user = self.ticket()
        user.is_active = False
        user.save()
        resp = self.exchange(raw)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertNotIn('access', resp.data)

    def test_ticket_lifetime_is_short(self):
        self.assert_ticket(self.login_google())
        ticket = AuthTicket.objects.get()
        self.assertLessEqual((ticket.expires_at - ticket.created_at).total_seconds(), 61)
