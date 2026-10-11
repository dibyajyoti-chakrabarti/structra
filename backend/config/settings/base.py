import os
from pathlib import Path

from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent
PROJECT_DIR = BASE_DIR.parent

# Load environment files.
# DJANGO_SKIP_ENV_FILES keeps the settings tests hermetic: without it a developer's own
# .env.production would leak into cases that assert what happens when a value is absent.
django_env = os.getenv('DJANGO_ENV', 'local')
if not os.getenv('DJANGO_SKIP_ENV_FILES'):
    if django_env == 'production':
        load_dotenv(BASE_DIR / '.env.production', override=False)
    else:
        load_dotenv(BASE_DIR / '.env.local', override=False)
    load_dotenv(PROJECT_DIR / '.env', override=False)  # fallback, keep as is for backward compatibility

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-change-me')

# Environment-specific files should override these.
DEBUG = False
ALLOWED_HOSTS = []
CORS_ALLOWED_ORIGINS = []

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.postgres',
    'corsheaders',
    'rest_framework',

    #local apps
    'accounts',
    'workspaces',
    'systems',
    'permissions',
    'notifications',
    'audit',
    'payments',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': os.getenv('DB_ENGINE', 'django.db.backends.postgresql'),
        'NAME': os.getenv('DB_NAME', 'structra'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# DRF Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'accounts.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'public_workspace_search_anon': '20/hour',
    },
}

# Authentication (owned by Django: email OTP, Google and GitHub, our own JWTs)
# Public URLs. The API base is used to build the OAuth redirect URI that is
# registered with each provider, the frontend base is where the browser lands
# after a social login.
API_PUBLIC_URL = os.getenv('API_PUBLIC_URL', 'http://localhost:8000').rstrip('/')
FRONTEND_BASE_URL = os.getenv('FRONTEND_BASE_URL', 'http://localhost:5173').rstrip('/')

# HS256 signing key for access and refresh tokens. Defaults to SECRET_KEY.
JWT_SIGNING_KEY = os.getenv('JWT_SIGNING_KEY', '') or SECRET_KEY
JWT_ISSUER = os.getenv('JWT_ISSUER', 'structra')
JWT_ACCESS_TTL_SECONDS = int(os.getenv('JWT_ACCESS_TTL_SECONDS', str(15 * 60)))
JWT_REFRESH_TTL_SECONDS = int(os.getenv('JWT_REFRESH_TTL_SECONDS', str(30 * 24 * 3600)))

# Email OTP
AUTH_OTP_TTL_SECONDS = int(os.getenv('AUTH_OTP_TTL_SECONDS', '600'))
AUTH_OTP_MAX_ATTEMPTS = int(os.getenv('AUTH_OTP_MAX_ATTEMPTS', '5'))
AUTH_OTP_REQUESTS_PER_EMAIL_PER_HOUR = int(os.getenv('AUTH_OTP_REQUESTS_PER_EMAIL_PER_HOUR', '5'))
AUTH_OTP_REQUESTS_PER_IP_PER_HOUR = int(os.getenv('AUTH_OTP_REQUESTS_PER_IP_PER_HOUR', '20'))
AUTH_OTP_FAILURES_PER_EMAIL_PER_HOUR = int(os.getenv('AUTH_OTP_FAILURES_PER_EMAIL_PER_HOUR', '10'))
AUTH_OTP_FAILURES_PER_IP_PER_HOUR = int(os.getenv('AUTH_OTP_FAILURES_PER_IP_PER_HOUR', '30'))
# Number of reverse proxies in front of Django that append to X-Forwarded-For
# (0 means trust only the socket address, 1 for a single platform proxy).
AUTH_TRUSTED_PROXY_COUNT = int(os.getenv('AUTH_TRUSTED_PROXY_COUNT', '0'))
# Absolute URL of the logo shown in the login email. Omitted from the email when empty.
EMAIL_LOGO_URL = os.getenv('EMAIL_LOGO_URL', '')

# Social login (backend driven authorization code flow)
OAUTH_GOOGLE_CLIENT_ID = os.getenv('OAUTH_GOOGLE_CLIENT_ID', '')
OAUTH_GOOGLE_CLIENT_SECRET = os.getenv('OAUTH_GOOGLE_CLIENT_SECRET', '')
OAUTH_GITHUB_CLIENT_ID = os.getenv('OAUTH_GITHUB_CLIENT_ID', '')
OAUTH_GITHUB_CLIENT_SECRET = os.getenv('OAUTH_GITHUB_CLIENT_SECRET', '')
OAUTH_STATE_TTL_SECONDS = int(os.getenv('OAUTH_STATE_TTL_SECONDS', '600'))
OAUTH_TICKET_TTL_SECONDS = int(os.getenv('OAUTH_TICKET_TTL_SECONDS', '60'))
OAUTH_HTTP_TIMEOUT_SECONDS = int(os.getenv('OAUTH_HTTP_TIMEOUT_SECONDS', '10'))

