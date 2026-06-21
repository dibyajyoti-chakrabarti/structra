# Structra — Project Overview

## What is Structra?

Structra is a collaborative software architecture design platform with AI-assisted evaluation. Teams use it to draw system architectures on a canvas, run automated rule-based evaluations against architectural principles, and receive AI-generated improvement suggestions — all in a shared workspace.

**Live at:** [structra.cloud](https://structra.cloud)  
**Docs at:** [docs.structra.cloud](https://docs.structra.cloud)

---

## Core Product Concepts

| Concept | Description |
|---|---|
| **Workspace** | A team's shared container. Holds systems, members, and usage quotas. |
| **System (Canvas)** | A single architecture diagram — nodes, edges, metadata. The thing being evaluated. |
| **Evaluation Run** | A scored assessment of a canvas: rule results + AI suggestions + optional cloud analysis. |
| **Insight Token** | Per-workspace credits that gate AI evaluations. Consumed on success, refunded on AI error. |
| **Plan** | A subscription tier (CORE / INDIVIDUAL / TEAM / ENTERPRISE) that controls quotas and which evaluation rules apply. |

---

## Monorepo Structure

```
structra/
├── backend/              # Django REST API — all persistent data and business logic
├── worker/               # Evaluation worker — rule engine, Bedrock AI, job processing
├── frontend/             # React SPA — all end-user product surfaces
├── docs/                 # Docusaurus site — public product documentation
├── lambdas/              # Cognito trigger Lambdas (auth flow: OTP, OAuth hooks)
├── infra/
│   └── terraform/        # All AWS infrastructure as code (layered stacks + modules)
├── docker-compose.yml    # Full local dev environment
└── .github/
    └── workflows/        # CI/CD pipelines
```

All four services are independently deployed. The backend and worker share Django ORM models.

---

## Technology Stack

### Backend
| Layer | Technology |
|---|---|
| Language | Python 3.12 |
| Framework | Django 6 + Django REST Framework |
| Auth | AWS Cognito (JWT) + `CognitoJWTAuthentication` |
| Database | PostgreSQL 16 (RDS, private subnet) |
| Deployment | Container Lambda + AWS API Gateway (HTTP API) + Mangum (ASGI adapter) |
| Email | Zoho SMTP (transactional) |
| Payments | Razorpay (subscriptions + webhooks) |

### Worker
| Layer | Technology |
|---|---|
| Language | Python 3.12 + Node.js (rule engine subprocess) |
| Queue | AWS SQS (production) / PostgreSQL DB queue (local dev) |
| AI | AWS Bedrock — Llama 3.3 70B (`us.meta.llama3-3-70b-instruct-v1:0`) in `us-east-1` |
| Deployment | Container Lambda triggered by SQS event source mapping |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 19 + Vite |
| Routing | React Router |
| Styling | Tailwind CSS |
| HTTP | Axios (with token refresh interceptor) |
| Payments | Razorpay SDK |
| Deployment | Static files → S3 (private) → CloudFront CDN (OAC) |

### Infrastructure
| Layer | Technology |
|---|---|
| IaC | Terraform (layered stacks) |
| Region | `ap-south-1` (Mumbai) |
| Cloud | AWS |
| Auth provider | AWS Cognito (with custom Lambdas) |
| Secrets | AWS SSM Parameter Store (SecureStrings) |
| DNS | structra.cloud |

---

## Subscription Plans

| Plan | Key Limits |
|---|---|
| **CORE** (free) | Basic rule evaluation, limited workspaces, no AI suggestions |
| **INDIVIDUAL** | AI suggestions (insight tokens), personal workspace |
| **TEAM** | Team seats, shared workspaces, AI suggestions |
| **ENTERPRISE** | Everything + cloud-specific analysis from a second AI pass |

Plans are enforced by the backend at API time. The worker receives `workspaceTier` in the job payload and applies the appropriate rule set.

---

## Key Design Decisions

- **Serverless compute** — no always-on app servers; Lambda scales to zero
- **Private database** — RDS is never internet-reachable; only the backend VPC Lambda can connect
- **Stateless worker** — the worker owns no database and communicates back via a secret-authed HTTP callback (database-per-service pattern)
- **NAT instance over NAT Gateway** — ~$3/mo vs ~$32/mo for an early-stage product
- **SQS decoupling** — evaluations are slow (~12s); SQS lets the web request return immediately
- **Cognito for auth** — fully managed; handles OTP, Google OAuth, GitHub OAuth (via a custom OIDC shim)

See [architecture.md](./architecture.md) for the full technical deep-dive.
