import os
from pathlib import Path

from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent
PROJECT_DIR = BASE_DIR.parent

# Load environment files.
django_env = os.getenv('DJANGO_ENV', 'local')
if django_env == 'production':
    load_dotenv(BASE_DIR / '.env.production', override=True)
else:
    load_dotenv(BASE_DIR / '.env.local', override=True)
load_dotenv(PROJECT_DIR / '.env')  # fallback, keep as is for backward compatibility

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
    'rest_framework_simplejwt',
    
    #local apps
    'accounts',
    'workspaces',
    'canvases',
    'permissions',
    'notifications',
    'audit',
    'payments',
    'core',
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

ROOT_URLCONF = 'backend_hub.urls'  # UPDATED

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

WSGI_APPLICATION = 'backend_hub.wsgi.application' # UPDATED

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
        'accounts.authentication.ExpiryEnforcingJWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'public_workspace_search_anon': '20/hour',
    },
}

SIMPLE_JWT = {
    'USER_ID_FIELD': 'user_id',
    'USER_ID_CLAIM': 'user_id',
}

# Custom User Model
AUTH_USER_MODEL = 'accounts.User'
AUTHENTICATION_BACKENDS = [
    'accounts.backends.EmailOrUsernameBackend',
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

# Email (OTP delivery)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() == 'true'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', 'sarthshah333@gmail.com')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'sarthshah333@gmail.com')

# Invitation links
FRONTEND_INVITE_BASE_URL = os.getenv('FRONTEND_INVITE_BASE_URL', 'http://localhost:5173/invite')

# Payments (Razorpay)
RAZORPAY_KEY_ID = os.getenv('RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET = os.getenv('RAZORPAY_KEY_SECRET', '')
RAZORPAY_WEBHOOK_SECRET = os.getenv('RAZORPAY_WEBHOOK_SECRET', '')
RAZORPAY_PLAN_ID_INDIVIDUAL = os.getenv('RAZORPAY_PLAN_ID_INDIVIDUAL', '')
RAZORPAY_PLAN_ID_TEAM = os.getenv('RAZORPAY_PLAN_ID_TEAM', '')

USE_SQS = os.getenv("USE_SQS", "false").lower() == "true"
SQS_QUEUE_URL = os.getenv("SQS_QUEUE_URL", "")
AWS_REGION = os.getenv("AWS_REGION", "ap-south-2")

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
        'canvases.evaluation_views': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'canvases.evaluation_service': {
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
