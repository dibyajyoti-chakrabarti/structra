from datetime import timedelta

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from canvases.models import Canvas
from permissions.checks import user_is_workspace_admin
from workspaces.models import Workspace

from .models import AuditLog, AuditScope
from .serializers import AuditLogSerializer


class WorkspaceAuditBaseView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_workspace(self, workspace_id):
        workspace = get_object_or_404(Workspace, id=workspace_id)
        if not user_is_workspace_admin(workspace, self.request.user):
            raise PermissionDenied("Audit logs are only accessible to workspace admins.")
        return workspace

    def apply_filters(self, queryset):
        scope = self.request.query_params.get("scope")
        category = self.request.query_params.get("category")
        status_filter = self.request.query_params.get("status")
        system_id = self.request.query_params.get("system_id")
        search = (self.request.query_params.get("q") or "").strip()

        if scope in {AuditScope.WORKSPACE, AuditScope.SYSTEM}:
            queryset = queryset.filter(scope=scope)
        if category and category != "all":
            queryset = queryset.filter(category=category)
        if status_filter and status_filter != "all":
            queryset = queryset.filter(status=status_filter)
        if system_id and system_id != "all":
            queryset = queryset.filter(system_id=system_id)
        if search:
            queryset = queryset.filter(
                Q(action__icontains=search)
                | Q(target_name__icontains=search)
                | Q(message__icontains=search)
                | Q(actor__email__icontains=search)
                | Q(actor__full_name__icontains=search)
                | Q(system__name__icontains=search)
            )
        return queryset


class WorkspaceAuditSummaryView(WorkspaceAuditBaseView):
    def get(self, request, workspace_id):
        workspace = self.get_workspace(workspace_id)
        cutoff = timezone.now() - timedelta(days=30)

        queryset = AuditLog.objects.filter(workspace=workspace, created_at__gte=cutoff)
        queryset = self.apply_filters(queryset)

        aggregate = queryset.aggregate(
            total_events=Count("id"),
            failed_actions=Count("id", filter=Q(status="error")),
            active_users=Count("actor_id", distinct=True),
        )

        return Response(
            {
                "total_events_30d": aggregate["total_events"] or 0,
                "failed_actions_30d": aggregate["failed_actions"] or 0,
                "active_users_30d": aggregate["active_users"] or 0,
            },
            status=status.HTTP_200_OK,
        )


class WorkspaceAuditSystemsView(WorkspaceAuditBaseView):
    def get(self, request, workspace_id):
        workspace = self.get_workspace(workspace_id)

        systems = (
            Canvas.objects.filter(workspace=workspace)
            .order_by("name")
            .values("id", "name")
        )

        return Response(
            [{"id": row["id"], "name": row["name"]} for row in systems],
            status=status.HTTP_200_OK,
        )


class WorkspaceAuditLogListView(WorkspaceAuditBaseView):
    def get(self, request, workspace_id):
        workspace = self.get_workspace(workspace_id)
        try:
            limit = int(request.query_params.get("limit", 100))
        except (TypeError, ValueError):
            limit = 100
        limit = max(1, min(limit, 500))

        queryset = (
            AuditLog.objects.filter(workspace=workspace)
            .select_related("actor", "system")
            .order_by("-created_at")
        )
        queryset = self.apply_filters(queryset)[:limit]

        serializer = AuditLogSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
