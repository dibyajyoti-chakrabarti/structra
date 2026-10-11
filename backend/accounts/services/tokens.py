"""Access and refresh JWTs issued by Structra itself.

Access tokens are short lived and stateless. Refresh tokens are also JWTs, but
every one is recorded in RefreshToken so it can rotate on use and be revoked.
Presenting a refresh token that was already rotated is treated as theft and
revokes the whole token family.
"""
import secrets
import uuid
from datetime import timedelta

import jwt
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from ..models import RefreshToken

ALGORITHM = 'HS256'
ACCESS = 'access'
REFRESH = 'refresh'


class TokenError(Exception):
    """The token is malformed, expired, revoked or otherwise unusable."""


def _encode(user, token_type, ttl_seconds, jti, now):
    claims = {
        'iss': settings.JWT_ISSUER,
        'sub': str(user.user_id),
        'typ': token_type,
        'jti': jti,
        'iat': now,
        'exp': now + timedelta(seconds=ttl_seconds),
    }
    return jwt.encode(claims, settings.JWT_SIGNING_KEY, algorithm=ALGORITHM)


def decode_token(token, expected_type):
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SIGNING_KEY,
            algorithms=[ALGORITHM],
            issuer=settings.JWT_ISSUER,
            options={'require': ['exp', 'iat', 'iss', 'sub', 'typ', 'jti']},
        )
    except jwt.InvalidTokenError as exc:
        raise TokenError(str(exc)) from exc
    if payload.get('typ') != expected_type:
        raise TokenError('Wrong token type')
    return payload


def issue_token_pair(user, family=None):
    now = timezone.now()
    jti = secrets.token_hex(16)
    family = family or uuid.uuid4().hex
    RefreshToken.objects.create(
        jti=jti,
        family=family,
        user=user,
        expires_at=now + timedelta(seconds=settings.JWT_REFRESH_TTL_SECONDS),
    )
    return {
        'access': _encode(user, ACCESS, settings.JWT_ACCESS_TTL_SECONDS, secrets.token_hex(16), now),
        'refresh': _encode(user, REFRESH, settings.JWT_REFRESH_TTL_SECONDS, jti, now),
        'token_type': 'Bearer',
        'expires_in': settings.JWT_ACCESS_TTL_SECONDS,
    }


def rotate_refresh_token(refresh_token):
    """Exchange a refresh token for a new pair. The presented token is revoked."""
    payload = decode_token(refresh_token, REFRESH)
    reused_family = None
    pair = None

    with transaction.atomic():
        record = (
            RefreshToken.objects.select_for_update()
            .select_related('user')
            .filter(jti=payload['jti'])
            .first()
        )
        if record is None or str(record.user_id) != payload['sub'] or record.expires_at <= timezone.now():
            raise TokenError('Unknown or expired refresh token')
        if record.revoked_at is not None:
            reused_family = record.family
        elif not record.user.is_active:
            raise TokenError('User is inactive')
        else:
            record.revoked_at = timezone.now()
            record.save(update_fields=['revoked_at'])
            pair = issue_token_pair(record.user, family=record.family)

    if reused_family:
        # Outside the atomic block on purpose: raising inside it would roll the revoke back.
        revoke_family(reused_family)
        raise TokenError('Refresh token reuse detected')
    return pair


def revoke_family(family):
    RefreshToken.objects.filter(family=family, revoked_at__isnull=True).update(revoked_at=timezone.now())


def revoke_refresh_token(refresh_token):
    """Log out: revoke the family of this refresh token. Unusable tokens are ignored."""
    try:
        payload = decode_token(refresh_token, REFRESH)
    except TokenError:
        return
    record = RefreshToken.objects.filter(jti=payload['jti']).first()
    if record:
        revoke_family(record.family)
