# Chapter 4 — Backend Service

The backend is a **Django 6 REST API** that owns all persistent data, authorization, and business policy. It runs as a container-image Lambda behind AWS API Gateway, adapted by Mangum.

---

## Django Apps

| App | Responsibility |
|---|---|
| `accounts` | User model, auth (OTP, Google, GitHub), JWT validation, profile, username search, plan enforcement |
| `workspaces` | Workspace CRUD, starring, public discovery, AI credit accounting, evaluation run tracking |
| `systems` | System (canvas) CRUD, autosave, comments, evaluation dispatch + queue publishing |
| `permissions` | Workspace membership, per-system access control, role management |
| `notifications` | Workspace invitations, notification feed |
| `audit` | Audit log model, event recording, summary endpoints |
| `payments` | Razorpay checkout, orders, subscription webhooks, plan state sync |
| `core` | Shared constants, pricing helpers, health endpoint |

---

## API Endpoints

### Health

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health/` | DB-aware; returns 503 while RDS is starting (triggers "sleeping" page in frontend) |

### Auth

| Method | Path |
|---|---|
| POST | `/api/auth/register/` |
| POST | `/api/auth/login/` |
| POST | `/api/auth/logout/` |
| POST | `/api/auth/token/refresh/` |
| POST | `/api/auth/google/` |
| POST | `/api/auth/github/` |
| POST | `/api/auth/email-otp/initiate/` |
| POST | `/api/auth/email-otp/verify/` |
| POST | `/api/auth/password-reset/request/` |
| POST | `/api/auth/password-reset/confirm/` |

### Users

| Method | Path |
|---|---|
| GET | `/api/users/search/?q=` |
| GET | `/api/users/<username>/profile/` |
| GET/PATCH | `/api/users/me/` |

### Workspaces

| Method | Path |
|---|---|
| GET/POST | `/api/workspaces/` |
| GET/PATCH/DELETE | `/api/workspaces/<id>/` |
| GET | `/api/workspaces/public/search/?q=` |
| POST | `/api/workspaces/<id>/star/` |
| DELETE | `/api/workspaces/<id>/star/` |

### Systems (Canvases)

| Method | Path |
|---|---|
| GET/POST | `/api/workspaces/<id>/canvases/` |
| GET/PATCH/DELETE | `/api/workspaces/<ws_id>/canvases/<sys_id>/` |
| PUT | `/api/systems/<id>/canvas/` (autosave — canvas state) |
| GET/POST | `/api/workspaces/<id>/systems/<sys_id>/comments/` |

### Permissions & Members

| Method | Path |
|---|---|
| GET | `/api/workspaces/<id>/members/` |
| DELETE | `/api/workspaces/<id>/members/<user_id>/` |
| POST | `/api/workspaces/<id>/systems/<sys_id>/permissions/` |
| GET | `/api/workspaces/<id>/systems/<sys_id>/permissions/` |

### Invitations

| Method | Path |
|---|---|
| POST | `/api/workspaces/<id>/invitations/` |
| POST | `/api/invitations/accept/` |
| POST | `/api/invitations/decline/` |

### Notifications

| Method | Path |
|---|---|
| GET | `/api/notifications/feed/` |
| PATCH | `/api/notifications/<id>/read/` |

### Audit

| Method | Path |
|---|---|
| GET | `/api/workspaces/<id>/audit/logs/` |

### Evaluation

| Method | Path |
|---|---|
| POST | `/api/evaluate/` (triggers async evaluation) |
| GET | `/api/workspaces/<id>/evaluations/` |
| GET | `/api/workspaces/<id>/evaluations/<run_id>/` |
| GET | `/api/evaluation/insight-tokens/` |
| POST | `/api/internal/evaluations/<run_id>/result/` (worker callback — `X-Internal-Token`) |

The full mechanics behind the evaluation endpoints — dispatch through to the worker's callback — are in [Chapter 5](./ch_5_evaluation_pipeline.md), not repeated here.

### Payments

| Method | Path |
|---|---|
| POST | `/api/payments/checkout/` |
| POST | `/api/payments/webhook/` (Razorpay webhook) |
| GET | `/api/payments/subscription/` |
| POST | `/api/payments/seats/purchase/` |

---

## Authentication

All authenticated requests require a Cognito JWT as a Bearer token, validated by `CognitoJWTAuthentication` (`accounts/authentication.py`). The full 7-step validation flow — JWKS fetch/cache, signature verification, user provisioning, plan enforcement — is the canonical treatment in [Chapter 3](./ch_3_authentication.md#jwt-validation-in-the-backend). One detail worth repeating here: the JWKS fetch goes through the NAT instance, because the backend Lambda sits in a private VPC subnet (see [Chapter 2](./ch_2_architecture.md#nat-instance-t4gmicro-ec2)).

---

## Key Models

### `accounts.User`

Custom user model. Key fields:

| Field | Type | Notes |
|---|---|---|
| `email` | EmailField | Unique, used as primary identifier |
| `username` | CharField | Unique, auto-generated from email prefix, trigram-indexed for search |
| `cognito_sub` | CharField | Links to the Cognito user, set on first auth |
| `full_name` | CharField | |
| `avatar_url` | URLField | |
| `current_plan` | CharField | CORE / INDIVIDUAL / TEAM / ENTERPRISE |
| `plan_expires_at` | DateTimeField | Null = no expiry (lifetime) |
| `purchased_team_seats` | IntegerField | Extra seats above the plan default |

### `workspaces.Workspace`

| Field | Notes |
|---|---|
| `owner` | FK to User |
| `name`, `description` | |
| `visibility` | PUBLIC / PRIVATE |
| `ai_credits_monthly` | Monthly evaluation credits (plan-gated) |
| `ai_credits_used` | Consumed this billing period |
| `insight_tokens` | AI evaluation tokens (purchased or plan-granted) |
| `insight_tokens_consumed` | Total consumed |

### `workspaces.EvaluationRun`

Tracks a single evaluation job end-to-end.

| Field | Notes |
|---|---|
| `status` | PENDING → RUNNING → COMPLETED / FAILED |
| `canvas_state` | Snapshot of the canvas at time of evaluation |
| `workspace_tier` | Plan tier at time of evaluation (denormalized) |
| `score` | Overall score (0–100) |
| `results` | Per-rule pass/fail JSON |
| `summary` | `{applicable, passed, failed}` counts |
| `suggestions` | AI narrative text |
| `cloud_analysis` | Enterprise-tier second AI pass |
| `ai_error` | True if Bedrock returned no response |
| `insight_token_consumed` | Token was consumed for this run |
| `insight_tokens_remaining` | Remaining tokens after this run |

### `systems.Canvas`

| Field | Notes |
|---|---|
| `workspace` | FK to Workspace |
| `name`, `description` | |
| `canvas_state` | JSON — nodes + edges + metadata |
| `visibility` | PUBLIC / PRIVATE |
| `is_archived` | Soft delete |

### `permissions.WorkspaceMember`

| Field | Notes |
|---|---|
| `workspace` | FK |
| `user` | FK |
| `role` | OWNER / ADMIN / MEMBER / VIEWER |
| `is_starred` | User's personal star on this workspace |
| `lifecycle` | ACTIVE / PENDING / LEFT / REMOVED |

### `payments.PaymentTransaction`

| Field | Notes |
|---|---|
| `user` | FK |
| `razorpay_order_id` | |
| `razorpay_payment_id` | |
| `plan` | INDIVIDUAL / TEAM |
| `requested_seats` | For team seat purchases |
| `status` | PENDING / COMPLETED / FAILED |

---

## Lambda Deployment

- Packaged as a Docker container image stored in ECR
- `lambda_handler.py` is the entry point: uses **Mangum** to adapt the API Gateway event to an ASGI call
- `migrate_handler.py` is a separate Lambda entry point for running `manage.py migrate` (invoked by the `run-migrations` GitHub Actions workflow — see [Chapter 7](./ch_7_cicd.md#run-migrationsyml--database-migrations))
- VPC-attached: `security_group_ids` includes the backend security group; placed in private app subnets

### Production Settings (`config/settings/production.py`)

- `DEBUG = False`
- `ALLOWED_HOSTS` from env
- `CORS_ALLOWED_ORIGINS` from env (the CloudFront domain)
- Static files served from S3 (Whitenoise in Lambda mode)
- All secrets from environment variables (injected by Terraform from SSM — see [Chapter 6](./ch_6_infrastructure.md#secrets--ssm-parameter-store))

---

## Evaluation Dispatch (the backend's half)

When the browser calls `POST /api/evaluate/`:

1. Middleware checks insight token balance (`check_insight_tokens.py`)
2. `EvaluationRun` is created with `status=PENDING`, snapshot of `canvas_state` is stored
3. Insight token is consumed (deducted from workspace balance)
4. Job payload `{ runId, canvasState, workspaceTier }` is published to SQS via `systems/queue_publisher.py`
5. `202 Accepted` is returned immediately with the `run_id`

The browser polls `GET /api/workspaces/{id}/evaluations/{run_id}/` until `status` is `COMPLETED` or `FAILED`. What happens after the job hits SQS — the worker's consumption, compute, and callback — is told as one continuous story in [Chapter 5](./ch_5_evaluation_pipeline.md), rather than split here.

---

## Email

Transactional emails (workspace invitations, etc.) go through **Zoho SMTP** (`smtp.zoho.in:587`). Auth OTP emails are sent by the `create_auth` Cognito trigger Lambda (also Zoho SMTP — see [Chapter 3](./ch_3_authentication.md#smtp--email)). AWS SES is not used anywhere in the system.

---

## Management Commands

| Command | Purpose |
|---|---|
| `enforce_expired_subscriptions` | Downgrade users whose `plan_expires_at` has passed (run periodically) |
| `reset_ai_credits` | Reset monthly `ai_credits_used` counters (run at billing cycle) |

---

**See also:** [Chapter 3 — Authentication](./ch_3_authentication.md) for the JWT flow behind these endpoints · [Chapter 5 — The Evaluation Pipeline](./ch_5_evaluation_pipeline.md) for what happens after `/api/evaluate/` publishes to SQS.
