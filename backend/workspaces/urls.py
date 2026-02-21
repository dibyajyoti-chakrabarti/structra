from django.urls import path
from .views import (
    WorkspaceListCreateView,
    WorkspaceDetailView,
    PublicWorkspaceSearchView,
    StarredWorkspaceListView,
    WorkspaceStarToggleView,
)

urlpatterns = [
    path('', WorkspaceListCreateView.as_view(), name='workspace-list'),
    path('starred/', StarredWorkspaceListView.as_view(), name='workspace-starred-list'),
    path('public/search/', PublicWorkspaceSearchView.as_view(), name='workspace-public-search'),
    path('<str:id>/star/', WorkspaceStarToggleView.as_view(), name='workspace-star-toggle'),
    path('<str:id>/', WorkspaceDetailView.as_view(), name='workspace-detail'),
]
