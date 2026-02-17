from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from .models import Workspace
from permissions.models import WorkspaceMember
from permissions.checks import user_is_workspace_admin
from .serializers import WorkspaceSerializer
from core.constants import WorkspaceRole

class WorkspaceListCreateView(generics.ListCreateAPIView):
    serializer_class = WorkspaceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Workspace.objects.filter(members__user=self.request.user).distinct()

    def perform_create(self, serializer):
        workspace = serializer.save(owner=self.request.user)
        # Creator always becomes workspace ADMIN.
        WorkspaceMember.objects.create(
            workspace=workspace,
            user=self.request.user,
            role=WorkspaceRole.ADMIN,
        )

class WorkspaceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = WorkspaceSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        return Workspace.objects.filter(members__user=self.request.user).distinct()

    def _assert_admin(self, workspace):
        if not user_is_workspace_admin(workspace, self.request.user):
            raise PermissionDenied("Only workspace admins can modify workspace settings.")

    def perform_update(self, serializer):
        self._assert_admin(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._assert_admin(instance)
        instance.delete()
