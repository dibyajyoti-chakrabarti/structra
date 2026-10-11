"""Production settings, checked in a clean subprocess so each case sees only the env it sets."""
import json
import os
import subprocess
import sys
import unittest
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[2]

VALID_ENV = {
    'DJANGO_ENV': 'production',
    'DJANGO_SECRET_KEY': 'x' * 60,
    'DJANGO_ALLOWED_HOSTS': 'api.example.test',
    'CORS_ALLOWED_ORIGINS': 'https://app.example.test',
    'API_PUBLIC_URL': 'https://api.example.test',
    'FRONTEND_BASE_URL': 'https://app.example.test',
}

DUMP = """
import json
from config.settings import production as s
print(json.dumps({
    'hosts': s.ALLOWED_HOSTS, 'cors': s.CORS_ALLOWED_ORIGINS, 'csrf': s.CSRF_TRUSTED_ORIGINS,
    'db': s.DATABASES['default']['OPTIONS'], 'mw': s.MIDDLEWARE, 'storages': s.STORAGES,
    'email_host': s.EMAIL_HOST, 'email_port': s.EMAIL_PORT, 'email_tls': s.EMAIL_USE_TLS,
    'email_user': s.EMAIL_HOST_USER, 'from': s.DEFAULT_FROM_EMAIL, 'invite': s.FRONTEND_INVITE_BASE_URL,
    'proxies': s.AUTH_TRUSTED_PROXY_COUNT, 'ssl_redirect': s.SECURE_SSL_REDIRECT,
    'secure_cookies': [s.SESSION_COOKIE_SECURE, s.CSRF_COOKIE_SECURE], 'debug': s.DEBUG,
}))
"""


def run(env_overrides, code=DUMP, drop=()):
    env = {'PATH': os.environ.get('PATH', ''), 'PYTHONDONTWRITEBYTECODE': '1'}
    if os.environ.get('PYTHONPATH'):
        env['PYTHONPATH'] = os.environ['PYTHONPATH']
    env.update(VALID_ENV)
    env.update(env_overrides)
    for name in drop:
        env.pop(name, None)
    return subprocess.run([sys.executable, '-c', code], cwd=BACKEND, env=env, capture_output=True, text=True)


def load(env_overrides=None, drop=()):
    result = run(env_overrides or {}, drop=drop)
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout.strip().splitlines()[-1])


class ProductionDefaultsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cfg = load()

    def test_hosts_come_from_the_environment_only(self):
        self.assertEqual(self.cfg['hosts'], ['api.example.test', 'localhost', '127.0.0.1'])
        self.assertFalse([h for h in self.cfg['hosts'] if 'structra.cloud' in h])

    def test_database_requires_tls_with_a_15_second_connect_timeout(self):
        self.assertEqual(self.cfg['db'], {'sslmode': 'require', 'connect_timeout': 15})

    def test_whitenoise_sits_right_after_the_security_middleware(self):
        mw = self.cfg['mw']
        self.assertEqual(mw[mw.index('django.middleware.security.SecurityMiddleware') + 1],
                         'whitenoise.middleware.WhiteNoiseMiddleware')
        self.assertEqual(mw.count('whitenoise.middleware.WhiteNoiseMiddleware'), 1)
        self.assertEqual(self.cfg['storages']['staticfiles']['BACKEND'], 'whitenoise.storage.CompressedStaticFilesStorage')

    def test_email_defaults_to_gmail_smtp_with_starttls(self):
        self.assertEqual((self.cfg['email_host'], self.cfg['email_port'], self.cfg['email_tls']),
                         ('smtp.gmail.com', 587, True))
        self.assertEqual(self.cfg['email_user'], '')
        self.assertNotIn('structra.cloud', self.cfg['from'])
        self.assertNotIn('zoho', self.cfg['email_host'])

    def test_invite_url_follows_the_frontend_url(self):
        self.assertEqual(self.cfg['invite'], 'https://app.example.test/invite')

    def test_one_proxy_is_trusted_for_client_ip(self):
        self.assertEqual(self.cfg['proxies'], 1)

    def test_https_cookies_and_no_forced_redirect(self):
        self.assertEqual(self.cfg['secure_cookies'], [True, True])
        self.assertFalse(self.cfg['ssl_redirect'])
        self.assertFalse(self.cfg['debug'])

    def test_csrf_origins_are_optional(self):
        self.assertEqual(self.cfg['csrf'], [])


