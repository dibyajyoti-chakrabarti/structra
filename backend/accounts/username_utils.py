import re
import secrets

from django.apps import apps as django_apps
from django.core.validators import RegexValidator
from django.utils.text import slugify


USERNAME_REGEX = r'^[A-Za-z0-9_-]+$'
username_validator = RegexValidator(
    regex=USERNAME_REGEX,
    message='Username can only contain letters, numbers, hyphens, and underscores.',
)


def normalize_username_input(username: str) -> str:
    value = (username or '').strip()
    if value.startswith('@'):
        value = value[1:]
    return value.lower()


def username_seed_from_value(value: str) -> str:
    seed = (value or '').strip()
    if '@' in seed:
        seed = seed.split('@', 1)[0]
    seed = normalize_username_input(seed)
    seed = slugify(seed).replace('-', '_')
    seed = re.sub(r'[^A-Za-z0-9_-]', '', seed)
    return (seed or 'user')[:40]


def generate_unique_username(seed: str = 'user') -> str:
    User = django_apps.get_model('accounts', 'User')
    base = username_seed_from_value(seed)

    for _ in range(25):
        suffix = secrets.token_hex(3)
        candidate = f'{base}_{suffix}'[:50]
        if not User.objects.filter(username__iexact=candidate).exists():
            return candidate

    return f'user_{secrets.token_hex(8)}'[:50]
