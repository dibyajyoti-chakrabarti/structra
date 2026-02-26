from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.services import record_system_event, record_workspace_event
from canvases.models import Canvas
from core.constants import WorkspaceRole
from workspaces.models import Workspace
from .checks import user_is_workspace_admin, user_is_workspace_member
from .models import CanvasPermission, WorkspaceMember
from .serializers import (
    CanvasPermissionGrantSerializer,
    CanvasPermissionSerializer,
    WorkspaceMemberSerializer,
)


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

        CanvasPermission.objects.filter(
            system__workspace=workspace,
            user=membership.user,
        ).delete()
        removed_member_name = membership.user.full_name or membership.user.email
        removed_member_id = str(membership.user.user_id)
        membership.delete()

        record_workspace_event(
            workspace=workspace,
            actor=request.user,
            request=request,
            category="user",
            action="Member Removed",
            target_name=removed_member_name,
            target_id=removed_member_id,
        )

        return Response({"message": "Member removed successfully."}, status=status.HTTP_200_OK)


class WorkspaceSystemPermissionListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, workspace_id):
        workspace = get_object_or_404(Workspace, id=workspace_id)

        if not user_is_workspace_admin(workspace, request.user):
            raise PermissionDenied("Action allowed only for admin.")

        systems = (
            Canvas.objects.filter(workspace=workspace)
            .order_by("-updated_at")
            .prefetch_related("permissions__user")
        )

        response_data = []
        for system in systems:
            permissions_data = CanvasPermissionSerializer(system.permissions.all(), many=True).data
            response_data.append(
                {
                    "system_id": system.id,
                    "system_name": system.name,
                    "visibility": system.visibility,
                    "permissions": permissions_data,
                }
            )

        return Response(response_data, status=status.HTTP_200_OK)


class SystemPermissionGrantView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, workspace_id, system_id):
        workspace = get_object_or_404(Workspace, id=workspace_id)

        if not user_is_workspace_admin(workspace, request.user):
            raise PermissionDenied("Action allowed only for admin.")

        system = get_object_or_404(Canvas, id=system_id, workspace=workspace)
        serializer = CanvasPermissionGrantSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_email = (serializer.validated_data.get("email") or "").strip()
        user_id = serializer.validated_data.get("user_id")
        role = serializer.validated_data["role"]

        if user_id:
            target_user = get_user_model().objects.filter(user_id=user_id).first()
        else:
            target_user = get_user_model().objects.filter(email__iexact=user_email).first()
        if not target_user:
            return Response(
                {"error": "Selected user does not exist."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not WorkspaceMember.objects.filter(workspace=workspace, user=target_user).exists():
            return Response(
                {"error": "User is not a member of this workspace. Invite them first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        permission, created = CanvasPermission.objects.update_or_create(
            system=system,
            user=target_user,
            defaults={"role": role},
        )

        record_system_event(
            workspace=workspace,
            system=system,
            actor=request.user,
            request=request,
            category="security",
            action="Permission Granted" if created else "Permission Updated",
            target_name=target_user.full_name or target_user.email,
            target_id=str(target_user.user_id),
            metadata={"role": role},
        )

        return Response(
            {
                "message": (
                    "System access granted successfully."
                    if created
                    else "System access updated successfully."
                ),
                "permission": CanvasPermissionSerializer(permission).data,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class SystemPermissionRevokeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, workspace_id, system_id, user_id):
        workspace = get_object_or_404(Workspace, id=workspace_id)

        if not user_is_workspace_admin(workspace, request.user):
            raise PermissionDenied("Action allowed only for admin.")

        system = get_object_or_404(Canvas, id=system_id, workspace=workspace)
        permission = CanvasPermission.objects.filter(system=system, user__user_id=user_id).first()
        if not permission:
            return Response(
                {"error": "Permission entry not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        target_user = permission.user
        target_role = permission.role
        permission.delete()

        record_system_event(
            workspace=workspace,
            system=system,
            actor=request.user,
            request=request,
            category="security",
            action="Permission Revoked",
            target_name=target_user.full_name or target_user.email,
            target_id=str(target_user.user_id),
            metadata={"role": target_role},
        )

        return Response({"message": "System access revoked successfully."}, status=status.HTTP_200_OK)
