import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_hub.settings.production')

from mangum import Mangum
from backend_hub.asgi import application

handler = Mangum(application, lifespan="off")
