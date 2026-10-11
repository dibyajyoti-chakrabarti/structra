"""Email one time codes: issue, send and verify.

Only an HMAC of the code is stored, keyed with the server secret and bound to
the email address, so a leaked table is useless without the key. A code lives
for AUTH_OTP_TTL_SECONDS and is burned after AUTH_OTP_MAX_ATTEMPTS wrong tries.
"""
import hashlib
import hmac
import re
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.mail import EmailMultiAlternatives
from django.core.validators import validate_email
from django.db import transaction
from django.template.loader import render_to_string
from django.utils import timezone

from ..models import EmailLoginCode

CODE_RE = re.compile(r'\d{6}')


def normalize_email(raw):
    """Lower cased, trimmed address, or None when it is not a valid email."""
    value = (raw or '').strip().lower() if isinstance(raw, str) else ''
    if not value or len(value) > 254:
        return None
    try:
        validate_email(value)
    except ValidationError:
        return None
    return value


def is_well_formed_code(code):
    return isinstance(code, str) and CODE_RE.fullmatch(code.strip()) is not None


def hash_code(email, code):
    key = settings.JWT_SIGNING_KEY.encode()
    return hmac.new(key, f'{email}:{code}'.encode(), hashlib.sha256).hexdigest()


def create_code(email):
    """Create a fresh code for the email and invalidate older unused ones."""
    code = f'{secrets.randbelow(10**6):06d}'
    now = timezone.now()
    with transaction.atomic():
        EmailLoginCode.objects.filter(email=email, consumed_at__isnull=True).update(consumed_at=now)
        row = EmailLoginCode.objects.create(
            email=email,
            code_hash=hash_code(email, code),
            expires_at=now + timedelta(seconds=settings.AUTH_OTP_TTL_SECONDS),
        )
    return row, code


def send_code_email(email, code):
    context = {
        'code': code,
        'expires_minutes': max(1, settings.AUTH_OTP_TTL_SECONDS // 60),
        'logo_url': settings.EMAIL_LOGO_URL,
        'site_url': settings.FRONTEND_BASE_URL,
    }
    message = EmailMultiAlternatives(
        subject='Your Structra login code',
        body=render_to_string('accounts/emails/login_code.txt', context),
        from_email=f'Structra <{settings.DEFAULT_FROM_EMAIL}>',
        to=[email],
    )
    message.attach_alternative(render_to_string('accounts/emails/login_code.html', context), 'text/html')
    message.send(fail_silently=False)


def verify_code(email, code):
    """Check a code. Returns True once, and only for the newest live code.

    Every failure path is indistinguishable to the caller (expired, burned,
    wrong, never issued). A wrong guess counts against the code, and the
    code is burned when the budget is spent.
    """
    now = timezone.now()
    with transaction.atomic():
        row = (
            EmailLoginCode.objects.select_for_update()
            .filter(email=email, consumed_at__isnull=True, expires_at__gt=now)
            .order_by('-created_at')
            .first()
        )
        if row is None:
            return False
        if row.attempts >= settings.AUTH_OTP_MAX_ATTEMPTS:
            row.consumed_at = now
            row.save(update_fields=['consumed_at'])
            return False
        if not hmac.compare_digest(row.code_hash, hash_code(email, code.strip())):
            row.attempts += 1
            if row.attempts >= settings.AUTH_OTP_MAX_ATTEMPTS:
                row.consumed_at = now
            row.save(update_fields=['attempts', 'consumed_at'])
            return False
        row.consumed_at = now
        row.save(update_fields=['consumed_at'])
        return True
