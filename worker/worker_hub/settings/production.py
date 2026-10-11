import os

from .base import *  # noqa: F401,F403

DEBUG = False

# Same database as the web service: Neon needs TLS, and the connect timeout covers a
# scale-to-zero compute that is still waking when the first job arrives.
DATABASES['default'].setdefault('OPTIONS', {}).update({
    'sslmode': os.getenv('DB_SSLMODE', 'require'),
    'connect_timeout': int(os.getenv('DB_CONNECT_TIMEOUT', '15')),
})
