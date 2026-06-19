from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

from .base import *

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'unissued-jase-marriedly.ngrok-free.dev']

CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]

# Optional local SQLite fallback (kept for developers, disabled by default).
# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.sqlite3',
#         'NAME': BASE_DIR / 'db.sqlite3',
#     }
# }
