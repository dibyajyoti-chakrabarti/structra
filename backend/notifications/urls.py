from django.urls import path

from .views import (
    AdminNotificationFeedView,
    AdminNotificationMarkAllReadView,
    AdminNotificationMarkReadView,
    InvitationAcceptView,
    InvitationDetailsView,
    InvitationRejectView,
    WorkspaceInvitationCancelView,
    WorkspaceInvitationCreateView,
)


urlpatterns = [
    path(
        "workspaces/<str:workspace_id>/invitations/",
        WorkspaceInvitationCreateView.as_view(),
        name="workspace-invitations-create",
    ),
    path(
        "workspaces/<str:workspace_id>/invitations/<str:token>/",
        WorkspaceInvitationCancelView.as_view(),
        name="workspace-invitations-cancel",
    ),
    path("notifications/feed/", AdminNotificationFeedView.as_view(), name="admin-notification-feed"),
    path(
        "notifications/<uuid:audit_log_id>/read/",
        AdminNotificationMarkReadView.as_view(),
        name="admin-notification-mark-read",
    ),
    path(
        "notifications/mark-all-read/",
        AdminNotificationMarkAllReadView.as_view(),
        name="admin-notification-mark-all-read",
    ),
    path("invitations/details/", InvitationDetailsView.as_view(), name="invitation-details"),
    path("invitations/accept/", InvitationAcceptView.as_view(), name="invitation-accept"),
    path("invitations/reject/", InvitationRejectView.as_view(), name="invitation-reject"),
]
