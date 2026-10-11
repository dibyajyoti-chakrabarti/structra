"""Database backed throttles for the auth endpoints.

Counters live in Postgres rather than a process cache so they survive restarts
and hold across several server processes. A hit is one AuthAttempt row, and a
limit is a count of rows inside a window.
"""
import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from ..models import AuthAttempt

WINDOW_SECONDS = 3600
RETENTION = timedelta(days=1)

OTP_REQUEST = 'otp_request'
OTP_FAILURE = 'otp_failure'


def client_ip(request):
    """Best effort client address.

    X-Forwarded-For is only honoured for the number of proxies configured in
    AUTH_TRUSTED_PROXY_COUNT, counted from the right, because anything further
    left is supplied by the client and can be forged.
    """
    remote = request.META.get('REMOTE_ADDR', '') or 'unknown'
    proxies = settings.AUTH_TRUSTED_PROXY_COUNT
    if proxies <= 0:
        return remote
    parts = [p.strip() for p in request.META.get('HTTP_X_FORWARDED_FOR', '').split(',') if p.strip()]
    if len(parts) < proxies:
        return remote
    return parts[-proxies]


def email_key(email):
    return 'email:' + hashlib.sha256(email.encode()).hexdigest()[:40]


def ip_key(ip):
    return f'ip:{ip}'[:128]


def retry_after(kind, key, limit):
    """Seconds until the key is under its limit again, or 0 when it already is."""
    since = timezone.now() - timedelta(seconds=WINDOW_SECONDS)
    stamps = list(
        AuthAttempt.objects.filter(kind=kind, key=key, created_at__gt=since)
        .order_by('created_at')
        .values_list('created_at', flat=True)
    )
    if len(stamps) < limit:
        return 0
    # The limit frees up when enough of the oldest hits fall out of the window.
    freeing_hit = stamps[len(stamps) - limit]
    return max(1, int((freeing_hit + timedelta(seconds=WINDOW_SECONDS) - timezone.now()).total_seconds()) + 1)


def record(kind, key):
    AuthAttempt.objects.create(kind=kind, key=key)
    if secrets.randbelow(50) == 0:
        AuthAttempt.objects.filter(created_at__lt=timezone.now() - RETENTION).delete()
