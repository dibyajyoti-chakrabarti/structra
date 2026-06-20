import os
from pathlib import Path

from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent
PROJECT_DIR = BASE_DIR.parent

# Load environment files.
django_env = os.getenv('DJANGO_ENV', 'local')
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
        'accounts.authentication.CognitoJWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'public_workspace_search_anon': '20/hour',
    },
}

# Cognito
COGNITO_USER_POOL_ID = os.getenv('COGNITO_USER_POOL_ID', '')
COGNITO_CLIENT_ID = os.getenv('COGNITO_CLIENT_ID', '')

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

# Transactional email via Zoho SMTP (auth emails handled by Cognito)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.zoho.in')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() == 'true'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', 'support@structra.cloud')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'support@structra.cloud')

# Invitation links
FRONTEND_INVITE_BASE_URL = os.getenv('FRONTEND_INVITE_BASE_URL', 'http://localhost:5173/invite')

# Payments (Razorpay)
RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET', '')
RAZORPAY_WEBHOOK_SECRET = os.getenv('RAZORPAY_WEBHOOK_SECRET', '')
RAZORPAY_PLAN_ID_INDIVIDUAL = os.getenv('RAZORPAY_PLAN_ID_INDIVIDUAL', '')
RAZORPAY_PLAN_ID_TEAM = os.getenv('RAZORPAY_PLAN_ID_TEAM', '')

# Bedrock (AI)
BEDROCK_REGION = os.getenv('BEDROCK_REGION', 'ap-south-1')
BEDROCK_MODEL_ID = os.getenv('BEDROCK_MODEL_ID', 'anthropic.claude-3-5-sonnet-20241022-v2:0')
BEDROCK_SEMANTIC_MODEL_ID = os.getenv('BEDROCK_SEMANTIC_MODEL_ID', 'anthropic.claude-3-haiku-20240307-v1:0')
BEDROCK_TIMEOUT_SECONDS = int(os.getenv('BEDROCK_TIMEOUT_SECONDS', '60'))
AWS_PROFILE = os.getenv('AWS_PROFILE', '')

USE_SQS = os.getenv("USE_SQS", "false").lower() == "true"
SQS_QUEUE_URL = os.getenv("SQS_QUEUE_URL", "")
AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")
ASSETS_BUCKET_NAME = os.getenv("ASSETS_BUCKET_NAME", "")
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
