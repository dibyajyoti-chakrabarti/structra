import json
from functools import lru_cache

import jwt
import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from jwt.algorithms import RSAAlgorithm
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from .services.plan import enforce_plan_expiry
from .services.username import generate_unique_username

User = get_user_model()


@lru_cache(maxsize=1)
def _get_cognito_jwks():
    region = getattr(settings, 'AWS_REGION', 'ap-south-1')
    pool_id = settings.COGNITO_USER_POOL_ID
    url = f'https://cognito-idp.{region}.amazonaws.com/{pool_id}/.well-known/jwks.json'
    resp = requests.get(url, timeout=5)
    resp.raise_for_status()
    return {k['kid']: json.dumps(k) for k in resp.json()['keys']}


class CognitoJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        header = request.headers.get('Authorization', '')
        print(f'[CognitoAuth] header present={bool(header)} starts_bearer={header.startswith("Bearer ")}', flush=True)
        if not header.startswith('Bearer '):
            return None
        token = header[7:]
        print(f'[CognitoAuth] token prefix={token[:30]}', flush=True)

        try:
            unverified_header = jwt.get_unverified_header(token)
            jwks = _get_cognito_jwks()
            kid = unverified_header.get('kid')
            if kid not in jwks:
                raise AuthenticationFailed('Unknown token key ID')
            public_key = RSAAlgorithm.from_jwk(jwks[kid])
            payload = jwt.decode(
                token,
                public_key,
                algorithms=['RS256'],
                options={'verify_aud': False},
            )
        except AuthenticationFailed:
            raise
        except Exception as exc:
            print(f'[CognitoAuth] validation failed: {exc}', flush=True)
            raise AuthenticationFailed(f'Invalid Cognito token: {exc}')

        cognito_sub = payload.get('sub')
        if not cognito_sub:
            raise AuthenticationFailed('Token missing sub claim')

        user = User.objects.filter(cognito_sub=cognito_sub).first()
        if not user:
            user = self._provision_user(cognito_sub, payload)

        user = enforce_plan_expiry(user)
        return (user, None)

    def authenticate_header(self, request):
        # Without this DRF omits WWW-Authenticate and downgrades 401 to 403.
        return 'Bearer'

    def _provision_user(self, cognito_sub, payload):
        email = payload.get('email') or ''
        if not email or '@' not in email:
            raise AuthenticationFailed('Cannot provision user: no email in token')

        # Link existing user by email (e.g. migrated account)
        user = User.objects.filter(email__iexact=email).first()
        if user:
            user.cognito_sub = cognito_sub
            user.save(update_fields=['cognito_sub'])
            return user

        full_name = payload.get('name', '')
        username = generate_unique_username(email.split('@')[0])
        user = User.objects.create_user(
            email=email,
            username=username,
            password=None,
            full_name=full_name,
            cognito_sub=cognito_sub,
        )
        return user
