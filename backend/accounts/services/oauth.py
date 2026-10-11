"""Google and GitHub sign in through a backend driven authorization code flow.

The browser only ever sees provider redirects and one of our own single use
tickets. The provider secrets and the code exchange stay on the server.

Linking rule: a social identity is attached to an existing account only when
the provider vouches that the email address is verified. An unverified email
never links to anything and never creates an account.
"""
import base64
import hashlib
import logging
import secrets
from dataclasses import dataclass
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.db import IntegrityError, transaction

from ..models import User, UserIdentity

logger = logging.getLogger(__name__)

PROVIDERS = ('google', 'github')


class OAuthError(Exception):
    """A social login failed. `code` is a short slug that is safe to show the frontend."""

    def __init__(self, code):
        super().__init__(code)
        self.code = code


@dataclass
class Profile:
    subject: str
    email: str
    email_verified: bool
    name: str = ''
    avatar: str = ''


def credentials(provider):
    if provider not in PROVIDERS:
        raise OAuthError('unknown_provider')
    client_id = getattr(settings, f'OAUTH_{provider.upper()}_CLIENT_ID', '')
    client_secret = getattr(settings, f'OAUTH_{provider.upper()}_CLIENT_SECRET', '')
    if not client_id or not client_secret:
        raise OAuthError('provider_not_configured')
    return client_id, client_secret


def redirect_uri(provider):
    return f'{settings.API_PUBLIC_URL}/api/auth/oauth/{provider}/callback/'


def new_pkce_pair():
    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode()
    return verifier, challenge


def authorization_url(provider, state, code_challenge):
    client_id, _ = credentials(provider)
    params = {
        'client_id': client_id,
        'redirect_uri': redirect_uri(provider),
        'response_type': 'code',
        'state': state,
        'code_challenge': code_challenge,
        'code_challenge_method': 'S256',
    }
    if provider == 'google':
        params.update({'scope': 'openid email profile', 'prompt': 'select_account'})
        base = 'https://accounts.google.com/o/oauth2/v2/auth'
    else:
        params['scope'] = 'read:user user:email'
        base = 'https://github.com/login/oauth/authorize'
    return f'{base}?{urlencode(params)}'


def _post(url, **kwargs):
    return requests.post(url, timeout=settings.OAUTH_HTTP_TIMEOUT_SECONDS, **kwargs)


def _get(url, **kwargs):
    return requests.get(url, timeout=settings.OAUTH_HTTP_TIMEOUT_SECONDS, **kwargs)


def _json(response):
    if response.status_code != 200:
        raise OAuthError('provider_error')
    try:
        return response.json()
    except ValueError:
        raise OAuthError('provider_error')


def _exchange_code(provider, code, code_verifier):
    client_id, client_secret = credentials(provider)
    data = {
        'client_id': client_id,
        'client_secret': client_secret,
        'code': code,
        'redirect_uri': redirect_uri(provider),
        'code_verifier': code_verifier,
    }
    if provider == 'google':
        data['grant_type'] = 'authorization_code'
        url = 'https://oauth2.googleapis.com/token'
    else:
        url = 'https://github.com/login/oauth/access_token'
    try:
        body = _json(_post(url, data=data, headers={'Accept': 'application/json'}))
    except requests.RequestException as exc:
        logger.warning('OAuth token exchange failed for %s: %s', provider, exc)
        raise OAuthError('provider_error')
    token = body.get('access_token')
    if not token:
        # GitHub reports a bad code as HTTP 200 with an "error" field.
        raise OAuthError('exchange_failed')
    return token


def _google_profile(token):
    body = _json(_get('https://openidconnect.googleapis.com/v1/userinfo', headers={'Authorization': f'Bearer {token}'}))
    subject = body.get('sub')
    if not subject:
        raise OAuthError('provider_error')
    return Profile(
        subject=str(subject),
        email=(body.get('email') or '').strip().lower(),
        # Google sends a boolean, but some responses carry the string form. Compared with
        # `is` because 1 == True in Python, and only a real true may count as verified.
        email_verified=body.get('email_verified') is True or body.get('email_verified') == 'true',
        name=body.get('name') or '',
        avatar=body.get('picture') or '',
    )


def _github_profile(token):
    headers = {'Authorization': f'Bearer {token}', 'Accept': 'application/vnd.github+json'}
    user = _json(_get('https://api.github.com/user', headers=headers))
    subject = user.get('id')
    if subject is None:
        raise OAuthError('provider_error')
    emails = _json(_get('https://api.github.com/user/emails', headers=headers))
    # The profile "email" field is public and unverified, so it is ignored.
    primary = next(
        (e for e in emails if isinstance(e, dict) and e.get('primary') and e.get('verified') is True and e.get('email')),
        None,
    )
    return Profile(
        subject=str(subject),
        email=(primary['email'].strip().lower() if primary else ''),
        email_verified=primary is not None,
        name=user.get('name') or user.get('login') or '',
        avatar=user.get('avatar_url') or '',
    )


def fetch_profile(provider, code, code_verifier):
    token = _exchange_code(provider, code, code_verifier)
    try:
        return _google_profile(token) if provider == 'google' else _github_profile(token)
    except requests.RequestException as exc:
        logger.warning('OAuth profile fetch failed for %s: %s', provider, exc)
        raise OAuthError('provider_error')


def resolve_user(provider, profile):
    """Find, link or create the user for a social profile, following the linking rule."""
    try:
        return _resolve_user(provider, profile)
    except IntegrityError:
        # Two callbacks for the same new account raced. The loser retries and finds the winner's rows.
        return _resolve_user(provider, profile)


def _resolve_user(provider, profile):
    with transaction.atomic():
        identity = UserIdentity.objects.select_related('user').filter(provider=provider, subject=profile.subject).first()
        if identity:
            if not identity.user.is_active:
                raise OAuthError('account_disabled')
            return identity.user

        if not profile.email or not profile.email_verified:
            raise OAuthError('email_not_verified')

        user = User.objects.filter(email__iexact=profile.email).first()
        if user:
            if not user.is_active:
                raise OAuthError('account_disabled')
            if UserIdentity.objects.filter(user=user, provider=provider).exists():
                # The account already has a different login from this provider. A matching
                # email alone is not enough to attach a second one (recycled address, takeover).
                raise OAuthError('identity_conflict')
        else:
            user = User.objects.create_user(
                email=profile.email,
                full_name=profile.name,
                avatar_url=(profile.avatar or None) if len(profile.avatar) <= 500 else None,
            )

        UserIdentity.objects.create(user=user, provider=provider, subject=profile.subject, email=profile.email)
        return user
