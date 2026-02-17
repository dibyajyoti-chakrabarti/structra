from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.constants import WorkspaceRole
from workspaces.models import Workspace
from .checks import user_is_workspace_admin, user_is_workspace_member
from .models import WorkspaceMember
from .serializers import WorkspaceMemberSerializer


class WorkspaceMemberListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, workspace_id):
        workspace = get_object_or_404(Workspace, id=workspace_id)

        if not user_is_workspace_member(workspace, request.user):
            return Response(
                {"error": "You do not have access to this workspace."},
                status=status.HTTP_403_FORBIDDEN,
            )

        members = WorkspaceMember.objects.filter(workspace=workspace).select_related("user")
        serializer = WorkspaceMemberSerializer(members, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class WorkspaceMemberDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, workspace_id, user_id):
        workspace = get_object_or_404(Workspace, id=workspace_id)

        if not user_is_workspace_admin(workspace, request.user):
            return Response(
                {"error": "Action allowed only for admin."},
                status=status.HTTP_403_FORBIDDEN,
            )

        membership = WorkspaceMember.objects.filter(
            workspace=workspace,
            user__user_id=user_id,
        ).first()
        if not membership:
            return Response(
                {"error": "Member not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if membership.role == WorkspaceRole.ADMIN:
            return Response(
                {"error": "Admin members cannot be removed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        membership.delete()
        return Response({"message": "Member removed successfully."}, status=status.HTTP_200_OK)
