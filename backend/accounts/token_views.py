"""Token refresh and logout."""
from rest_framework import status
from rest_framework.response import Response

from .auth_common import PublicAuthView
from .services.tokens import TokenError, revoke_refresh_token, rotate_refresh_token


class TokenRefreshView(PublicAuthView):
    def post(self, request):
        token = request.data.get('refresh')
        try:
            if not isinstance(token, str):
                raise TokenError('missing')
            pair = rotate_refresh_token(token)
        except TokenError:
            return Response({'detail': 'Invalid or expired refresh token.'}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(pair)


class LogoutView(PublicAuthView):
    def post(self, request):
        token = request.data.get('refresh')
        if isinstance(token, str):
            revoke_refresh_token(token)
        return Response(status=status.HTTP_204_NO_CONTENT)