# Custom User Model
AUTH_USER_MODEL = 'accounts.User'
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Transactional email (login codes and workspace invitations).
# Render's free tier blocks outbound SMTP, so production sends through the Gmail API over
# HTTPS (core.mail) when its three credentials are set. Otherwise it falls back to SMTP,
# which works locally and on any host that allows it. EMAIL_BACKEND overrides both.
GMAIL_CLIENT_ID = os.getenv('GMAIL_CLIENT_ID', '')
GMAIL_CLIENT_SECRET = os.getenv('GMAIL_CLIENT_SECRET', '')
GMAIL_REFRESH_TOKEN = os.getenv('GMAIL_REFRESH_TOKEN', '')
# The address the Gmail API sends as. It must be the account that gave the consent.
GMAIL_SENDER = os.getenv('GMAIL_SENDER', '')
if os.getenv('EMAIL_BACKEND'):
    EMAIL_BACKEND = os.environ['EMAIL_BACKEND']
elif GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN:
    EMAIL_BACKEND = 'core.mail.GmailAPIEmailBackend'
else:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
# SMTP settings. Gmail needs 2 step verification and an app password in EMAIL_HOST_PASSWORD.
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() == 'true'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', '') or GMAIL_SENDER or EMAIL_HOST_USER
# A hung mail server must not hold a request or the worker for minutes.
EMAIL_TIMEOUT = int(os.getenv('EMAIL_TIMEOUT', '10'))

# Invitation links point at the frontend's invite page.
FRONTEND_INVITE_BASE_URL = os.getenv('FRONTEND_INVITE_BASE_URL', '') or f'{FRONTEND_BASE_URL}/invite'

# Payments (Razorpay)
RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET', '')
RAZORPAY_WEBHOOK_SECRET = os.getenv('RAZORPAY_WEBHOOK_SECRET', '')
RAZORPAY_PLAN_ID_INDIVIDUAL = os.getenv('RAZORPAY_PLAN_ID_INDIVIDUAL', '')
RAZORPAY_PLAN_ID_TEAM = os.getenv('RAZORPAY_PLAN_ID_TEAM', '')

USE_SQS = os.getenv("USE_SQS", "false").lower() == "true"
SQS_QUEUE_URL = os.getenv("SQS_QUEUE_URL", "")
AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")

# Avatar storage on Cloudflare R2 (S3 compatible). R2_PUBLIC_URL is where the bucket is
# served publicly (an r2.dev address or a custom domain), without a trailing slash.
R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID", "")
R2_ENDPOINT_URL = os.getenv("R2_ENDPOINT_URL", "")  # optional override, e.g. a local S3 server
R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID", "")
R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY", "")
R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "")
R2_PUBLIC_URL = os.getenv("R2_PUBLIC_URL", "").rstrip("/")
# Shared secret for the stateless worker's result callback (service-to-service auth).
INTERNAL_API_TOKEN = os.getenv("INTERNAL_API_TOKEN", "")
EVALUATION_LOCAL_QUEUE_POLL_INTERVAL_SECONDS = int(os.getenv("EVALUATION_LOCAL_QUEUE_POLL_INTERVAL_SECONDS", "5"))
EVALUATION_LOCAL_QUEUE_RETRY_DELAY_SECONDS = int(os.getenv("EVALUATION_LOCAL_QUEUE_RETRY_DELAY_SECONDS", "10"))
EVALUATION_LOCAL_QUEUE_MAX_ATTEMPTS = int(os.getenv("EVALUATION_LOCAL_QUEUE_MAX_ATTEMPTS", "3"))
EVALUATION_LOCAL_QUEUE_LOCK_TIMEOUT_SECONDS = int(os.getenv("EVALUATION_LOCAL_QUEUE_LOCK_TIMEOUT_SECONDS", "300"))

DEBUG_PROPAGATE_EXCEPTIONS = os.getenv('DJANGO_DEBUG_PROPAGATE_EXCEPTIONS', 'false').lower() == 'true'

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'standard': {
            'format': '%(asctime)s %(levelname)s %(name)s %(message)s',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'standard',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'systems.evaluation_views': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'systems.queue_publisher': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
    'root': {
        'handlers': ['console'],
        'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
    },
}
