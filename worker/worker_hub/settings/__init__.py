import os

env = os.getenv('DJANGO_ENV', 'production').lower()
if env == 'local':
    from .local import *  # noqa: F401,F403
else:
    from .production import *  # noqa: F401,F403
