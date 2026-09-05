# Structra Infrastructure (Terraform)

Production-grade IaC for the Structra serverless architecture on AWS.
For the *why* behind every component (NAT instance, Lambdas, SSM, layering),
read **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

- **Account / profile / region:** `469465348250` / `home` / `ap-south-1`
- **State:** S3 (`structra-tfstate-469465348250-ap-south-1`) + DynamoDB lock (`structra-tflock`)
- **Domain:** `structra.cloud`, registered at GoDaddy, delegated to the Route 53 zone in this account

## Architecture (at a glance)

```
User ─HTTPS─▶ API Gateway (HTTP API) ──▶ Backend Lambda (VPC, private) ──▶ RDS PostgreSQL (private)
                                              │   ▲                          CloudFront ─OAC─▶ S3 (SPA)
Cognito (managed pool + 5 triggers) ◀─JWT/OAuth │ │ result callback (X-Internal-Token)
                                              │   │
                  Backend ──send job──▶ SQS ──trigger──▶ Worker Lambda (STATELESS, no VPC, no DB)
                                                              │  Node rule engine + Bedrock
                                                              └─ POST result ─▶ Backend callback ─┘
   Backend ──via NAT──▶ Cognito JWKS / Razorpay / SMTP        Worker ──direct internet──▶ Bedrock + Backend API
```

The **worker is a stateless microservice**: it owns no database. It gets a
self-contained job over SQS, computes (Node rule engine + Bedrock), and POSTs the
result to a secret-authed backend callback, which persists it (database-per-service).
Because it touches no RDS, the worker is **not** in the VPC (no NAT, faster cold starts).
The **backend** is VPC-attached (private RDS) and reaches public services (Cognito JWKS,
Razorpay, SMTP) through a **NAT instance** (a small EC2, not a managed NAT Gateway, for cost).

## Layered stacks (each = independent remote state)

| Stack | Contents | Lifecycle |
|---|---|---|
| `bootstrap/` | S3 state bucket + DynamoDB lock | one-time, local state |
| `stacks/10-persistent/` | VPC, subnets, IGW, route tables; ECR repos; Lambda exec IAM roles; full Cognito stack (pool + client + IdPs + domain + 5 triggers); frontend S3 bucket | **never destroyed** |
| `stacks/20-data/` | RDS PostgreSQL + subnet group + SG | destroyable w/ final snapshot; normally just **stopped** |
| `stacks/30-compute/` | NAT instance + private routes; backend Lambda (VPC) + API GW; worker Lambda (no VPC) + SQS/DLQ; CloudFront/OAC | **freely destroyable** |

Upper stacks read lower ones via `terraform_remote_state`. Only the NAT EC2 and
RDS cost money at idle — everything else is pay-per-use (~$0).

## Prerequisites

- Terraform >= 1.7, AWS CLI v2, Docker (for Lambda images), Node 20 + npm (frontend).
- `aws configure --profile home` for account `469465348250`.

## First-time setup

1. **Create the 9 app secrets** in SSM Parameter Store (out-of-band; never in git):
   ```bash
   for k in DB_PASSWORD DJANGO_SECRET_KEY RAZORPAY_KEY_SECRET RAZORPAY_WEBHOOK_SECRET \
            EMAIL_HOST_PASSWORD INTERNAL_API_TOKEN GOOGLE_OAUTH_CLIENT_SECRET \
            GITHUB_OAUTH_CLIENT_SECRET COGNITO_SMTP_PASSWORD; do
     read -rsp "$k: " v; echo
     aws ssm put-parameter --profile home --region ap-south-1 \
       --name "/structra/prod/$k" --type SecureString --value "$v" --overwrite
   done
   ```
   (`INTERNAL_API_TOKEN` is the shared secret the worker uses to authenticate its result callback to the backend, any random 32+ byte value, e.g. `openssl rand -hex 32`.)
