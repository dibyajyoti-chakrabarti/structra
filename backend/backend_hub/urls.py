from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/workspaces/', include('workspaces.urls')),
    
    # ADD THIS LINE: Connects workspace IDs to canvas/system logic
    path('api/workspaces/<str:workspace_id>/canvases/', include('canvases.urls')),
]