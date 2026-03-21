import os
from pathlib import Path
from socket import gethostbyname, gethostname

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / '.env.production', override=True)

from .base import *

DEBUG = False

raw_allowed_hosts = os.getenv('DJANGO_ALLOWED_HOSTS') or os.getenv('ALLOWED_HOSTS', '')
ALLOWED_HOSTS = [host.strip() for host in raw_allowed_hosts.split(',') if host.strip()]
if not ALLOWED_HOSTS:
    ALLOWED_HOSTS = [
        'structra.cloud',
        'www.structra.cloud',
        'localhost',
        '127.0.0.1',
    ]
lb_hosts = os.getenv('ALLOWED_LB_HOSTS', '')
if lb_hosts:
    ALLOWED_HOSTS.extend([host.strip() for host in lb_hosts.split(',') if host.strip()])
try:
    private_ip = gethostbyname(gethostname())
    if private_ip:
        ALLOWED_HOSTS.append(private_ip)
except Exception:
    pass
ALLOWED_HOSTS = list(dict.fromkeys(ALLOWED_HOSTS))

CORS_ALLOWED_ORIGINS = [origin for origin in os.getenv('CORS_ALLOWED_ORIGINS', '').split(',') if origin]
CSRF_TRUSTED_ORIGINS = [origin for origin in os.getenv('CSRF_TRUSTED_ORIGINS', '').split(',') if origin]

if not CORS_ALLOWED_ORIGINS:
    raise ImproperlyConfigured('CORS_ALLOWED_ORIGINS must be set in .env.production')
if not CSRF_TRUSTED_ORIGINS:
    raise ImproperlyConfigured('CSRF_TRUSTED_ORIGINS must be set in .env.production')

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = True
STATIC_ROOT = BASE_DIR / "staticfiles"