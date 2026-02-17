from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import SAFE_METHODS, IsAuthenticated
from rest_framework.response import Response
from core.constants import CanvasRole
from permissions.checks import (
    user_is_workspace_admin,
    user_is_workspace_member,
)
from permissions.models import CanvasPermission
from workspaces.models import Workspace
from .models import Canvas
from .serializers import CanvasSerializer

class CanvasListCreateView(generics.ListCreateAPIView):
    serializer_class = CanvasSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        workspace_id = self.kwargs['workspace_id']
        workspace = get_object_or_404(Workspace, id=workspace_id)

        if not user_is_workspace_member(workspace, self.request.user):
            raise PermissionDenied("You do not have access to this workspace.")

        base_queryset = Canvas.objects.filter(workspace_id=workspace_id)
        if user_is_workspace_admin(workspace, self.request.user):
            return base_queryset

        return base_queryset.filter(permissions__user=self.request.user).distinct()

    def perform_create(self, serializer):
        workspace_id = self.kwargs['workspace_id']
        workspace = get_object_or_404(Workspace, id=workspace_id)

        if not user_is_workspace_member(workspace, self.request.user):
            raise PermissionDenied("You do not have access to this workspace.")

        system = serializer.save(
            workspace_id=self.kwargs['workspace_id'],
            last_modified_by=self.request.user
        )
        # Creator should always retain edit access to the system they created.
        CanvasPermission.objects.update_or_create(
            system=system,
            user=self.request.user,
            defaults={"role": CanvasRole.EDITOR},
        )
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )


class CanvasDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CanvasSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    
    def get_queryset(self):
        workspace_id = self.kwargs['workspace_id']
        workspace = get_object_or_404(Workspace, id=workspace_id)

        if not user_is_workspace_member(workspace, self.request.user):
            raise PermissionDenied("You do not have access to this workspace.")

        base_queryset = Canvas.objects.filter(workspace_id=workspace_id)

        if user_is_workspace_admin(workspace, self.request.user):
            return base_queryset

        if self.request.method in SAFE_METHODS:
            return base_queryset.filter(permissions__user=self.request.user).distinct()

        return base_queryset.filter(
            permissions__user=self.request.user,
            permissions__role=CanvasRole.EDITOR,
        ).distinct()
    
    def perform_update(self, serializer):
        serializer.save(last_modified_by=self.request.user)
