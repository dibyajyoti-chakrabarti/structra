from django.urls import path

from .views import (
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
    path("invitations/details/", InvitationDetailsView.as_view(), name="invitation-details"),
    path("invitations/accept/", InvitationAcceptView.as_view(), name="invitation-accept"),
    path("invitations/reject/", InvitationRejectView.as_view(), name="invitation-reject"),
]
