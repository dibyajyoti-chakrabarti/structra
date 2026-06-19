"""One-off Lambda entrypoint to run Django migrations with the BACKEND's full
app list (the worker's app list is a subset and misses backend-only apps such
as payments). Invoked by overriding the backend image command to
`migrate_handler.handler`. The backend Lambda already has the CORS/CSRF env
that production settings require.
"""
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_hub.settings.production')

import django  # noqa: E402

django.setup()

from django.core.management import call_command  # noqa: E402


def handler(event, context):
    call_command('migrate', '--noinput')
    return {'status': 'ok', 'action': 'migrate'}
