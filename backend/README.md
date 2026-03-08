# Structra Cloud Backend

Django + Django REST Framework backend for `structra.cloud`.

This service provides the full API surface for identity, workspaces, systems (canvases), collaboration permissions, invitations, audit logs, AI evaluation orchestration, insight-token and AI-credit accounting, and Razorpay subscription billing.

## Tech Stack

- Django 6
- Django REST Framework
- PostgreSQL
- JWT auth (`djangorestframework-simplejwt`)
- Razorpay subscriptions + webhook processing
- Optional AWS SQS-based evaluation job dispatch

## Core Product Capabilities

### 1. Identity, Auth, and User Account

- Email/password registration and login
- Identifier-based login (`email` or `username`)
- JWT issue + refresh with expiry enforcement
- Google OAuth login
- GitHub OAuth login
- Email OTP request/verify for login and signup
- Password reset flow:
  - request
  - token validation
  - confirm reset
- Public user profile endpoint
- Username availability + trigram user search

### 2. Workspace Lifecycle and Discovery

- Create/list/update/delete workspaces
- Auto-assign creator as workspace admin member
- Workspace visibility: `public` / `private`
- Public workspace search using weighted full-text + trigram ranking
- Star/unstar workspace
- Starred workspace list endpoint
- Plan-aware workspace creation limits

### 3. System (Canvas) Lifecycle and Collaboration

- List/create systems under workspace
- Retrieve/update/delete system
- Autosave endpoint for canvas graph state
- Plan-aware per-workspace system creation limits
- Per-system visibility controls
- System comments:
  - list
  - create
  - reply
  - edit
  - delete

### 4. Permissions and Access Control

- Workspace membership model with active membership lifecycle (`joined_at`, `left_at`)
- Workspace roles: `ADMIN`, `MEMBER`
- System-level permission model with roles:
  - `viewer`
  - `commenter`
  - `editor`
- Admin-only member removal (non-admin members)
- Admin-only grant/revoke system permissions
- Workspace-wide system permission matrix listing
- Centralized permission checks used across views

### 5. Invitations and Admin Notifications

- Workspace admin invite creation by email
- Invite resend behavior for still-pending invitations
- Invite cancellation
- Invitation acceptance/rejection endpoints
- 48-hour invitation expiry handling
- Seat/member-limit aware invitation enforcement
- Admin notification feed built on workspace audit events
- Mark-one and mark-all notification read states

### 6. Audit Logging

- Structured audit events for workspace/system/user/security/evaluation actions
- Event metadata and status support (`success`, `warning`, `error`)
- Audit summary endpoint (30-day totals/failures/active users)
- Audit logs endpoint with filters:
  - scope
  - category
  - status
  - system
  - query text
- Audit systems endpoint for filter UI support

### 7. Evaluation Engine Integration

- Evaluation request enqueue endpoint
- Async run status polling endpoint
- Workspace evaluation history endpoint
- AI evaluation compatibility endpoint (`/api/evaluation/ai/`)
- Per-workspace hourly evaluation cap (rate limiting)
- Evaluation run persistence:
  - score
  - summary
  - rule results
  - suggestions
  - errors
- Local execution mode (threaded worker) for dev
- Optional production dispatch through AWS SQS

### 8. Credits, Tokens, and Usage Enforcement

- AI credit pools with plan-sensitive monthly allocation
- Team seat-based pool expansion
- Purchased-pack / overage-aware credit consumption order
- Team soft-throttle enforcement per user (7-day usage window)
- Workspace credit consumption ledger
- Daily Insight Token allocation + consumption lifecycle
- Shared owner token pool for core/individual plans
- Workspace token pool behavior for team/enterprise
- Insight token refund on failed queue dispatch

### 9. Billing and Subscription Management

- Razorpay checkout subscription creation
- Payment verification endpoint
- Subscription cancellation endpoint
- Voluntary downgrade endpoint (guarded validation)
- Webhook ingestion with:
  - signature validation
  - event idempotency tracking
  - duplicate-safe processing
  - supported events: `subscription.charged`, `subscription.updated`, `subscription.cancelled`, `subscription.halted`
- Team seat synchronization from subscription quantity updates

## API Surface (High-Level)

### Health

- `GET /api/health/`

### Auth and Users

- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/token/refresh/`
- `GET/PATCH /api/auth/profile/`
- `POST /api/auth/google/`
- `POST /api/auth/github/`
- `POST /api/auth/email-otp/request/`
- `POST /api/auth/email-otp/verify/`
- `POST /api/auth/password-reset/request/`
- `POST /api/auth/password-reset/validate/`
- `POST /api/auth/password-reset/confirm/`
- `GET /api/users/search/`
- `GET /api/users/username-available/`
- `GET /api/users/<username>/profile/`

### Workspaces

- `GET/POST /api/workspaces/`
- `GET /api/workspaces/starred/`
- `GET /api/workspaces/public/search/`
- `PATCH /api/workspaces/<id>/star/`
- `GET/PATCH/DELETE /api/workspaces/<id>/`
- `GET /api/workspaces/<workspace_id>/evaluations/`

### Systems (Canvases)

- `GET/POST /api/workspaces/<workspace_id>/canvases/`
- `GET/PUT/DELETE /api/workspaces/<workspace_id>/canvases/<id>/`
- `PUT /api/systems/<id>/canvas/`
- `GET/POST /api/systems/<system_id>/comments/`
- `PATCH/DELETE /api/systems/<system_id>/comments/<comment_id>/`

### Permissions

- `GET /api/workspaces/<workspace_id>/members/`
- `DELETE /api/workspaces/<workspace_id>/members/<user_id>/`
- `GET /api/workspaces/<workspace_id>/system-permissions/`
- `POST /api/workspaces/<workspace_id>/systems/<system_id>/permissions/`
- `DELETE /api/workspaces/<workspace_id>/systems/<system_id>/permissions/<user_id>/`

### Invitations and Notifications

- `GET/POST /api/workspaces/<workspace_id>/invitations/`
- `DELETE /api/workspaces/<workspace_id>/invitations/<token>/`
- `GET /api/invitations/details/`
- `POST /api/invitations/accept/`
- `POST /api/invitations/reject/`
- `GET /api/notifications/feed/`
- `POST /api/notifications/<audit_log_id>/read/`
- `POST /api/notifications/mark-all-read/`

### Audit

- `GET /api/workspaces/<workspace_id>/audit/summary/`
- `GET /api/workspaces/<workspace_id>/audit/systems/`
- `GET /api/workspaces/<workspace_id>/audit/logs/`

### Evaluation

- `POST /api/evaluate/`
- `GET /api/evaluate/<run_id>/`
- `POST /api/evaluation/ai/`
- `GET /api/evaluation/insight-tokens/?workspaceId=<id>`

### Payments

- `POST /api/payments/checkout/`
- `POST /api/payments/orders/create/`
- `POST /api/payments/orders/verify/`
- `POST /api/payments/subscriptions/cancel/`
- `POST /api/payments/subscriptions/downgrade/`
- `POST /api/payments/webhook/`

## Project Structure

```text
backend/
├── backend_hub/          # Django project (settings/urls)
├── accounts/             # Auth, profile, OTP, OAuth
├── workspaces/           # Workspace + evaluation run + credit models
├── canvases/             # System CRUD, autosave, comments, evaluation APIs
├── permissions/          # Membership and system permissions
├── notifications/        # Invitations + admin notification feed
├── audit/                # Audit models/services/views
├── payments/             # Billing, subscriptions, webhook handling
├── core/                 # Shared constants, helpers, response patterns
├── manage.py
└── requirements.txt
```

## Configuration

Environment is loaded from:

- `backend/.env.local` when `DJANGO_ENV=local` (default)
- `backend/.env.production` when `DJANGO_ENV=production`
- project root `.env` as fallback

### Common Required Variables

```bash
DJANGO_ENV=local
DJANGO_SECRET_KEY=change-me
DB_ENGINE=django.db.backends.postgresql
DB_NAME=structra
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

# Frontend links
FRONTEND_INVITE_BASE_URL=http://localhost:5173/invite
FRONTEND_PASSWORD_RESET_URL=http://localhost:5173/reset-password

# OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Email (OTP + reset + invite)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
DEFAULT_FROM_EMAIL=

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
RAZORPAY_PLAN_ID_INDIVIDUAL=
RAZORPAY_PLAN_ID_TEAM=

# Optional async evaluation queue
USE_SQS=false
SQS_QUEUE_URL=
AWS_REGION=ap-south-2

# Production
CORS_ALLOWED_ORIGINS=http://localhost:5173
CSRF_TRUSTED_ORIGINS=http://localhost:5173
```

## Local Development

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

API base URL: `http://127.0.0.1:8000/api/`

## Optional: SQS Evaluation Worker

If `USE_SQS=true`, run the worker process separately:

```bash
python -m canvases.sqs_worker
```

## Tests

```bash
python manage.py test
```

## Notes

- PostgreSQL is expected in normal operation (trigram/full-text queries and indexes are used).
- Production settings enforce explicit `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`.
