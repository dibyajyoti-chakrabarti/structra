# Structra Backend

## Overview

Structra Backend is the Django and Django REST Framework service that powers the platform API for `structra.cloud`. It owns authentication, workspace lifecycle, system persistence, collaboration permissions, invitations, notifications, audit logging, evaluation orchestration, usage accounting, and subscription billing.

This layer is intentionally isolated to handle:
- Business rules and policy enforcement
- Persistent data models and relational integrity
- API contracts for frontend and external integrations
- Asynchronous evaluation dispatch and run tracking
- Credits, tokens, seat limits, and billing state

It does **not** own browser routing, presentation logic, marketing pages, or documentation rendering. Those concerns belong to the frontend and docs applications.

---

## High-Level Backend Flow

1. A client authenticates through password, OTP, or OAuth-backed flows
2. The backend issues or validates JWT-based access
3. Users create and manage workspaces, systems, permissions, and invitations
4. System designs are saved, commented on, and evaluated through API endpoints
5. Audit events, notifications, and usage accounting are recorded around those actions
6. Billing and subscription events update seat counts and entitlement state

---

## Application Features & Functional Breakdown

---

## 1. Health & Core Platform Surface

The backend exposes a health endpoint used by the frontend to gate application startup.

### Available Capability
- `GET /api/health/`

### Purpose
- Confirm service availability before loading product workflows
- Support infrastructure and uptime checks

---

## 2. Authentication & Identity Management

Authentication is one of the main trust boundaries in the backend.

### Supported Access Methods
- Email and password registration
- Email or username login
- JWT access and refresh token flow
- Google OAuth login
- GitHub OAuth login
- Email OTP request and verification
- Password reset request, validation, and confirmation

### Identity Features
- Authenticated profile retrieval and update
- Public user profile lookup by username
- Username availability checks
- User search with search-friendly matching

### Isolation Boundary
- The backend owns identity verification, token issuance, and account persistence
- The frontend only consumes these APIs and renders states

---

## 3. Workspace Lifecycle Management

Workspaces are the main collaboration container in Structra.

### Available Capabilities
- Create workspace
- List accessible workspaces
- Retrieve workspace details
- Update workspace metadata
- Delete workspace
- Search public workspaces
- Star and unstar workspaces
- List starred workspaces

### Workspace Rules
- Creator is automatically added as an admin member
- Visibility can be public or private
- Workspace creation is plan-aware and limit-aware

### Purpose
- Provide a stable collaboration boundary for teams and systems
- Separate private team design from discoverable public assets

---

## 4. System (Canvas) Lifecycle

Systems, called canvases in the backend, represent the actual design artifacts under a workspace.

### Available Capabilities
- Create systems under a workspace
- List workspace systems
- Retrieve a single system
- Update system data and metadata
- Delete a system
- Persist autosaved canvas state
- Manage per-system visibility

### Data Owned by This Module
- System metadata
- Canvas graph state
- Description and presentation-related state
- Archival and visibility markers

### Design Goal
- Keep the design artifact authoritative in one backend domain while allowing multiple frontend experiences over it

---

## 5. Collaboration Permissions & Membership

This module enforces who can see, comment on, or edit workspace and system content.

### Membership Features
- Workspace member listing
- Workspace member removal
- Membership lifecycle tracking with join and leave timestamps
- Workspace roles:
  - `ADMIN`
  - `MEMBER`

### System Permission Features
- Permission matrix listing across workspace systems
- Grant per-system access
- Revoke per-system access
- Supported system roles:
  - `viewer`
  - `commenter`
  - `editor`

### Enforcement Model
- Centralized permission checks are shared across views
- Authorization truth stays in the backend even when the frontend hides or shows controls conditionally

---

## 6. Comments, Invitations & Notifications

These features support day-to-day team collaboration and admin awareness.

### System Comment Features
- List comments
- Create comments
- Reply to comments
- Edit comments
- Delete comments

### Invitation Features
- Create workspace invitations by email
- Resend or reuse pending invitation flows
- Cancel invitations
- Fetch invitation details
- Accept invitations
- Reject invitations
- Enforce invitation expiry windows
- Enforce seat-aware invitation limits

### Notification Features
- Admin notification feed based on audit events
- Mark a single notification as read
- Mark all notifications as read
- List authenticated user invitations

