from django.urls import path

from .views import (
    WorkspaceAuditLogListView,
    WorkspaceAuditSummaryView,
    WorkspaceAuditSystemsView,
)

urlpatterns = [
    path(
        "workspaces/<str:workspace_id>/audit/summary/",
        WorkspaceAuditSummaryView.as_view(),
        name="workspace-audit-summary",
    ),
    path(
        "workspaces/<str:workspace_id>/audit/systems/",
        WorkspaceAuditSystemsView.as_view(),
        name="workspace-audit-systems",
    ),
    path(
        "workspaces/<str:workspace_id>/audit/logs/",
        WorkspaceAuditLogListView.as_view(),
        name="workspace-audit-logs",
    ),
]
