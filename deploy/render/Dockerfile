# One image for the whole backend on Render's free web service: gunicorn serves the API and
# the evaluation worker runs beside it, because the free tier has no background worker.
# Build context is the repository root.
FROM python:3.12-slim

WORKDIR /app

# libpq for psycopg, curl for the container health check, nodejs for the rule engine
# subprocess (worker/evaluation/runner.mjs, called as /usr/bin/node).
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc curl nodejs \
    && node --version \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY backend /app/backend
COPY worker /app/worker
COPY deploy/render/start.sh /app/start.sh
# Set here rather than trusting the git file mode, which is lost on Windows checkouts.
RUN chmod 755 /app/start.sh

# The worker imports backend apps, so both source trees are on the path. The worker loop
# uses the backend settings, which already carry everything it needs (database, LLM, queue).
ENV PYTHONPATH=/app/backend:/app/worker \
    DJANGO_ENV=production \
    DJANGO_SETTINGS_MODULE=config.settings \
    PYTHONUNBUFFERED=1 \
    USE_SQS=false \
    HOME=/tmp

WORKDIR /app/backend

# Dummy values are only for collectstatic. Real ones come from the service environment.
RUN DJANGO_SECRET_KEY=build-time-placeholder \
    API_PUBLIC_URL=http://placeholder.invalid \
    FRONTEND_BASE_URL=http://placeholder.invalid \
    DJANGO_ALLOWED_HOSTS=placeholder.invalid \
    CORS_ALLOWED_ORIGINS=http://placeholder.invalid \
    CSRF_TRUSTED_ORIGINS=http://placeholder.invalid \
    python manage.py collectstatic --noinput

RUN useradd --system --no-create-home app && chown -R app /app
USER app

EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
    CMD curl -fsS "http://127.0.0.1:${PORT:-10000}/api/health/" || exit 1

CMD ["/app/start.sh"]
