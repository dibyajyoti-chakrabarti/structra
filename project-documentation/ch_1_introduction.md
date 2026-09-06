# Chapter 1 — Introduction

## What is Structra?

Structra is a collaborative software architecture design platform with AI-assisted evaluation. Teams draw system architectures on a canvas, run automated rule-based evaluations against architectural principles, and receive AI-generated improvement suggestions — all in a shared workspace.

**Live at:** [structra.cloud](https://structra.cloud)
**Docs at:** [structra.cloud/documentation](https://structra.cloud/documentation/)

---

## Core Product Concepts

| Concept | Description |
|---|---|
| **Workspace** | A team's shared container. Holds systems, members, and usage quotas. |
| **System (Canvas)** | A single architecture diagram — nodes, edges, metadata. The thing being evaluated. |
| **Evaluation Run** | A scored assessment of a canvas: rule results + AI suggestions + optional cloud analysis. |
| **Insight Token** | Per-workspace credits that gate AI evaluations. Consumed on success, refunded on AI error. |
| **Plan** | A subscription tier (CORE / INDIVIDUAL / TEAM / ENTERPRISE) that controls quotas and which evaluation rules apply. |

These five concepts recur throughout the book. Every chapter after this one assumes you know them: a *Workspace* contains *Systems* (canvases), running a *System* through evaluation produces an *Evaluation Run*, which costs an *Insight Token* if AI suggestions are requested, and what you're allowed to do is gated by your *Plan*.

---

## Subscription Plans

| Plan | Key Limits |
|---|---|
| **CORE** (free) | Basic rule evaluation, limited workspaces, no AI suggestions |
| **INDIVIDUAL** | AI suggestions (insight tokens), personal workspace |
| **TEAM** | Team seats, shared workspaces, AI suggestions |
| **ENTERPRISE** | Everything + cloud-specific analysis from a second AI pass |

Plans are enforced by the backend at API time (see [Chapter 4](./ch_4_backend_service.md)). The worker receives `workspaceTier` in the evaluation job payload and applies the appropriate rule set (see [Chapter 5](./ch_5_evaluation_pipeline.md)).

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

All four services (backend, worker, frontend, docs) are independently deployed. The backend and worker **share Django ORM models** — the worker doesn't duplicate them, it just gets `PYTHONPATH` access to the backend's app code (see [Chapter 5](./ch_5_evaluation_pipeline.md)).

---

## Technology Stack (at a glance)

| Service | Core Technology |
|---|---|
| Backend | Python 3.12, Django 6 + DRF, Cognito JWT auth, PostgreSQL 16 (RDS), Container Lambda + API Gateway + Mangum |
| Worker | Python 3.12 + Node.js rule engine, AWS SQS (prod) / Postgres queue (local), AWS Bedrock Llama 3.3 70B |
| Frontend | React 19 + Vite, React Router, Tailwind CSS, Axios, S3 + CloudFront |
| Infrastructure | Terraform (layered stacks), AWS `ap-south-1`, Cognito, SSM Parameter Store |

This is deliberately terse — each service gets a full chapter with the real detail: [Ch. 4](./ch_4_backend_service.md) (backend), [Ch. 5](./ch_5_evaluation_pipeline.md) (worker/evaluation), [Ch. 6](./ch_6_infrastructure.md) (infra).

---

## Design Philosophy

Six decisions shape everything else in this book. Each is explained in full where it's structurally relevant — this is just the map:

- **Serverless compute** — no always-on app servers; Lambda scales to zero. → [Ch. 2](./ch_2_architecture.md)
- **Private database** — RDS is never internet-reachable; only the backend Lambda (inside the VPC) can connect. → [Ch. 2](./ch_2_architecture.md), [Ch. 6](./ch_6_infrastructure.md)
- **Stateless worker** — the worker owns no database and reports back via a secret-authed HTTP callback (database-per-service pattern). → [Ch. 5](./ch_5_evaluation_pipeline.md)
- **NAT instance over NAT Gateway** — ~$3/mo vs ~$32/mo, an early-stage cost trade-off. → [Ch. 2](./ch_2_architecture.md)
- **SQS decoupling** — evaluations take ~12s; SQS lets the web request return immediately. → [Ch. 5](./ch_5_evaluation_pipeline.md)
- **Cognito for auth** — fully managed; handles OTP, Google OAuth, GitHub OAuth (via a custom OIDC shim). → [Ch. 3](./ch_3_authentication.md)

---

**See also:** [Chapter 2 — System Architecture](./ch_2_architecture.md) for the full technical deep-dive into how these pieces fit together.