2. **Bootstrap remote state:** `make bootstrap`
3. **Stand up the stacks.** The Cognito hosted UI is a custom domain
   (`auth.structra.cloud`), and AWS refuses to create one until the parent
   domain has an A record. That record is the apex alias to CloudFront, created
   by `30-compute`, so the persistent stack is applied twice:
   ```bash
   make init-all
   make apply-persistent TF_VAR_create_cognito_hosted_ui_domain=false
   make deploy-backend deploy-worker     # build+push initial images (ECR must exist first)
   make apply-data                       # RDS, wait until 'available'
   make apply-compute                    # Lambdas, API GW, CloudFront, apex A record
   make migrate                          # Django migrations via the BACKEND Lambda
   make apply-persistent                 # now creates auth.structra.cloud
   make deploy-frontend                  # needs VITE_* env (see below)
   ```
   Subsequent applies are single-pass; the two-phase order only matters for a
   from-scratch build.
4. **Update the external OAuth apps** with the values the apply reports:
   - Google console: authorised redirect URI `https://auth.structra.cloud/oauth2/idpresponse`.
   - GitHub OAuth app: callback URL `<terraform output github_oidc_issuer_url>/token`.
5. **Set the GitHub Actions repo secrets** so CI can deploy:
   `CLOUDFRONT_DISTRIBUTION_ID`, `EC2_INSTANCE_ID`, `RDS_INSTANCE_ID`, `AWS_REGION`,
   and the `VITE_*` build values.

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

## CI/CD

All workflows authenticate with GitHub OIDC; no AWS keys are stored as secrets.
Three roles, deliberately split by blast radius:

| Role | Used by | Rights |
|---|---|---|
| `structra-github-OIDC-Role` | app deploys, power on/off | push images, update Lambda code, sync the SPA, invalidate CloudFront, stop/start NAT and RDS |
| `structra-github-terraform-plan` | `terraform.yml` plan | ReadOnlyAccess plus remote-state access |
| `structra-github-terraform-apply` | `terraform.yml` apply | PowerUserAccess, IAM scoped to `structra-*`, plus SSM SecureString reads |

### Infrastructure changes (`terraform.yml`)

Plans run automatically on pull requests touching `infra/terraform/**` or
`services/github-oidc-shim/**`, and the result is posted back as a PR comment.

Applies are manual: Actions → Terraform → Run workflow, choosing a stack
(or `all`) and `apply`. The apply job runs in the `production` GitHub
environment, and the apply role's trust policy names that environment, so a run
outside it cannot assume the role even if the workflow is edited. Applies are
serialised through a concurrency group, since parallel runs would contend for
the state lock and `all` relies on stacks going in order.

`extra_args` passes flags straight through, which is how the two-phase
bootstrap is driven: `-var create_cognito_hosted_ui_domain=false`.

`bootstrap/` is not in the workflow. It creates the state bucket and lock table
that every other stack needs, uses local state, and is run once by hand.

Applying from a laptop still works and is unchanged; the workflow is the
reviewable path, not the only one.

## Day-2 operations

| Action | Command |
|---|---|
| Turn app **off** (stop NAT + RDS, data kept) | `make prod-down` |
| Turn app **on** | `make prod-up` |
| Power status | `make prod-status` |
| Redeploy backend / worker | `make deploy-backend` / `make deploy-worker` |
| Redeploy frontend | `make deploy-frontend` |
| Run migrations | `make migrate` |
| Deep-off (remove compute) | `make destroy-compute` |
| Remove RDS (guarded) | set `deletion_protection=false`, apply, then `make destroy-data CONFIRM=yes` |

`prod-down`/`prod-up` are AWS CLI stop/start — **not** Terraform. State is untouched;
no re-apply to resume. A stopped RDS auto-restarts after 7 days, so re-run `prod-down`
(or schedule it) for long pauses.

## Secrets

The 6 secrets live in **SSM Parameter Store SecureString** (`/structra/prod/*`).
Terraform reads them via `data.aws_ssm_parameter` and injects them as Lambda env vars
(the app reads plain `os.getenv` — no code change). Trade-off: resolved values land in
the Terraform **state**, which is why the state bucket is private + encrypted; Lambda env
is KMS-encrypted at rest. Rotate by updating SSM and re-applying (`30-compute`, plus
`20-data` for `DB_PASSWORD`).

GitHub Secrets are **not** used for app secrets: the running Lambda cannot read them, since
they exist only during a CI run. GitHub Secrets hold only resource IDs and frontend build
values, and CI authenticates through the OIDC deploy role rather than stored credentials.

## Lambda images

Built from the repo Dockerfiles and pushed to ECR:
- backend: `docker build -f backend/Dockerfile.lambda -t <repo-api>:<tag> backend/`
- worker: `docker build -f worker/Dockerfile.lambda -t <repo-worker>:<tag> .` (context = repo root)

