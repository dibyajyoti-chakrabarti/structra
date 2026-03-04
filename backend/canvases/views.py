from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import SAFE_METHODS, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from audit.services import record_system_event, record_workspace_event
from core.constants import CanvasRole
from permissions.checks import (
    check_workspace_entitlement,
    get_workspace_admin_plan,
    resolve_canvas_role,
    system_read_access_q,
    user_is_workspace_admin,
    user_has_system_read_access,
    user_has_system_access,
)
from core.pricing import get_system_limit_for_workspace_plan
from permissions.models import CanvasPermission, WorkspaceMember
from workspaces.models import Workspace
from .models import Canvas, CanvasComment
from .serializers import (
    CanvasAutosaveSerializer,
    CanvasCommentCreateSerializer,
    CanvasCommentSerializer,
    CanvasSerializer,
)

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
        entitlement = check_workspace_entitlement(
            user_id=self.request.user.user_id,
            workspace_id=workspace.id,
            feature="create_system",
        )
        if not entitlement["allowed"]:
            raise PermissionDenied(entitlement["reason"] or "Only workspace admins can create systems.")

        workspace_plan = entitlement.get("plan") or get_workspace_admin_plan(workspace)
        system_limit = get_system_limit_for_workspace_plan(workspace_plan)
        if system_limit is not None:
            existing_system_count = Canvas.objects.filter(workspace=workspace).count()
            if existing_system_count >= system_limit:
                raise ValidationError(
                    {"error": f"{workspace_plan} workspaces can only have up to {system_limit} systems."}
                )

        validated_permissions = self._validate_member_permissions(workspace)

        system = serializer.save(
            workspace=workspace,
            last_modified_by=self.request.user
        )

        record_system_event(
            workspace=workspace,
            system=system,
            actor=self.request.user,
            request=self.request,
            category="system",
            action="System Created",
            target_name=system.name,
            target_id=system.id,
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
        system = serializer.instance
        previous_name = system.name
        previous_visibility = system.visibility

        updated_system = serializer.save(last_modified_by=self.request.user)

        changed_fields = []
        if previous_name != updated_system.name:
            changed_fields.append("name")
        if previous_visibility != updated_system.visibility:
            changed_fields.append("visibility")

        record_system_event(
            workspace=updated_system.workspace,
            system=updated_system,
            actor=self.request.user,
            request=self.request,
            category="system",
            action="System Updated",
            target_name=updated_system.name,
            target_id=updated_system.id,
            metadata={"changed_fields": changed_fields},
        )

    def perform_destroy(self, instance):
        record_workspace_event(
            workspace=instance.workspace,
            actor=self.request.user,
            request=self.request,
            category="system",
            action="System Deleted",
            target_name=instance.name,
            target_id=instance.id,
        )
        instance.delete()


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


class SystemCommentListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_system(self, system_id):
        return get_object_or_404(Canvas, id=system_id)

    def _assert_read_access(self, system, user):
        if not user_has_system_read_access(system, user):
            raise PermissionDenied("You do not have access to this system.")

    def _assert_can_comment(self, system, user):
        effective_role = resolve_canvas_role(system, user)
        is_member = WorkspaceMember.objects.filter(
            workspace=system.workspace,
            user=user,
        ).exists()
        if not is_member or effective_role not in {CanvasRole.EDITOR, CanvasRole.COMMENTER}:
            raise PermissionDenied("You do not have permission to add comments.")

    def get(self, request, system_id):
        system = self._get_system(system_id)
        self._assert_read_access(system, request.user)

        comments = (
            CanvasComment.objects.filter(system=system, parent__isnull=True)
            .select_related("author")
            .prefetch_related("replies__author")
            .order_by("created_at")
        )
        serializer = CanvasCommentSerializer(
            comments,
            many=True,
            context={"request": request},
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, system_id):
        system = self._get_system(system_id)
        self._assert_read_access(system, request.user)
        self._assert_can_comment(system, request.user)

        serializer = CanvasCommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        parent = None
        parent_id = serializer.validated_data.get("parent")
        if parent_id:
            parent = get_object_or_404(CanvasComment, id=parent_id, system=system)

        comment = CanvasComment.objects.create(
            system=system,
            author=request.user,
            body=serializer.validated_data["body"],
            parent=parent,
        )
        output_serializer = CanvasCommentSerializer(comment, context={"request": request})
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class SystemCommentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_comment(self, system_id, comment_id):
        return get_object_or_404(
            CanvasComment.objects.select_related("system", "author", "system__workspace"),
            id=comment_id,
            system_id=system_id,
        )

    def _assert_read_access(self, system, user):
        if not user_has_system_read_access(system, user):
            raise PermissionDenied("You do not have access to this system.")

    def _assert_can_modify(self, comment, user):
        if comment.author_id == user.user_id:
            return
        if user_is_workspace_admin(comment.system.workspace, user):
            return
        raise PermissionDenied("You do not have permission to modify this comment.")

    def patch(self, request, system_id, comment_id):
        comment = self._get_comment(system_id, comment_id)
        self._assert_read_access(comment.system, request.user)
        self._assert_can_modify(comment, request.user)

        serializer = CanvasCommentCreateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        if "body" in serializer.validated_data:
            comment.body = serializer.validated_data["body"]
            comment.save(update_fields=["body", "updated_at"])

        output_serializer = CanvasCommentSerializer(comment, context={"request": request})
        return Response(output_serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, system_id, comment_id):
        comment = self._get_comment(system_id, comment_id)
        self._assert_read_access(comment.system, request.user)
        self._assert_can_modify(comment, request.user)
        comment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
