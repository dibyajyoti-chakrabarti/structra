import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent

django_env = os.getenv('DJANGO_ENV', 'local')
if django_env == 'production':
    load_dotenv(BASE_DIR.parent / 'backend' / '.env.production', override=False)
else:
    load_dotenv(BASE_DIR.parent / 'backend' / '.env.local', override=False)

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-worker-change-me')

DEBUG = False

# Worker has no HTTP server — no allowed hosts needed.
ALLOWED_HOSTS = []

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'accounts',
    'workspaces',
    'canvases',
    'audit',
    'core',
]

# No HTTP request cycle — no middleware needed.
MIDDLEWARE = []

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

AUTH_USER_MODEL = 'accounts.User'
AUTHENTICATION_BACKENDS = [
    'accounts.backends.EmailOrUsernameBackend',
    'django.contrib.auth.backends.ModelBackend',
]

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Queue configuration
USE_SQS = os.getenv('USE_SQS', 'false').lower() == 'true'
SQS_QUEUE_URL = os.getenv('SQS_QUEUE_URL', '')
AWS_REGION = os.getenv('AWS_REGION', 'ap-south-2')
EVALUATION_LOCAL_QUEUE_POLL_INTERVAL_SECONDS = int(os.getenv('EVALUATION_LOCAL_QUEUE_POLL_INTERVAL_SECONDS', '5'))
EVALUATION_LOCAL_QUEUE_RETRY_DELAY_SECONDS = int(os.getenv('EVALUATION_LOCAL_QUEUE_RETRY_DELAY_SECONDS', '10'))
EVALUATION_LOCAL_QUEUE_MAX_ATTEMPTS = int(os.getenv('EVALUATION_LOCAL_QUEUE_MAX_ATTEMPTS', '3'))
EVALUATION_LOCAL_QUEUE_LOCK_TIMEOUT_SECONDS = int(os.getenv('EVALUATION_LOCAL_QUEUE_LOCK_TIMEOUT_SECONDS', '300'))

# AWS Bedrock
BEDROCK_MODEL_ID = os.getenv('BEDROCK_MODEL_ID', 'anthropic.claude-sonnet-4-6')
BEDROCK_SEMANTIC_MODEL_ID = os.getenv('BEDROCK_SEMANTIC_MODEL_ID', 'anthropic.claude-haiku-4-5-20251001-v1:0')
BEDROCK_TIMEOUT_SECONDS = float(os.getenv('BEDROCK_TIMEOUT_SECONDS', '60'))
AWS_PROFILE = os.getenv('AWS_PROFILE', '')  # set for local dev; empty in prod (EC2 IAM role)

# Payments (Razorpay) — referenced by workspaces app models/services
RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET', '')
RAZORPAY_WEBHOOK_SECRET = os.getenv('RAZORPAY_WEBHOOK_SECRET', '')
RAZORPAY_PLAN_ID_INDIVIDUAL = os.getenv('RAZORPAY_PLAN_ID_INDIVIDUAL', '')
RAZORPAY_PLAN_ID_TEAM = os.getenv('RAZORPAY_PLAN_ID_TEAM', '')

# Frontend invite URL (referenced by notifications/audit services)
FRONTEND_INVITE_BASE_URL = os.getenv('FRONTEND_INVITE_BASE_URL', 'http://localhost:5173/invite')

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
        'evaluation_worker': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'evaluation_service': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'evaluation_queue': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'sqs_publisher': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'sqs_worker': {
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
