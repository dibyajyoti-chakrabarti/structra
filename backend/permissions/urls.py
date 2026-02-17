from django.urls import path
from .views import WorkspaceMemberListView


urlpatterns = [
    path(
        "workspaces/<str:workspace_id>/members/",
        WorkspaceMemberListView.as_view(),
        name="workspace-members",
    ),
]
