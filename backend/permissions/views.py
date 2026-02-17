from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from workspaces.models import Workspace
from .checks import user_is_workspace_member
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
