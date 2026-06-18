"""One-off Lambda entrypoint to run Django migrations from inside the VPC.

The RDS instance is private, so migrations cannot be run from outside the VPC.
This handler is invoked manually (or via the worker image with its command
overridden to `migrate_handler.handler`) to apply migrations against RDS using
the same settings/credentials the worker already has.
"""
import os

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'worker_hub.settings')
os.environ.setdefault('DJANGO_ENV', 'production')
django.setup()

from django.core.management import call_command  # noqa: E402


def handler(event, context):
    call_command('migrate', '--noinput')
    return {'status': 'ok', 'action': 'migrate'}
