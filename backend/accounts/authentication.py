from django.contrib.auth import get_user_model
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from .services.plan import enforce_plan_expiry
from .services.tokens import ACCESS, TokenError, decode_token

User = get_user_model()


class JWTAuthentication(BaseAuthentication):
    """Authenticates `Authorization: Bearer <access token>` issued by accounts.services.tokens."""

    def authenticate(self, request):
        header = request.headers.get('Authorization', '')
        if not header.startswith('Bearer '):
            return None

        try:
            payload = decode_token(header[7:].strip(), ACCESS)
        except TokenError:
            raise AuthenticationFailed('Invalid or expired token.')

        user = User.objects.filter(user_id=payload['sub']).first()
        if user is None or not user.is_active:
            raise AuthenticationFailed('Invalid or expired token.')

        return (enforce_plan_expiry(user), None)

    def authenticate_header(self, request):
        # Without this DRF omits WWW-Authenticate and downgrades 401 to 403.
        return 'Bearer'
