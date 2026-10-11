"""Pieces shared by the login endpoints."""
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import UserSerializer
from .services.tokens import issue_token_pair


class PublicAuthView(APIView):
    """Base for endpoints that are called before the caller has any token."""

    authentication_classes = []
    permission_classes = [AllowAny]


def session_response(user, http_status=status.HTTP_200_OK):
    payload = issue_token_pair(user)
    payload['user'] = UserSerializer(user).data
    return Response(payload, status=http_status)


def too_many(seconds):
    response = Response({'detail': 'Too many attempts. Try again later.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
    response['Retry-After'] = str(seconds)
    return response
