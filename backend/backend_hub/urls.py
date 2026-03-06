from django.contrib import admin
from django.urls import path, include
from core.views import health_check
from canvases.evaluation_views import (
    AIEvaluationAPIView,
    EvaluateAPIView,
    EvaluationRunStatusAPIView,
    InsightTokenStatusAPIView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check),
    path('api/auth/', include('accounts.urls')),
    path('api/users/', include('accounts.user_urls')),
    path('api/workspaces/', include('workspaces.urls')),
    path('api/', include('permissions.urls')),
    path('api/', include('notifications.urls')),
    path('api/', include('audit.urls')),
    path('api/payments/', include('payments.urls')),
    
    path('api/workspaces/<str:workspace_id>/canvases/', include('canvases.urls')),
    path('api/systems/', include('canvases.system_urls')),
    path('api/evaluate/', EvaluateAPIView.as_view(), name='system-evaluate'),
    path('api/evaluate/<uuid:run_id>/', EvaluationRunStatusAPIView.as_view(), name='system-evaluate-status'),
    path('api/evaluation/ai/', AIEvaluationAPIView.as_view(), name='system-ai-evaluate'),
    path('api/evaluation/insight-tokens/', InsightTokenStatusAPIView.as_view(), name='workspace-insight-token-status'),
]
