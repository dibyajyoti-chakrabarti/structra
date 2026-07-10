# Chapter 8 — Local Development

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for frontend without Docker)
- Python 3.12 (for backend/worker without Docker)
- `backend/.env.local` populated (see below)
- `frontend/.env.local` populated (see below)

---

## Quickstart — All Services with Docker

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Backend API | http://localhost:8000 |
| Frontend | http://localhost:5173 |
| Docs site | http://localhost:3000 |
| PostgreSQL | `localhost:5432` (user: `postgres`, db: `structra`) |

On first run, the `migrate` service runs `manage.py migrate` before the backend and worker start.

### Docker Compose Services

| Service | Description |
|---|---|
| `db` | PostgreSQL 16 |
| `migrate` | Runs Django migrations once, then exits |
| `backend` | Django `runserver` — live reload via volume mount |
| `worker` | Evaluation worker — live reload (mounts `./worker` + `./backend`) |
| `frontend` | Vite dev server with HMR |
| `docs` | Docusaurus dev server |

---

## Environment Files

### `backend/.env.local`

```bash
DJANGO_ENV=local
DJANGO_SECRET_KEY=change-me

# Database
DB_ENGINE=django.db.backends.postgresql
DB_NAME=structra
DB_USER=postgres
DB_PASSWORD=structra_root
DB_HOST=localhost
DB_PORT=5432

# Cognito (required for JWT auth in local dev)
COGNITO_USER_POOL_ID=ap-south-1_QD5vjF5ej
COGNITO_CLIENT_ID=<app-client-id>

# OAuth (optional — only needed for Google/GitHub login)
GOOGLE_CLIENT_ID=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Email / SMTP (optional — only needed for invitation emails)
EMAIL_HOST=smtp.zoho.in
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=<your-smtp-user>
EMAIL_HOST_PASSWORD=
DEFAULT_FROM_EMAIL=<your-smtp-user>

# Frontend
FRONTEND_INVITE_BASE_URL=http://localhost:5173/invite
CORS_ALLOWED_ORIGINS=http://localhost:5173
CSRF_TRUSTED_ORIGINS=http://localhost:5173
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

# Razorpay (optional — only needed for payment flows)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
RAZORPAY_PLAN_ID_INDIVIDUAL=
RAZORPAY_PLAN_ID_TEAM=

# Bedrock (optional — only needed if testing AI evaluation locally)
BEDROCK_REGION=ap-south-1
BEDROCK_MODEL_ID=us.meta.llama3-3-70b-instruct-v1:0
AWS_PROFILE=structra

# Queue — local DB mode (no SQS needed)
USE_SQS=false
EVALUATION_LOCAL_QUEUE_POLL_INTERVAL_SECONDS=5
EVALUATION_LOCAL_QUEUE_RETRY_DELAY_SECONDS=10
EVALUATION_LOCAL_QUEUE_MAX_ATTEMPTS=3
EVALUATION_LOCAL_QUEUE_LOCK_TIMEOUT_SECONDS=300

# Internal worker callback
INTERNAL_API_TOKEN=dev-internal-token
```

### `frontend/.env.local`

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000/api/
VITE_FRONTEND_URL=http://localhost:5173
VITE_GOOGLE_CLIENT_ID=
VITE_GITHUB_CLIENT_ID=
VITE_RAZORPAY_KEY_ID=
```

---

## Without Docker

### Backend Only

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Worker Only

```bash
cd worker
pip install -r requirements-worker.txt
PYTHONPATH=../backend DJANGO_ENV=local python evaluation_worker.py
```

The worker shares models with the backend by setting `PYTHONPATH=../backend`. In local mode (`USE_SQS=false`) it polls the `EvaluationQueueJob` table every 5 seconds — the same `LocalQueue` abstraction described in [Chapter 5](./ch_5_evaluation_pipeline.md#queue-abstraction).

### Frontend Only

```bash
cd frontend
npm install
npm run dev
```

### Docs Only

```bash
cd docs
npm install
npm start
```

---

## Running Tests

### Backend Tests

```bash
cd backend
python manage.py test
```

Or with pytest (if installed):

```bash
cd backend
pytest
```

Tests use Django's test runner with a temporary test database. No external services needed — Cognito, Bedrock, SQS, and Razorpay calls are mocked.

### Worker Tests

```bash
cd worker
PYTHONPATH=../backend DJANGO_ENV=local python -m pytest tests/
```

---

## Database Migrations

```bash
# Create a new migration
python manage.py makemigrations <app_name>

# Apply migrations
python manage.py migrate

# In production (runs via GitHub Actions → Lambda invocation)
# gh workflow run run-migrations.yml
```

Production migrations run through a different path entirely — see [Chapter 7](./ch_7_cicd.md#run-migrationsyml--database-migrations).

---

## Testing an Evaluation Locally

1. Start all services with `docker compose up`
2. Log in via the frontend (`http://localhost:5173`)
3. Create a workspace and a system canvas
4. Add some nodes and edges to the canvas
5. Click "Run Evaluation" — the backend creates an `EvaluationQueueJob` row
6. The worker (running in Docker) polls the queue, processes the job, and writes the result back to the DB
7. The frontend polls the evaluation status and renders the results

The local worker calls Bedrock directly (requires `AWS_PROFILE=structra` in the env and the `structra` AWS profile configured locally). If you don't need AI suggestions, the rule engine will still run and produce scores even if Bedrock fails. Compare this against the production flow in [Chapter 5](./ch_5_evaluation_pipeline.md#the-full-flow) — same compute, different queue and persistence path.

---

## Useful Commands

```bash
# Rebuild a single service
docker compose build backend

# View logs for a single service
docker compose logs -f worker

# Run a Django management command
docker compose exec backend python manage.py shell

# Access the database
docker compose exec db psql -U postgres -d structra

# Wipe everything and start fresh
docker compose down -v && docker compose up --build
```

---

## Local vs Production Differences

| Feature | Local | Production |
|---|---|---|
| Queue | DB table (`EvaluationQueueJob`) | AWS SQS |
| Worker trigger | Polling loop (5s interval) | SQS event source mapping |
| Worker DB writes | Direct ORM (via `PYTHONPATH`) | HTTP callback to backend |
| Auth | Cognito JWT (real pool) | Cognito JWT (real pool) |
| AI | Bedrock (real, needs AWS profile) | Bedrock (Lambda role) |
| Secrets | `.env.local` file | SSM Parameter Store → Lambda env |
| Email | Zoho SMTP (real or mock) | Zoho SMTP (via Cognito trigger) |

---

**See also:** [Chapter 5 — The Evaluation Pipeline](./ch_5_evaluation_pipeline.md) for what the worker does with a dequeued job · [Chapter 7 — CI/CD](./ch_7_cicd.md) for how these same services get built and deployed to production.
