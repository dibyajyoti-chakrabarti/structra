from django.contrib import admin
from django.urls import path, include
from core.views import health_check

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check),
    path('api/auth/', include('accounts.urls')),
    path('api/workspaces/', include('workspaces.urls')),
    path('api/', include('permissions.urls')),
    path('api/', include('notifications.urls')),
    
    path('api/workspaces/<str:workspace_id>/canvases/', include('canvases.urls')),
    path('api/systems/', include('canvases.system_urls')),
]
