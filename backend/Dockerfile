FROM python:3.12-slim

WORKDIR /app

# System deps (for psycopg2 etc.)
RUN apt-get update && apt-get install -y \
    libpq-dev gcc curl --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Default to production settings; runtime env can override to local.
ENV DJANGO_ENV=production
ENV DJANGO_SETTINGS_MODULE=backend_hub.settings

# Collect static
# Dummy vars only needed at build time for collectstatic
# Real values come from .env.production at runtime
RUN DJANGO_SECRET_KEY=build-time-placeholder \
    DJANGO_ENV=production \
    CORS_ALLOWED_ORIGINS=http://placeholder.com \
    CSRF_TRUSTED_ORIGINS=http://placeholder.com \
    DB_HOST=localhost \
    python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "backend_hub.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-"]
