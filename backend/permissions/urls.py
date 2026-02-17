from django.urls import path
from .views import (
    SystemPermissionGrantView,
    SystemPermissionRevokeView,
    WorkspaceMemberDeleteView,
    WorkspaceMemberListView,
    WorkspaceSystemPermissionListView,
)


urlpatterns = [
    path(
        "workspaces/<str:workspace_id>/members/",
        WorkspaceMemberListView.as_view(),
        name="workspace-members",
    ),
    path(
        "workspaces/<str:workspace_id>/members/<uuid:user_id>/",
        WorkspaceMemberDeleteView.as_view(),
        name="workspace-member-delete",
    ),
    path(
        "workspaces/<str:workspace_id>/system-permissions/",
        WorkspaceSystemPermissionListView.as_view(),
        name="workspace-system-permissions",
    ),
    path(
        "workspaces/<str:workspace_id>/systems/<str:system_id>/permissions/",
        SystemPermissionGrantView.as_view(),
        name="system-permission-grant",
    ),
    path(
        "workspaces/<str:workspace_id>/systems/<str:system_id>/permissions/<uuid:user_id>/",
        SystemPermissionRevokeView.as_view(),
        name="system-permission-revoke",
    ),
]
