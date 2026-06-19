from django.urls import path
from .views import CanvasListCreateView, CanvasDetailView

urlpatterns = [
    # This maps to: GET/POST /api/workspaces/<uuid>/canvases/
    path('', CanvasListCreateView.as_view(), name='canvas-list-create'),
    # This maps to: GET/PUT/DELETE /api/workspaces/<uuid>/canvases/<id>/
    path('<str:id>/', CanvasDetailView.as_view(), name='canvas-detail'),
]