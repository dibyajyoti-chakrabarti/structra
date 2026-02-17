from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/workspaces/', include('workspaces.urls')),
    path('api/', include('permissions.urls')),
    path('api/', include('notifications.urls')),
    
    path('api/workspaces/<str:workspace_id>/canvases/', include('canvases.urls')),
]
