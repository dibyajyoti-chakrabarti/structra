# backend_hub/wsgi.py
import os
from django.core.wsgi import get_wsgi_application

# CHANGE THIS LINE
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_hub.settings.base')

application = get_wsgi_application()