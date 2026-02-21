from django.urls import path
from .views import CanvasAutosaveView, SystemCommentDetailView, SystemCommentListCreateView

urlpatterns = [
    path("<str:id>/canvas/", CanvasAutosaveView.as_view(), name="system-canvas-autosave"),
    path("<str:system_id>/comments/", SystemCommentListCreateView.as_view(), name="system-comments"),
    path(
        "<str:system_id>/comments/<uuid:comment_id>/",
        SystemCommentDetailView.as_view(),
        name="system-comment-detail",
    ),
]
