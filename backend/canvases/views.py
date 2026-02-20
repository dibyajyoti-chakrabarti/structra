from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import SAFE_METHODS, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from core.constants import CanvasRole
from permissions.checks import (
    system_read_access_q,
    user_is_workspace_admin,
    user_has_system_access,
)
from permissions.models import CanvasPermission, WorkspaceMember
from workspaces.models import Workspace
from .models import Canvas
from .serializers import CanvasAutosaveSerializer, CanvasSerializer

class CanvasListCreateView(generics.ListCreateAPIView):
    serializer_class = CanvasSerializer
    permission_classes = [IsAuthenticated]

    def _get_workspace(self):
        if not hasattr(self, "_workspace_cache"):
            workspace_id = self.kwargs["workspace_id"]
            self._workspace_cache = get_object_or_404(Workspace, id=workspace_id)
        return self._workspace_cache

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["workspace"] = self._get_workspace()
        return context

    def get_queryset(self):
        workspace = self._get_workspace()
        workspace_id = workspace.id
        base_queryset = Canvas.objects.filter(workspace_id=workspace_id)

        if user_is_workspace_admin(workspace, self.request.user):
            return base_queryset

        return base_queryset.filter(system_read_access_q(self.request.user)).distinct()

    def _validate_member_permissions(self, workspace):
        member_permissions = self.request.data.get("member_permissions", [])
        if member_permissions is None:
            return []
        if not isinstance(member_permissions, list):
            raise ValidationError({"member_permissions": "Expected a list of member permissions."})

        validated_entries = []
        member_user_ids = {
            str(entry.get("user_id"))
            for entry in member_permissions
            if isinstance(entry, dict) and entry.get("user_id")
        }
        workspace_member_map = {
            str(member.user.user_id): member.user
            for member in WorkspaceMember.objects.filter(workspace=workspace).select_related("user")
            if str(member.user.user_id) in member_user_ids
        }

        for entry in member_permissions:
            if not isinstance(entry, dict):
                raise ValidationError({"member_permissions": "Each permission entry must be an object."})
            user_id = str(entry.get("user_id", "")).strip()
            role = str(entry.get("role", "")).strip().lower()

            if not user_id:
                raise ValidationError({"member_permissions": "Each entry must include user_id."})
            if role not in {CanvasRole.VIEWER, CanvasRole.COMMENTER, CanvasRole.EDITOR}:
                raise ValidationError({"member_permissions": f"Invalid role for user {user_id}."})

            target_user = workspace_member_map.get(user_id)
            if not target_user:
                raise ValidationError(
                    {"member_permissions": f"User {user_id} is not a member of this workspace."}
                )

            validated_entries.append((target_user, role))

        return validated_entries

    def perform_create(self, serializer):
        workspace = self._get_workspace()

        if not user_is_workspace_admin(workspace, self.request.user):
            raise PermissionDenied("Only workspace admins can create systems.")

        validated_permissions = self._validate_member_permissions(workspace)

        system = serializer.save(
            workspace=workspace,
            last_modified_by=self.request.user
        )

        for target_user, role in validated_permissions:
            CanvasPermission.objects.update_or_create(
                system=system,
                user=target_user,
                defaults={"role": role},
            )

        # Creator should always retain edit access to the system they create.
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

    def _get_workspace(self):
        if not hasattr(self, "_workspace_cache"):
            workspace_id = self.kwargs["workspace_id"]
            self._workspace_cache = get_object_or_404(Workspace, id=workspace_id)
        return self._workspace_cache

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["workspace"] = self._get_workspace()
        return context
    
    def get_queryset(self):
        workspace = self._get_workspace()
        workspace_id = workspace.id
        base_queryset = Canvas.objects.filter(workspace_id=workspace_id)

        if user_is_workspace_admin(workspace, self.request.user):
            return base_queryset

        if self.request.method in SAFE_METHODS:
            return base_queryset.filter(system_read_access_q(self.request.user)).distinct()

        return base_queryset.filter(
            permissions__user=self.request.user,
            permissions__role=CanvasRole.EDITOR,
        ).distinct()
    
    def perform_update(self, serializer):
        serializer.save(last_modified_by=self.request.user)


class CanvasAutosaveView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, id):
        system = get_object_or_404(Canvas, id=id)
        workspace = system.workspace

        can_edit = user_is_workspace_admin(workspace, request.user) or user_has_system_access(
            system,
            request.user,
            allowed_roles=[CanvasRole.EDITOR],
        )
        if not can_edit:
            raise PermissionDenied("You do not have permission to edit this system.")

        serializer = CanvasAutosaveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        system.canvas_state = serializer.validated_data["canvasState"]
        system.last_modified_by = request.user
        system.save(update_fields=["canvas_state", "last_modified_by", "updated_at"])

        return Response(
            {
                "id": str(system.id),
                "canvasState": system.canvas_state,
                "updatedAt": system.updated_at,
            },
            status=status.HTTP_200_OK,
        )
