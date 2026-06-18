# Structra Infrastructure (Terraform)

Production-grade IaC for the Structra serverless architecture on AWS.
For the *why* behind every component (NAT instance, Lambdas, SSM, layering),
read **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

- **Account / profile / region:** `042843883108` / `structra-admin` / `ap-south-1`
- **State:** S3 (`structra-tfstate-042843883108-ap-south-1`) + DynamoDB lock (`structra-tflock`)

## Architecture (at a glance)

```
User ─HTTPS─▶ API Gateway (HTTP API) ──▶ Backend Lambda ┐        CloudFront ─OAC─▶ S3 (frontend SPA)
                                          (VPC, private) │             ▲
Cognito (existing pool + 4 triggers) ◀──── JWT/OAuth ────┤             └── User (static assets)
                                                         │
              Backend Lambda ──send──▶ SQS ──trigger──▶ Worker Lambda (VPC, private)
                                                         │  run_evaluation_job(): Node rule engine + Bedrock
              Both Lambdas ──▶ RDS PostgreSQL (private)  │
              Both Lambdas ──outbound──▶ NAT instance (t4g.micro, public subnet) ──▶ Internet
                                          (Cognito JWKS, Bedrock, SQS, Razorpay, Zoho SMTP)
```

VPC-attached Lambdas reach the internet through a **NAT instance** (a small EC2,
not a managed NAT Gateway) for cost. RDS is private; the Lambdas reach it inside
the VPC.

## Layered stacks (each = independent remote state)

| Stack | Contents | Lifecycle |
|---|---|---|
| `bootstrap/` | S3 state bucket + DynamoDB lock | one-time, local state |
| `stacks/10-persistent/` | VPC, subnets, IGW, route tables; ECR repos; Lambda exec IAM roles; (optional) Cognito 4 triggers; frontend S3 bucket | **never destroyed** |
| `stacks/20-data/` | RDS PostgreSQL + subnet group + SG | destroyable w/ final snapshot; normally just **stopped** |
| `stacks/30-compute/` | NAT instance + private routes; backend Lambda + API GW; worker Lambda + SQS/DLQ; CloudFront/OAC | **freely destroyable** |

Upper stacks read lower ones via `terraform_remote_state`. Only the NAT EC2 and
RDS cost money at idle — everything else is pay-per-use (~$0).

## Prerequisites

- Terraform >= 1.7, AWS CLI v2, Docker (for Lambda images), Node 20 + npm (frontend).
- `aws configure --profile structra-admin` for account `042843883108`.

## First-time setup

1. **Create the 5 app secrets** in SSM Parameter Store (out-of-band; never in git):
   ```bash
   for k in DB_PASSWORD DJANGO_SECRET_KEY RAZORPAY_KEY_SECRET RAZORPAY_WEBHOOK_SECRET EMAIL_HOST_PASSWORD; do
     read -rsp "$k: " v; echo
     aws ssm put-parameter --profile structra-admin --region ap-south-1 \
       --name "/structra/prod/$k" --type SecureString --value "$v" --overwrite
   done
   ```
2. **Bootstrap remote state:** `make bootstrap`
3. **Apply persistent + build images + apply data + migrate + apply compute:**
   ```bash
   make init-all
   make apply-persistent
   make deploy-backend deploy-worker     # build+push initial images (ECR must exist first)
   make apply-data                       # RDS — wait until 'available'
   make migrate                          # Django migrations via the BACKEND image (full app list)
   make apply-compute
   make deploy-frontend                  # needs VITE_* env (see below)
   ```
4. **Point Cognito at the new frontend URL** — add `<cloudfront-url>/auth/callback`
   to the app client callback URLs and `<cloudfront-url>/` to logout URLs
   (`aws cognito-idp update-user-pool-client ...`, preserving OAuth flows/scopes/providers).

### Migrations (important)

Run migrations with **`make migrate`**, which executes them through the **backend**
Lambda image. The backend's `INSTALLED_APPS` is the full set
(`accounts, admin, audit, auth, canvases, contenttypes, notifications, payments,
permissions, sessions, workspaces`). The worker's app list is a *subset* — migrating
via the worker silently omits backend-only tables (e.g. `payment_transactions`),
which then 500s `/api/auth/profile/`. RDS is private, so migrations can only run
from inside the VPC; `make migrate` does this by temporarily overriding the backend
Lambda's command to `migrate_handler.handler`, invoking once, and reverting.

