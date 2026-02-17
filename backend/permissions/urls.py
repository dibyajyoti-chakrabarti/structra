from django.urls import path
from .views import WorkspaceMemberDeleteView, WorkspaceMemberListView


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
]
