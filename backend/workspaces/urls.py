from django.urls import path
from .views import WorkspaceListCreateView, WorkspaceDetailView, PublicWorkspaceSearchView

urlpatterns = [
    path('', WorkspaceListCreateView.as_view(), name='workspace-list'),
    path('public/search/', PublicWorkspaceSearchView.as_view(), name='workspace-public-search'),
    path('<str:id>/', WorkspaceDetailView.as_view(), name='workspace-detail'),
]
