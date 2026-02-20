from django.urls import path
from .views import CanvasAutosaveView

urlpatterns = [
    path("<str:id>/canvas/", CanvasAutosaveView.as_view(), name="system-canvas-autosave"),
]
