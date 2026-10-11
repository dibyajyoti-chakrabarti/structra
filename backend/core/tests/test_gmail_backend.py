import base64
from email import message_from_bytes
from unittest import mock

from django.core.mail import EmailMultiAlternatives
from django.test import SimpleTestCase, override_settings

from core import mail
from core.mail import GmailAPIEmailBackend, GmailAPIError

CREDS = dict(GMAIL_CLIENT_ID='cid', GMAIL_CLIENT_SECRET='csecret', GMAIL_REFRESH_TOKEN='rtoken')


def reply(status=200, payload=None, text=''):
    response = mock.Mock(status_code=status, text=text)
    response.json.return_value = payload or {}
    return response


def message():
    m = EmailMultiAlternatives('Your code', 'plain 123456', 'structra.support@gmail.com', ['user@example.com'])
    m.attach_alternative('<b>html 123456</b>', 'text/html')
    return m


@override_settings(**CREDS, EMAIL_TIMEOUT=7)
class GmailBackendTests(SimpleTestCase):
    def setUp(self):
        GmailAPIEmailBackend.reset_token_cache()
        self.addCleanup(GmailAPIEmailBackend.reset_token_cache)

    def test_exchanges_the_refresh_token_then_sends_the_message(self):
        with mock.patch.object(mail.requests, 'post', side_effect=[
            reply(payload={'access_token': 'tok', 'expires_in': 3600}),
            reply(payload={'id': 'm1'}),
        ]) as post:
            sent = GmailAPIEmailBackend().send_messages([message()])

        self.assertEqual(sent, 1)
        token_call, send_call = post.call_args_list
        self.assertEqual(token_call.args[0], mail.TOKEN_URL)
        self.assertEqual(token_call.kwargs['data']['refresh_token'], 'rtoken')
        self.assertEqual(token_call.kwargs['data']['grant_type'], 'refresh_token')
        self.assertEqual(send_call.args[0], mail.SEND_URL)
        self.assertEqual(send_call.kwargs['headers']['Authorization'], 'Bearer tok')
        self.assertEqual(send_call.kwargs['timeout'], 7)

        raw = base64.urlsafe_b64decode(send_call.kwargs['json']['raw'])
        parsed = message_from_bytes(raw)
        self.assertEqual(parsed['To'], 'user@example.com')
        self.assertEqual(parsed['Subject'], 'Your code')
        self.assertIn('text/html', {part.get_content_type() for part in parsed.walk()})

    def test_reuses_the_access_token_between_sends(self):
        with mock.patch.object(mail.requests, 'post', side_effect=[
            reply(payload={'access_token': 'tok', 'expires_in': 3600}),
            reply(), reply(),
        ]) as post:
            GmailAPIEmailBackend().send_messages([message()])
            GmailAPIEmailBackend().send_messages([message()])
        self.assertEqual(post.call_count, 3)

    def test_refetches_an_expired_token(self):
        with mock.patch.object(mail.requests, 'post', side_effect=[
            reply(payload={'access_token': 'old', 'expires_in': 1}),
            reply(),
            reply(payload={'access_token': 'new', 'expires_in': 3600}),
            reply(),
        ]) as post:
            GmailAPIEmailBackend().send_messages([message()])
            GmailAPIEmailBackend().send_messages([message()])
        self.assertEqual(post.call_args_list[3].kwargs['headers']['Authorization'], 'Bearer new')

    def test_retries_once_when_google_rejects_the_cached_token(self):
        with mock.patch.object(mail.requests, 'post', side_effect=[
            reply(payload={'access_token': 'stale', 'expires_in': 3600}),
            reply(status=401, text='expired'),
            reply(payload={'access_token': 'fresh', 'expires_in': 3600}),
            reply(),
        ]) as post:
            sent = GmailAPIEmailBackend().send_messages([message()])
        self.assertEqual(sent, 1)
        self.assertEqual(post.call_args_list[3].kwargs['headers']['Authorization'], 'Bearer fresh')

    def test_a_revoked_refresh_token_is_a_clear_error(self):
        with mock.patch.object(mail.requests, 'post', return_value=reply(status=400, text='{"error":"invalid_grant"}')):
            with self.assertRaisesRegex(GmailAPIError, 'invalid_grant'):
                GmailAPIEmailBackend().send_messages([message()])

    def test_a_failed_send_raises_unless_failing_silently(self):
        responses = lambda: [reply(payload={'access_token': 't', 'expires_in': 3600}), reply(status=403, text='quota')]
        with mock.patch.object(mail.requests, 'post', side_effect=responses()):
            with self.assertRaisesRegex(GmailAPIError, '403'):
                GmailAPIEmailBackend().send_messages([message()])
        GmailAPIEmailBackend.reset_token_cache()
        with mock.patch.object(mail.requests, 'post', side_effect=responses()):
            self.assertEqual(GmailAPIEmailBackend(fail_silently=True).send_messages([message()]), 0)

    def test_a_network_failure_propagates(self):
        with mock.patch.object(mail.requests, 'post', side_effect=mail.requests.ConnectionError('down')):
            with self.assertRaises(mail.requests.ConnectionError):
                GmailAPIEmailBackend().send_messages([message()])

    def test_skips_a_message_with_no_recipients(self):
        empty = EmailMultiAlternatives('s', 'b', 'a@example.com', [])
        with mock.patch.object(mail.requests, 'post') as post:
            self.assertEqual(GmailAPIEmailBackend().send_messages([empty]), 0)
        post.assert_not_called()

    @override_settings(GMAIL_REFRESH_TOKEN='')
    def test_missing_credentials_never_reach_the_network(self):
        with mock.patch.object(mail.requests, 'post') as post:
            with self.assertRaisesRegex(GmailAPIError, 'must all be set'):
                GmailAPIEmailBackend().send_messages([message()])
        post.assert_not_called()