### Frontend build env (`make deploy-frontend`)
Export these before building (or put them in `frontend/.env.production`):
`VITE_API_BASE_URL=<api-url>/api/`, `VITE_FRONTEND_URL=<cloudfront-url>`,
`VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID`, `VITE_COGNITO_DOMAIN`,
`VITE_RAZORPAY_KEY_ID`.

## Day-2 operations

| Action | Command |
|---|---|
| Turn app **off** (stop NAT + RDS, data kept) | `make prod-down` |
| Turn app **on** | `make prod-up` |
| Power status | `make prod-status` |
| Redeploy backend / worker | `make deploy-backend` / `make deploy-worker` |
| Redeploy frontend | `make deploy-frontend` |
| Run migrations | `make migrate` |
| Verify worker → RDS + Bedrock | `make selftest` |
| Deep-off (remove compute) | `make destroy-compute` |
| Remove RDS (guarded) | set `deletion_protection=false`, apply, then `make destroy-data CONFIRM=yes` |

`prod-down`/`prod-up` are AWS CLI stop/start — **not** Terraform. State is untouched;
no re-apply to resume. A stopped RDS auto-restarts after 7 days, so re-run `prod-down`
(or schedule it) for long pauses.

## Secrets

The 5 secrets live in **SSM Parameter Store SecureString** (`/structra/prod/*`).
Terraform reads them via `data.aws_ssm_parameter` and injects them as Lambda env vars
(the app reads plain `os.getenv` — no code change). Trade-off: resolved values land in
the Terraform **state**, which is why the state bucket is private + encrypted; Lambda env
is KMS-encrypted at rest. Rotate by updating SSM and re-applying (`30-compute`, plus
`20-data` for `DB_PASSWORD`).

GitHub Secrets are **not** used for app secrets — the running Lambda can't read them (they
exist only during a CI run). When CI/CD is added, GitHub Secrets hold the AWS deploy
credentials while the pipeline still reads app secrets from SSM.

## Lambda images

Built from the repo Dockerfiles and pushed to ECR:
- backend: `docker build -f backend/Dockerfile.lambda -t <repo-api>:<tag> backend/`
- worker: `docker build -f worker/Dockerfile.lambda -t <repo-worker>:<tag> .` (context = repo root)

The functions set `image_uri` initially and use `lifecycle { ignore_changes = [image_uri] }`,
so `make deploy-*` (`update-function-code`) does not cause Terraform drift. Both run on
`x86_64`.

### Ops / diagnostic entrypoints (in the images)
- `backend/migrate_handler.py` — runs `migrate` with the full app list (used by `make migrate`).
- `worker/migrate_handler.py` — worker-scoped migrate (subset of apps; prefer the backend one).
- `worker/selftest_handler.py` — checks DB + a real Bedrock call (used by `make selftest`).

These are invoked only by overriding a function's command; they are never wired to API GW or SQS.

## Cognito triggers

The user pool (`ap-south-1_QD5vjF5ej`) is **referenced** via data source — Terraform never
manages or destroys it. The 4 trigger Lambdas already exist and serve live auth, so trigger
management is gated by `manage_cognito_triggers` (default **false**). To bring them under
Terraform, import the existing functions + log groups first (commands in
`modules/cognito-triggers/main.tf`), then set the flag true.

## Free Tier constraints applied

This account is on the AWS Free plan, which forced:
- RDS `backup_retention_period = 0` (free tier caps retention) — raise when off the free plan.
- NAT instance `t4g.micro` (free-tier eligible; `t4g.nano` is not).

`AWS_REGION` is **not** set in Lambda env (it is a reserved key the runtime sets to the
function's region, `ap-south-1`).

## Deployed environment (reference)

| Resource | Value |
|---|---|
| Frontend URL | `https://dqltowjnatfxe.cloudfront.net` (dist `E24NYT5QAF6DKT`) |
| API URL | `https://nh35tf2f0e.execute-api.ap-south-1.amazonaws.com` |
| VPC | `vpc-044fa20756dafbffb` (10.0.0.0/16, AZs a/b) |
| RDS | `structra-prod-db` (private) |
| NAT instance | `i-03c1c6ecd43850cb9` (t4g.micro) |
| SQS | `structra-eval-queue` (+ `structra-eval-dlq`) |
| Lambdas | `structra-prod-backend`, `structra-prod-worker` |

(IDs are environment-specific; `terraform output` in each stack is the source of truth.)

## Not included (deferred)

Route53 / custom domain, new SES setup (Cognito login OTP uses the existing verified SES
identity; app email uses Zoho SMTP), RDS Proxy, CI/CD pipeline.
