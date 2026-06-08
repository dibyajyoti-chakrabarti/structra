FROM python:3.12-slim

WORKDIR /app

# Node.js is required for the rule engine subprocess (evaluation/runner.mjs).
RUN apt-get update && apt-get install -y \
    libpq-dev gcc nodejs npm --no-install-recommends \
    && node --version \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps from the backend's requirements (shared dependency set).
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Copy backend source for ORM access via PYTHONPATH.
COPY backend /app/backend

# Copy worker source.
COPY worker /app/worker

ENV PYTHONPATH=/app/backend
ENV DJANGO_ENV=production
ENV DJANGO_SETTINGS_MODULE=worker_hub.settings

WORKDIR /app/worker

CMD ["python", "evaluation_worker.py"]
