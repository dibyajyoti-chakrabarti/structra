from django.urls import path

from .views import (
    InvitationAcceptView,
    InvitationDetailsView,
    WorkspaceInvitationCreateView,
)


urlpatterns = [
    path(
        "workspaces/<str:workspace_id>/invitations/",
        WorkspaceInvitationCreateView.as_view(),
        name="workspace-invitations-create",
    ),
    path("invitations/details/", InvitationDetailsView.as_view(), name="invitation-details"),
    path("invitations/accept/", InvitationAcceptView.as_view(), name="invitation-accept"),
]
