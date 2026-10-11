"""Google and GitHub login: start, callback and ticket exchange."""
import hashlib
import logging
import secrets
from datetime import timedelta
from urllib.parse import urlencode

from django.conf import settings
from django.core import signing
from django.db import transaction
from django.http import HttpResponseRedirect
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response

from .auth_common import PublicAuthView, session_response
from .models import AuthTicket
from .services import oauth

logger = logging.getLogger(__name__)

STATE_COOKIE = 'structra_oauth'
STATE_COOKIE_PATH = '/api/auth/oauth/'
STATE_SALT = 'structra.oauth.state'


def _hash_ticket(raw):
    return hashlib.sha256(raw.encode()).hexdigest()


def _frontend_callback(**params):
    return f'{settings.FRONTEND_BASE_URL}/auth/callback?{urlencode(params)}'


def _redirect_clearing_state(url):
    response = HttpResponseRedirect(url)
    response.delete_cookie(STATE_COOKIE, path=STATE_COOKIE_PATH, samesite='Lax')
    return response


class OAuthStartView(PublicAuthView):
    def get(self, request, provider):
        try:
            oauth.credentials(provider)
        except oauth.OAuthError as exc:
            return HttpResponseRedirect(_frontend_callback(error=exc.code))

        nonce = secrets.token_urlsafe(24)
        verifier, challenge = oauth.new_pkce_pair()
        response = HttpResponseRedirect(oauth.authorization_url(provider, nonce, challenge))
        # The nonce also travels in the provider round trip as `state`. The callback only
        # proceeds when both match, which ties it to the browser that started the login.
        response.set_cookie(
            STATE_COOKIE,
            signing.dumps({'n': nonce, 'v': verifier, 'p': provider}, salt=STATE_SALT),
            max_age=settings.OAUTH_STATE_TTL_SECONDS,
            path=STATE_COOKIE_PATH,
            secure=request.is_secure(),
            httponly=True,
            samesite='Lax',
        )
        return response


class OAuthCallbackView(PublicAuthView):
    def get(self, request, provider):
        try:
            if provider not in oauth.PROVIDERS:
                raise oauth.OAuthError('unknown_provider')
            if request.query_params.get('error'):
                raise oauth.OAuthError('access_denied')

            try:
                saved = signing.loads(
                    request.COOKIES.get(STATE_COOKIE, ''),
                    salt=STATE_SALT,
                    max_age=settings.OAUTH_STATE_TTL_SECONDS,
                )
            except signing.BadSignature:
                raise oauth.OAuthError('invalid_state')
            state = request.query_params.get('state') or ''
            if saved.get('p') != provider or not secrets.compare_digest(saved.get('n', ''), state):
                raise oauth.OAuthError('invalid_state')

            code = request.query_params.get('code')
            if not code:
                raise oauth.OAuthError('exchange_failed')

            profile = oauth.fetch_profile(provider, code, saved['v'])
            user = oauth.resolve_user(provider, profile)

            raw = secrets.token_urlsafe(32)
            AuthTicket.objects.create(
                code_hash=_hash_ticket(raw),
                user=user,
                expires_at=timezone.now() + timedelta(seconds=settings.OAUTH_TICKET_TTL_SECONDS),
            )
            return _redirect_clearing_state(_frontend_callback(code=raw))
        except oauth.OAuthError as exc:
            logger.info('OAuth login failed provider=%s reason=%s', provider, exc.code)
            return _redirect_clearing_state(_frontend_callback(error=exc.code))


class OAuthExchangeView(PublicAuthView):
    def post(self, request):
        raw = request.data.get('code')
        if not isinstance(raw, str) or not raw:
            return Response({'detail': 'Invalid or expired code.'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        with transaction.atomic():
            ticket = (
                AuthTicket.objects.select_for_update()
                .select_related('user')
                .filter(code_hash=_hash_ticket(raw), consumed_at__isnull=True, expires_at__gt=now)
                .first()
            )
            if ticket is None:
                return Response({'detail': 'Invalid or expired code.'}, status=status.HTTP_400_BAD_REQUEST)
            ticket.consumed_at = now
            ticket.save(update_fields=['consumed_at'])
            user = ticket.user

        if not user.is_active:
            return Response({'detail': 'This account is disabled.'}, status=status.HTTP_403_FORBIDDEN)
        return session_response(user)
