import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')

from mangum import Mangum
from config.asgi import application

handler = Mangum(application, lifespan="off")
