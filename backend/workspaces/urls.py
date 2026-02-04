from django.urls import path
from .views import WorkspaceListCreateView, WorkspaceDetailView

urlpatterns = [
    path('', WorkspaceListCreateView.as_view(), name='workspace-list'),
    path('<str:id>/', WorkspaceDetailView.as_view(), name='workspace-detail'),
]