The functions set `image_uri` initially and use `lifecycle { ignore_changes = [image_uri] }`,
so `make deploy-*` (`update-function-code`) does not cause Terraform drift. Both run on
`x86_64`.

The **worker image is minimal** — only `cloud_handler.py`, `evaluation_compute.py`,
`config.py`, and the Node rule engine (`worker/evaluation/`). No backend code, no Django,
no DB driver.

### Ops / diagnostic entrypoints
- `backend/migrate_handler.py` — runs `migrate` with the full app list (used by `make migrate`,
  invoked by overriding the backend function's command; never wired to API GW).

## Cognito (`modules/cognito`)

The full auth stack is **managed** by Terraform and built from scratch in this
account: the user pool, the public SPA app client (`structra-web`), the Google
and GitHub identity providers, the `auth.structra.cloud` hosted-UI domain, and
all **5 trigger Lambdas** (pre-signup, post-confirmation, define/create/verify-auth).
Email OTP is delivered by the `create_auth` trigger over **Zoho SMTP** (no SES).

The pool ID and app-client ID are minted on first apply; `terraform output` is
the source of truth and the `VITE_COGNITO_*` build values must match.

The hosted UI is a **custom domain** rather than a Cognito prefix domain. The
old account still owns the `structra-auth` prefix and prefixes are globally
unique per region, so it cannot be reclaimed. The custom domain is served by a
Cognito-managed CloudFront distribution behind the `*.structra.cloud`
certificate, and needs the parent domain's A record to exist first (see the
two-phase order in First-time setup).

Three secrets must exist in SSM (SecureString): `<ssm_prefix>/GOOGLE_OAUTH_CLIENT_SECRET`,
`<ssm_prefix>/GITHUB_OAUTH_CLIENT_SECRET`, `<ssm_prefix>/COGNITO_SMTP_PASSWORD`.

### GitHub sign-in (`modules/github-oidc-shim`)

GitHub speaks OAuth 2.0, not OIDC, so the GitHub IdP federates through a shim:
an API Gateway and five Lambdas that expose the OIDC endpoints Cognito expects.
Source is vendored at [`services/github-oidc-shim`](../../services/github-oidc-shim),
built by `make shim-build`, which `plan-persistent` and `apply-persistent` depend on.

The RSA key that signs the `id_token` is generated by Terraform and injected as
Lambda env. Upstream bakes it into the webpack bundle instead, which is how the
previous deployment ended up unbuildable and unrecoverable when the old account
went away; see the service README for the full list of changes made on vendoring.

The **GitHub OAuth app's callback URL** is the shim's `/token` endpoint and
changes if the API Gateway is replaced. Read it from
`terraform output github_oidc_issuer_url`.

## Free Tier constraints applied

This account is on the AWS Free plan, which forced:
- RDS `backup_retention_period = 0` (free tier caps retention) — raise when off the free plan.
- NAT instance `t4g.micro` (free-tier eligible; `t4g.nano` is not).

`AWS_REGION` is **not** set in Lambda env (it is a reserved key the runtime sets to the
function's region, `ap-south-1`).

## Deployed environment (reference)

| Resource | Value |
|---|---|
| Frontend URL | `https://structra.cloud` |
| Auth (Cognito hosted UI) | `https://auth.structra.cloud` |
| Route 53 zone | `Z06774172J4OPAI03JK8V` (`structra.cloud`) |
| ACM cert (us-east-1) | `structra.cloud` + `*.structra.cloud` |
| VPC | `vpc-01c4cb1fbd343a330` (10.0.0.0/16, AZs a/b) |
| ECR | `structra-api`, `structra-worker` |
| Frontend bucket | `structra-frontend-469465348250` |
| Assets bucket | `structra-assets-469465348250` |
| CI deploy role | `structra-github-OIDC-Role` |
| RDS | `structra-prod-db` (private) |
| SQS | `structra-eval-queue` (+ `structra-eval-dlq`) |
| Lambdas | `structra-prod-backend`, `structra-prod-worker` |

(IDs are environment-specific; `terraform output` in each stack is the source of truth.)

## Not included (deferred)

SES (Cognito login OTP and app email both go over Zoho SMTP) and RDS Proxy.
