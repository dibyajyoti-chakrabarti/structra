"""Email over HTTPS through the Gmail API.

Render's free tier blocks outbound SMTP ports, so Django's SMTP backend cannot reach Gmail
there. The Gmail API goes over port 443 and sends from the real account, which gives better
deliverability than a relay. It needs three values from a one time OAuth consent for the
sending account: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN.
"""
import base64
import logging
import threading
import time

import requests
from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

logger = logging.getLogger(__name__)

TOKEN_URL = 'https://oauth2.googleapis.com/token'
SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'
# Refresh a little early so a token never expires between the check and the send.
TOKEN_SKEW_SECONDS = 60


class GmailAPIError(Exception):
    pass


class GmailAPIEmailBackend(BaseEmailBackend):
    # The access token is shared by every connection in the process: it lasts about an hour
    # and each send would otherwise cost an extra round trip.
    _lock = threading.Lock()
    _token = ''
    _token_expires_at = 0.0

    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.timeout = getattr(settings, 'EMAIL_TIMEOUT', 10)

    @classmethod
    def reset_token_cache(cls):
        with cls._lock:
            cls._token = ''
            cls._token_expires_at = 0.0

    def _credentials(self):
        values = (
            settings.GMAIL_CLIENT_ID,
            settings.GMAIL_CLIENT_SECRET,
            settings.GMAIL_REFRESH_TOKEN,
        )
        if not all(values):
            raise GmailAPIError('GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN must all be set')
        return values

    def _access_token(self):
        cls = type(self)
        with cls._lock:
            if cls._token and time.monotonic() < cls._token_expires_at:
                return cls._token
            client_id, client_secret, refresh_token = self._credentials()
            response = requests.post(
                TOKEN_URL,
                data={
                    'client_id': client_id,
                    'client_secret': client_secret,
                    'refresh_token': refresh_token,
                    'grant_type': 'refresh_token',
                },
                timeout=self.timeout,
            )
            if response.status_code != 200:
                # The body names the reason (for example invalid_grant) and holds no secret.
                raise GmailAPIError(f'Google rejected the refresh token ({response.status_code}): {response.text[:300]}')
            payload = response.json()
            cls._token = payload['access_token']
            cls._token_expires_at = time.monotonic() + int(payload.get('expires_in', 3600)) - TOKEN_SKEW_SECONDS
            return cls._token

    def _send_one(self, message):
        raw = base64.urlsafe_b64encode(message.message().as_bytes()).decode('ascii')
        for attempt in (1, 2):
            response = requests.post(
                SEND_URL,
                headers={'Authorization': f'Bearer {self._access_token()}'},
                json={'raw': raw},
                timeout=self.timeout,
            )
            if response.status_code == 401 and attempt == 1:
                # The cached token was revoked or expired early, so fetch a new one once.
                self.reset_token_cache()
                continue
            if response.status_code != 200:
                raise GmailAPIError(f'Gmail API send failed ({response.status_code}): {response.text[:300]}')
            return

    def send_messages(self, email_messages):
        sent = 0
        for message in email_messages:
            if not message.recipients():
                continue
            try:
                self._send_one(message)
            except Exception:
                if not self.fail_silently:
                    raise
                logger.exception('Gmail API send failed')
            else:
                sent += 1
        return sent
