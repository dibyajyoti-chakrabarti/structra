from rest_framework import generics, permissions
from .models import Workspace
from permissions.models import WorkspaceMember
from .serializers import WorkspaceSerializer

class WorkspaceListCreateView(generics.ListCreateAPIView):
    serializer_class = WorkspaceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Workspace.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        workspace = serializer.save(owner=self.request.user)
        # Automatically add the owner to the membership table so count is accurate
        WorkspaceMember.objects.create(workspace=workspace, user=self.request.user)

class WorkspaceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = WorkspaceSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        return Workspace.objects.filter(owner=self.request.user)