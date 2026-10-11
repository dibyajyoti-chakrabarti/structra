"""Email OTP login: issue, send, verify, expiry, attempt limits and throttling."""
import re
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import RequestFactory, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AuthAttempt, EmailLoginCode
from accounts.services import throttle

User = get_user_model()

REQUEST_URL = '/api/auth/otp/request/'
VERIFY_URL = '/api/auth/otp/verify/'


class OTPTestBase(APITestCase):
    def request_code(self, email='new@example.com', **extra):
        return self.client.post(REQUEST_URL, {'email': email}, format='json', **extra)

    def verify(self, email, code, **extra):
        body = {'email': email, 'code': code}
        body.update(extra.pop('body', {}))
        return self.client.post(VERIFY_URL, body, format='json', **extra)

    def issue(self, email='new@example.com', **extra):
        """Request a code and return it, read from the email like a user would."""
        mail.outbox.clear()
        resp = self.request_code(email, **extra)
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        return re.search(r'\b(\d{6})\b', mail.outbox[-1].body).group(1)

    def wrong_code(self, real):
        return '000000' if real != '000000' else '111111'


class OTPRequestTests(OTPTestBase):
    def test_sends_an_email_with_a_six_digit_code(self):
        resp = self.request_code('Person@Example.com ')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertEqual(message.to, ['person@example.com'])
        self.assertEqual(message.subject, 'Your Structra login code')
        self.assertRegex(message.body, r'\b\d{6}\b')
        html, mimetype = message.alternatives[0]
        self.assertEqual(mimetype, 'text/html')
        self.assertIn(re.search(r'\b(\d{6})\b', message.body).group(1), html)

    def test_email_copy_has_no_dashes(self):
        self.request_code()
        message = mail.outbox[0]
        for text in (message.subject, message.body, message.alternatives[0][0]):
            self.assertNotIn('—', text)
            self.assertNotIn('–', text)
            self.assertNotIn('&mdash;', text)
            self.assertNotIn('&ndash;', text)

    def test_email_states_the_configured_expiry(self):
        self.request_code()
        self.assertIn('10 minutes', mail.outbox[0].body)
        self.assertIn('10&nbsp;minutes', mail.outbox[0].alternatives[0][0])

    @override_settings(EMAIL_LOGO_URL='https://app.test/logo.png')
    def test_logo_is_shown_only_when_configured(self):
        self.request_code()
        self.assertIn('https://app.test/logo.png', mail.outbox[0].alternatives[0][0])
        with override_settings(EMAIL_LOGO_URL=''):
            self.request_code('other@example.com')
        self.assertNotIn('<img', mail.outbox[1].alternatives[0][0])

    def test_code_is_stored_only_as_a_hash(self):
        code = self.issue()
        row = EmailLoginCode.objects.get()
        self.assertNotIn(code, row.code_hash)
        self.assertEqual(len(row.code_hash), 64)
        self.assertFalse(hasattr(row, 'code'))
        self.assertAlmostEqual((row.expires_at - row.created_at).total_seconds(), 600, delta=5)

    def test_invalid_emails_are_rejected(self):
        for value in ('', 'plain', 'a@', '@b.com', None, 123, ['a@b.com'], 'a' * 250 + '@b.com'):
            resp = self.client.post(REQUEST_URL, {'email': value}, format='json')
            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST, value)
        self.assertEqual(len(mail.outbox), 0)

    def test_response_does_not_reveal_whether_an_account_exists(self):
        User.objects.create_user(email='known@example.com', username='known', full_name='K')
        known = self.request_code('known@example.com')
        unknown = self.request_code('unknown@example.com')
        self.assertEqual(known.status_code, unknown.status_code)
        self.assertEqual(known.data, unknown.data)

    def test_a_new_code_invalidates_the_previous_one(self):
        with patch('accounts.services.otp.secrets') as fake_secrets:
            fake_secrets.randbelow.side_effect = [111111, 222222]
            first = self.issue()
            second = self.issue()
        self.assertEqual((first, second), ('111111', '222222'))
        self.assertEqual(self.verify('new@example.com', first).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.verify('new@example.com', second).status_code, status.HTTP_200_OK)

    def test_mail_failure_returns_503_and_leaves_no_usable_code(self):
        with patch('accounts.services.otp.EmailMultiAlternatives.send', side_effect=OSError('smtp down')):
            resp = self.request_code()
        self.assertEqual(resp.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertFalse(EmailLoginCode.objects.exists())


class OTPVerifyTests(OTPTestBase):
    def test_verify_creates_a_new_user_and_returns_working_tokens(self):
        code = self.issue('Fresh@Example.com')
        resp = self.verify('fresh@example.com', code, body={'full_name': '  Fresh Person '})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['user']['email'], 'fresh@example.com')
        self.assertEqual(resp.data['user']['full_name'], 'Fresh Person')
        self.assertEqual(User.objects.filter(email__iexact='fresh@example.com').count(), 1)
        profile = self.client.get('/api/auth/profile/', HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
        self.assertEqual(profile.status_code, status.HTTP_200_OK)

    def test_verify_signs_in_an_existing_account_case_insensitively(self):
        existing = User.objects.create_user(email='Mixed@Example.com', username='mixed', full_name='Mixed')
        code = self.issue('mixed@example.com')
        resp = self.verify('MIXED@example.com', code)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['user']['user_id'], str(existing.user_id))
        self.assertEqual(User.objects.count(), 1)

    def test_a_code_works_exactly_once(self):
        code = self.issue()
        self.assertEqual(self.verify('new@example.com', code).status_code, status.HTTP_200_OK)
        self.assertEqual(self.verify('new@example.com', code).status_code, status.HTTP_400_BAD_REQUEST)

    def test_wrong_code_is_rejected_and_counted(self):
        code = self.issue()
        resp = self.verify('new@example.com', self.wrong_code(code))
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(EmailLoginCode.objects.get().attempts, 1)
        self.assertEqual(self.verify('new@example.com', code).status_code, status.HTTP_200_OK)

    def test_code_is_burned_after_five_wrong_attempts(self):
        code = self.issue()
        for _ in range(5):
            self.assertEqual(self.verify('new@example.com', self.wrong_code(code)).status_code, 400)
        # The right code no longer works: the guess budget is spent.
        self.assertEqual(self.verify('new@example.com', code).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.exists())

    def test_four_wrong_attempts_leave_the_code_usable(self):
        code = self.issue()
        for _ in range(4):
            self.verify('new@example.com', self.wrong_code(code))
        self.assertEqual(self.verify('new@example.com', code).status_code, status.HTTP_200_OK)

    def test_expired_code_is_rejected(self):
        code = self.issue()
        EmailLoginCode.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.verify('new@example.com', code).status_code, status.HTTP_400_BAD_REQUEST)

    def test_a_code_hash_is_bound_to_its_email(self):
        with patch('accounts.services.otp.secrets') as fake_secrets:
            fake_secrets.randbelow.return_value = 123456
            self.issue('a@example.com')
        stolen_hash = EmailLoginCode.objects.get(email='a@example.com').code_hash
        # Even if a row for another address carried A's hash, A's code must not open it.
        EmailLoginCode.objects.create(
            email='b@example.com', code_hash=stolen_hash, expires_at=timezone.now() + timedelta(minutes=5),
        )
        self.assertEqual(self.verify('b@example.com', '123456').status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.verify('a@example.com', '123456').status_code, status.HTTP_200_OK)

    def test_verify_without_any_issued_code_is_rejected(self):
        self.assertEqual(self.verify('nobody@example.com', '123456').status_code, status.HTTP_400_BAD_REQUEST)

    def test_malformed_input_is_rejected_the_same_way(self):
        self.issue()
        for code in ('12345', '1234567', 'abcdef', '12 456', '', None, 123456, ['123456']):
            resp = self.verify('new@example.com', code)
            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST, code)
        self.assertEqual(self.verify('not-an-email', '123456').status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(EmailLoginCode.objects.get().attempts, 0)

    def test_failure_responses_are_identical_for_every_cause(self):
        code = self.issue()
        wrong = self.verify('new@example.com', self.wrong_code(code))
        unknown = self.verify('ghost@example.com', '123456')
        self.assertEqual(wrong.data, unknown.data)

    def test_full_name_is_ignored_for_existing_accounts(self):
        User.objects.create_user(email='keep@example.com', username='keep', full_name='Original')
        code = self.issue('keep@example.com')
        resp = self.verify('keep@example.com', code, body={'full_name': 'Hijacked'})
        self.assertEqual(resp.data['user']['full_name'], 'Original')

    def test_inactive_account_cannot_sign_in(self):
        User.objects.create_user(email='off@example.com', username='off', full_name='Off', is_active=False)
        code = self.issue('off@example.com')
        resp = self.verify('off@example.com', code)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertNotIn('access', resp.data)

    def test_verify_issues_a_refresh_token_that_rotates(self):
        code = self.issue()
        pair = self.verify('new@example.com', code).data
        resp = self.client.post('/api/auth/token/refresh/', {'refresh': pair['refresh']}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


class OTPThrottleTests(OTPTestBase):
    @override_settings(AUTH_OTP_REQUESTS_PER_EMAIL_PER_HOUR=3)
    def test_requests_are_limited_per_email(self):
        for _ in range(3):
            self.assertEqual(self.request_code('same@example.com').status_code, 200)
        resp = self.request_code('same@example.com')
        self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertGreater(int(resp['Retry-After']), 0)
        self.assertEqual(len(mail.outbox), 3)
        # Another address is unaffected, and the limit ignores email case.
        self.assertEqual(self.request_code('other@example.com').status_code, 200)
        self.assertEqual(self.request_code('SAME@example.com').status_code, 429)

    @override_settings(AUTH_OTP_REQUESTS_PER_IP_PER_HOUR=2)
    def test_requests_are_limited_per_ip(self):
        for i in range(2):
            self.assertEqual(self.request_code(f'u{i}@example.com', REMOTE_ADDR='10.1.1.1').status_code, 200)
        self.assertEqual(self.request_code('u9@example.com', REMOTE_ADDR='10.1.1.1').status_code, 429)
        self.assertEqual(self.request_code('u9@example.com', REMOTE_ADDR='10.2.2.2').status_code, 200)

    @override_settings(AUTH_OTP_REQUESTS_PER_EMAIL_PER_HOUR=1)
    def test_old_requests_fall_out_of_the_window(self):
        self.assertEqual(self.request_code().status_code, 200)
        self.assertEqual(self.request_code().status_code, 429)
        AuthAttempt.objects.update(created_at=timezone.now() - timedelta(hours=1, seconds=5))
        self.assertEqual(self.request_code().status_code, 200)

    @override_settings(AUTH_OTP_FAILURES_PER_EMAIL_PER_HOUR=3, AUTH_OTP_MAX_ATTEMPTS=50)
    def test_failed_verifications_are_limited_per_email(self):
        code = self.issue()
        for _ in range(3):
            self.assertEqual(self.verify('new@example.com', self.wrong_code(code)).status_code, 400)
        # Locked out: even the correct code is refused until the window passes.
        resp = self.verify('new@example.com', code)
        self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn('Retry-After', resp)

    @override_settings(AUTH_OTP_FAILURES_PER_IP_PER_HOUR=2, AUTH_OTP_MAX_ATTEMPTS=50)
    def test_failed_verifications_are_limited_per_ip_across_emails(self):
        for i in range(2):
            self.verify(f'v{i}@example.com', '123456', REMOTE_ADDR='10.3.3.3')
        resp = self.verify('v9@example.com', '123456', REMOTE_ADDR='10.3.3.3')
        self.assertEqual(resp.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(self.verify('v9@example.com', '123456', REMOTE_ADDR='10.4.4.4').status_code, 400)

    def test_successful_verification_does_not_count_as_a_failure(self):
        for _ in range(3):
            code = self.issue()
            self.assertEqual(self.verify('new@example.com', code).status_code, 200)
        self.assertFalse(AuthAttempt.objects.filter(kind=throttle.OTP_FAILURE).exists())


class ClientIpTests(APITestCase):
    def _ip(self, header, proxies):
        request = RequestFactory().get('/', HTTP_X_FORWARDED_FOR=header, REMOTE_ADDR='9.9.9.9')
        with override_settings(AUTH_TRUSTED_PROXY_COUNT=proxies):
            return throttle.client_ip(request)

    def test_forwarded_header_is_ignored_without_trusted_proxies(self):
        self.assertEqual(self._ip('6.6.6.6', 0), '9.9.9.9')

    def test_one_trusted_proxy_uses_the_rightmost_entry(self):
        # The client can prepend anything, only the entry the proxy appended is trustworthy.
        self.assertEqual(self._ip('6.6.6.6, 1.2.3.4', 1), '1.2.3.4')

    def test_two_trusted_proxies_use_the_second_from_right(self):
        self.assertEqual(self._ip('6.6.6.6, 1.2.3.4, 10.0.0.1', 2), '1.2.3.4')

    def test_short_header_falls_back_to_the_socket_address(self):
        self.assertEqual(self._ip('1.2.3.4', 2), '9.9.9.9')