---

## 7. Audit Logging

Audit logging gives workspace administrators traceability across critical product actions.

### Available Capabilities
- Record structured audit events
- Track event scope, category, metadata, and result status
- Provide audit summary metrics
- Provide audit log browsing with filters
- Provide system listing for audit filter UIs

### Audit Coverage
- Workspace actions
- System actions
- Security and permission changes
- Invitation and collaboration events
- Evaluation-related activity

### Purpose
- Support accountability
- Improve workspace-level operational visibility
- Feed notification surfaces and administrative review

---

## 8. Evaluation Engine & AI Integration

The evaluation pipeline is one of the most product-specific backend responsibilities.

### Available Capabilities
- Accept evaluation requests for system designs
- Persist evaluation runs and output
- Expose evaluation run status polling
- Expose workspace evaluation history
- Support AI evaluation endpoints
- Report insight-token status

### Evaluation Data Stored
- Run status
- Score
- Summary
- Rule results
- Suggestions
- Error details
- Token consumption context

### Execution Modes
- Local execution mode for development
- Optional AWS SQS dispatch for production-style async processing

### Control Mechanisms
- Workspace-level hourly evaluation caps
- Queue-dispatch-aware token refund behavior on failure

---

## 9. Credits, Tokens & Usage Accounting

Structra uses explicit consumption models for AI-backed product features.

### Available Capabilities
- Maintain AI credit pools
- Apply plan-based monthly allocations
- Expand pools through team seats
- Enforce purchased-pack and overage-aware consumption order
- Track workspace credit usage
- Maintain insight-token allocation and consumption state
- Support owner-shared pools and workspace pools depending on plan shape
- Apply soft-throttle controls for heavy usage patterns

### Purpose
- Keep paid AI features measurable
- Prevent abuse
- Preserve predictable entitlement behavior across plan tiers

---

## 10. Billing & Subscription Management

Billing logic is backend-owned even when checkout begins from the frontend.

### Available Capabilities
- Create Razorpay checkout subscriptions
- Create and verify payment orders
- Cancel subscriptions
- Request plan downgrades with validation
- Ingest Razorpay webhooks
- Validate webhook signatures
- Track webhook idempotency
- Synchronize seat counts from subscription quantity changes

### Supported Billing Events
- `subscription.charged`
- `subscription.updated`
- `subscription.cancelled`
- `subscription.halted`

### Isolation Boundary
- Frontend triggers checkout and status actions
- Backend validates, persists, and reconciles billing truth

---

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
- `GET /api/invitations/`
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

---

## Project Structure

```text
backend/
├── backend_hub/          # Django project configuration and settings
├── accounts/             # Auth, OTP, OAuth, profile, user endpoints
├── workspaces/           # Workspace lifecycle, starring, discovery, credits
├── canvases/             # System CRUD, autosave, comments, evaluation APIs
├── permissions/          # Membership and per-system access control
├── notifications/        # Invitations and admin notification feed
├── audit/                # Audit models, services, filters, summary endpoints
├── payments/             # Subscription billing, verification, webhooks
├── core/                 # Shared constants, pricing helpers, utilities, health endpoint
├── manage.py
└── requirements.txt
```

---

## Technology Stack

- **Framework:** Django 6
- **API Layer:** Django REST Framework
- **Database:** PostgreSQL
- **Authentication:** SimpleJWT plus OAuth integrations
- **Billing:** Razorpay
- **Async Dispatch:** Optional AWS SQS support

---

## Configuration

Environment is loaded from:

- `backend/.env.local` when `DJANGO_ENV=local`
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

FRONTEND_INVITE_BASE_URL=http://localhost:5173/invite
FRONTEND_PASSWORD_RESET_URL=http://localhost:5173/reset-password

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=

EMAIL_HOST=
EMAIL_PORT=
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
DEFAULT_FROM_EMAIL=

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

---

## Local Development

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Default dev URL: `http://127.0.0.1:8000`

---

## Key Operational Notes

- Use local execution mode for evaluation while developing unless queue infrastructure is configured.
- Billing, invitation, and OAuth flows require environment variables and third-party credentials to be meaningful in local environments.
- Permission enforcement is backend-owned; frontend visibility alone must not be treated as security.
