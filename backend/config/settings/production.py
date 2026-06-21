import os
from pathlib import Path
from socket import gethostbyname, gethostname

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent.parent

from .base import *

DEBUG = False

# Fail fast when the database is unreachable (e.g. RDS stopped via prod-down) so
# the /health/ check returns 503 promptly — within the frontend's 7s timeout —
# instead of the Lambda hanging on a TCP connect to a stopped RDS endpoint.
DATABASES['default'].setdefault('OPTIONS', {})['connect_timeout'] = 5

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
    import urllib.request
    
    # Step 1: get token
    token_req = urllib.request.Request(
        'http://169.254.169.254/latest/api/token',
        headers={'X-aws-ec2-metadata-token-ttl-seconds': '21600'},
        method='PUT'
    )
    token = urllib.request.urlopen(token_req, timeout=1).read().decode()
    
    #Step 2: use token to get IP
    private_ip_req= urllib.request.Request(
        'http://169.254.169.254/latest/meta-data/local-ipv4',
        headers={'X-aws-ec2-metadata-token': token}
    )
    private_ip = urllib.request.urlopen(private_ip_req, timeout=1).read().decode()
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
SECURE_SSL_REDIRECT = False  # ALB handles SSL termination, not Django
STATIC_ROOT = BASE_DIR / "staticfiles"
