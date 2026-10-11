import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent.parent

from .base import *

DEBUG = False


def _csv(name):
    return [item.strip() for item in os.getenv(name, '').split(',') if item.strip()]


# Access and refresh tokens are signed with this key, so it must be a real secret.
if SECRET_KEY.startswith('django-insecure') and not os.getenv('JWT_SIGNING_KEY'):
    raise ImproperlyConfigured('Set DJANGO_SECRET_KEY (or JWT_SIGNING_KEY) to a long random value in production')

# Public URLs feed the OAuth redirect URI, the links in emails and the post login redirect.
# A localhost default in production would silently break all three.
for _required in ('API_PUBLIC_URL', 'FRONTEND_BASE_URL'):
    if not os.getenv(_required):
        raise ImproperlyConfigured(f'{_required} must be set in production')

# Hosts come from the environment only. Render sets RENDER_EXTERNAL_HOSTNAME for the
# service, and any custom domain goes in DJANGO_ALLOWED_HOSTS. There is deliberately no
# wildcard for *.onrender.com.
ALLOWED_HOSTS = _csv('DJANGO_ALLOWED_HOSTS') or _csv('ALLOWED_HOSTS')
if os.getenv('RENDER_EXTERNAL_HOSTNAME'):
    ALLOWED_HOSTS.append(os.environ['RENDER_EXTERNAL_HOSTNAME'])
if not ALLOWED_HOSTS:
    raise ImproperlyConfigured('Set DJANGO_ALLOWED_HOSTS (or run on Render, which sets RENDER_EXTERNAL_HOSTNAME)')
# Platform health checks and in-container probes address the service directly.
ALLOWED_HOSTS += ['localhost', '127.0.0.1']
ALLOWED_HOSTS = list(dict.fromkeys(ALLOWED_HOSTS))

CORS_ALLOWED_ORIGINS = _csv('CORS_ALLOWED_ORIGINS')
if not CORS_ALLOWED_ORIGINS:
    raise ImproperlyConfigured('CORS_ALLOWED_ORIGINS must be set in production')
# Only needed for cross origin form posts. The API authenticates with bearer tokens and the
# admin is same origin, so this can stay empty.
CSRF_TRUSTED_ORIGINS = _csv('CSRF_TRUSTED_ORIGINS')

# Neon requires TLS. The generous connect timeout covers a scale-to-zero compute that is
# still waking when the first request of the day arrives.
DATABASES['default'].setdefault('OPTIONS', {}).update({
    'sslmode': os.getenv('DB_SSLMODE', 'require'),
    'connect_timeout': int(os.getenv('DB_CONNECT_TIMEOUT', '15')),
})

# Render terminates TLS and forwards X-Forwarded-Proto, and appends the client address to
# X-Forwarded-For, so exactly one proxy is trusted when rate limiting by IP.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
AUTH_TRUSTED_PROXY_COUNT = int(os.getenv('AUTH_TRUSTED_PROXY_COUNT', '1'))
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
# Off by default because the platform health check calls over plain HTTP and a redirect
# would fail it. The proxy header above already makes request.is_secure() correct.
SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'false').lower() == 'true'

# Static files (the admin) are served by the app itself through whitenoise, so the service
# needs no separate static host. Run collectstatic when building the image.
STATIC_ROOT = BASE_DIR / "staticfiles"
MIDDLEWARE = list(MIDDLEWARE)
MIDDLEWARE.insert(MIDDLEWARE.index('django.middleware.security.SecurityMiddleware') + 1,
                  'whitenoise.middleware.WhiteNoiseMiddleware')
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage'},
}