class ProductionOverrideTests(unittest.TestCase):
    def test_render_hostname_is_allowed(self):
        cfg = load({'RENDER_EXTERNAL_HOSTNAME': 'structra-x.onrender.com'}, drop=('DJANGO_ALLOWED_HOSTS',))
        self.assertEqual(cfg['hosts'], ['structra-x.onrender.com', 'localhost', '127.0.0.1'])

    def test_render_hostname_is_added_to_explicit_hosts_without_duplicates(self):
        cfg = load({'RENDER_EXTERNAL_HOSTNAME': 'api.example.test', 'DJANGO_ALLOWED_HOSTS': 'api.example.test, b.test'})
        self.assertEqual(cfg['hosts'], ['api.example.test', 'b.test', 'localhost', '127.0.0.1'])

    def test_no_onrender_wildcard_is_ever_added(self):
        cfg = load({'RENDER_EXTERNAL_HOSTNAME': 'one.onrender.com'})
        self.assertNotIn('.onrender.com', cfg['hosts'])

    def test_database_options_can_be_overridden_for_a_local_postgres(self):
        cfg = load({'DB_SSLMODE': 'disable', 'DB_CONNECT_TIMEOUT': '5'})
        self.assertEqual(cfg['db'], {'sslmode': 'disable', 'connect_timeout': 5})

    def test_explicit_invite_url_wins(self):
        self.assertEqual(load({'FRONTEND_INVITE_BASE_URL': 'https://x.test/join'})['invite'], 'https://x.test/join')

    def test_from_address_follows_the_smtp_user(self):
        cfg = load({'EMAIL_HOST_USER': 'structra.support@gmail.com'})
        self.assertEqual(cfg['from'], 'structra.support@gmail.com')

    def test_csrf_origins_are_read_when_given(self):
        cfg = load({'CSRF_TRUSTED_ORIGINS': 'https://a.test, https://b.test'})
        self.assertEqual(cfg['csrf'], ['https://a.test', 'https://b.test'])

    def test_proxy_count_can_be_overridden(self):
        self.assertEqual(load({'AUTH_TRUSTED_PROXY_COUNT': '0'})['proxies'], 0)


class ProductionFailFastTests(unittest.TestCase):
    def assert_refuses(self, message, overrides=None, drop=()):
        result = run(overrides or {}, drop=drop)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('ImproperlyConfigured', result.stderr)
        self.assertIn(message, result.stderr)

    def test_missing_hosts(self):
        self.assert_refuses('DJANGO_ALLOWED_HOSTS', drop=('DJANGO_ALLOWED_HOSTS',))

    def test_missing_cors_origins(self):
        self.assert_refuses('CORS_ALLOWED_ORIGINS', drop=('CORS_ALLOWED_ORIGINS',))

    def test_missing_public_urls(self):
        self.assert_refuses('API_PUBLIC_URL', drop=('API_PUBLIC_URL',))
        self.assert_refuses('FRONTEND_BASE_URL', drop=('FRONTEND_BASE_URL',))

    def test_insecure_default_secret_key(self):
        self.assert_refuses('DJANGO_SECRET_KEY', {'DJANGO_SECRET_KEY': 'django-insecure-change-me'})
        self.assert_refuses('DJANGO_SECRET_KEY', drop=('DJANGO_SECRET_KEY',))

    def test_a_dedicated_signing_key_allows_the_default_secret(self):
        result = run({'DJANGO_SECRET_KEY': 'django-insecure-x', 'JWT_SIGNING_KEY': 'k' * 40})
        self.assertEqual(result.returncode, 0, result.stderr)


class ProductionSystemCheckTests(unittest.TestCase):
    def test_django_system_check_passes_with_whitenoise_installed(self):
        result = run({}, code="import os,django;os.environ['DJANGO_SETTINGS_MODULE']='config.settings';"
                              "django.setup();from django.core.management import call_command;call_command('check')")
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_no_aws_metadata_lookup_remains(self):
        source = (BACKEND / 'config' / 'settings' / 'production.py').read_text()
        self.assertNotIn('169.254.169.254', source)
        self.assertNotIn('urllib', source)
