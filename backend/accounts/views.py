import logging

import boto3
from botocore.exceptions import ClientError
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Value
from django.db.models.functions import Coalesce
from rest_framework import generics, permissions, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.constants import WorkspaceVisibility
from workspaces.models import Workspace

from .serializers import UserSerializer
from .username_utils import normalize_username_input, username_validator

logger = logging.getLogger(__name__)
from django.contrib.postgres.search import TrigramSimilarity

User = get_user_model()


class UserTrigramSearchView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        query = (request.query_params.get('q') or '').strip()
        normalized_query = normalize_username_input(query)
        if not normalized_query:
            return Response([], status=status.HTTP_200_OK)

        users = (
            User.objects.filter(is_active=True)
            .exclude(user_id=request.user.user_id)
            .annotate(
                similarity=(
                    TrigramSimilarity('username', normalized_query)
                    + TrigramSimilarity(Coalesce('full_name', Value('')), query)
                )
            )
            .filter(similarity__gt=0.1)
            .order_by('-similarity')[:15]
        )

        payload = [
            {
                'id': str(user.user_id),
                'username': user.username,
                'full_name': user.full_name,
                'avatar': None,
            }
            for user in users
        ]
        return Response(payload, status=status.HTTP_200_OK)


class UsernameAvailabilityView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        username = normalize_username_input(request.query_params.get('username'))
        if not username:
            return Response(
                {'error': 'Username is required.', 'available': False},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            username_validator(username)
        except DjangoValidationError as exc:
            return Response(
                {'error': exc.messages[0], 'available': False},
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = User.objects.filter(username__iexact=username)
        if request.user and request.user.is_authenticated:
            queryset = queryset.exclude(user_id=request.user.user_id)

        return Response(
            {
                'username': username,
                'available': not queryset.exists(),
            },
            status=status.HTTP_200_OK,
        )


class PublicUserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, username):
        normalized_username = normalize_username_input(username)
        profile_user = User.objects.filter(
            username__iexact=normalized_username,
            is_active=True,
        ).first()
        if not profile_user:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        public_workspaces = (
            Workspace.objects.filter(owner=profile_user, visibility=WorkspaceVisibility.PUBLIC)
            .annotate(member_count=Count('members', distinct=True))
            .order_by('-updated_at')
        )

        workspace_payload = [
            {
                'id': workspace.id,
                'name': workspace.name,
                'description': workspace.description,
                'visibility': workspace.visibility,
                'member_count': workspace.member_count,
                'updated_at': workspace.updated_at,
            }
            for workspace in public_workspaces
        ]

        return Response(
            {
                'id': str(profile_user.user_id),
                'username': profile_user.username,
                'full_name': profile_user.full_name,
                'avatar': None,
                'org_name': profile_user.org_name,
                'org_loc': profile_user.org_loc,
                'joined_at': profile_user.created_at,
                'workspace_count': len(workspace_payload),
                'public_workspaces': workspace_payload,
                'followers_count': 0,
                'following_count': 0,
            },
            status=status.HTTP_200_OK,
        )


class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class DeleteAccountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        user = request.user
        cognito_sub = user.cognito_sub

        if cognito_sub:
            try:
                client = boto3.client('cognito-idp', region_name=getattr(settings, 'AWS_REGION', 'ap-south-1'))
                client.admin_delete_user(
                    UserPoolId=settings.COGNITO_USER_POOL_ID,
                    Username=cognito_sub,
                )
            except ClientError as exc:
                code = exc.response['Error']['Code']
                if code != 'UserNotFoundException':
                    logger.error("Cognito admin_delete_user failed for %s: %s", cognito_sub, exc)
                    return Response(
                        {'detail': 'Failed to delete account from authentication service. Please try again.'},
                        status=status.HTTP_502_BAD_GATEWAY,
                    )
            except Exception as exc:
                logger.error("Unexpected error deleting Cognito user %s: %s", cognito_sub, exc)
                return Response(
                    {'detail': 'Failed to delete account. Please try again.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
