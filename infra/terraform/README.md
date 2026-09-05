# Structra Infrastructure (Terraform)

Production-grade IaC for the Structra serverless architecture on AWS.
For the *why* behind every component (NAT instance, Lambdas, SSM, layering),
read **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

- **Account / profile / region:** `190084967282` / `jan-saathi` / `ap-south-1`
- **State:** S3 (`structra-tfstate-190084967282-ap-south-1`) + DynamoDB lock (`structra-tflock`)
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
- `aws configure --profile jan-saathi` for account `190084967282`.

## First-time setup

1. **Create the 9 app secrets** in SSM Parameter Store (out-of-band; never in git):
   ```bash
   for k in DB_PASSWORD DJANGO_SECRET_KEY RAZORPAY_KEY_SECRET RAZORPAY_WEBHOOK_SECRET \
            EMAIL_HOST_PASSWORD INTERNAL_API_TOKEN GOOGLE_OAUTH_CLIENT_SECRET \
            GITHUB_OAUTH_CLIENT_SECRET COGNITO_SMTP_PASSWORD; do
     read -rsp "$k: " v; echo          # run this in bash; zsh's read has no -p
     aws ssm put-parameter --profile jan-saathi --region ap-south-1 \
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

   If `apply-compute` fails with `CNAMEAlreadyExists`, the domain names are
   still attached to a CloudFront distribution somewhere else. See
   [Moving the domain names between accounts](#moving-the-domain-names-between-accounts).
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

Terraform resolves AWS credentials from the environment, not from a profile
named in `backend.tf`. The Makefile exports `AWS_PROFILE` so local runs are
unaffected, and runners use their OIDC credentials directly. Do not put
`profile = "..."` back into a backend block or a `terraform_remote_state` data
source: runners have no shared config file, and `terraform init` fails there
with `failed to get shared config profile`.

## Troubleshooting

Three failures cost real time during the rebuild in this account. All three
present as something other than what they are.

### Moving the domain names between accounts

A CloudFront alternate domain name is unique across the whole of AWS, not just
your account. If another distribution anywhere holds `structra.cloud`,
`CreateDistribution` fails with `CNAMEAlreadyExists` and no amount of
reapplying helps.

`cloudfront associate-alias` moves the name to a distribution you own, proving
you control the domain with a DNS TXT record, so it works even when the account
holding the name is gone. The order matters:

1. Apply `30-compute` with `-var attach_frontend_aliases=false`. The
   distribution has to exist, with a certificate covering the domain, before it
   can be the target of a move.
2. Add the proof record. **The format differs for an apex**, and the error
   message does not tell you this:

   | Name being moved | TXT record to create |
   |---|---|
   | `www.structra.cloud` | `_www.structra.cloud` |
   | `structra.cloud` (apex) | `_.structra.cloud` |

   The value is the target distribution's own domain name, for example
   `dqyxm2ey99jlw.cloudfront.net`. Without the period after the underscore the
   apex record is `_structra.cloud`, which sits outside the hosted zone, and
   Route 53 rejects it. That rejection looks like the move is impossible; it is
   not, it is a typo.
3. `aws cloudfront associate-alias --alias <name> --target-distribution-id <id>`,
   once per name.
4. Re-apply `30-compute` normally so Terraform owns the aliases again, importing
   the two Route 53 A records if you created them by hand.

AWS documents contacting Support for a cross-account apex move. That is only
needed when you genuinely cannot create the TXT record. If the zone is yours,
step 2 is the whole answer.

### A NAT instance that never finishes creating

`RunInstances` answers a capacity shortage with `InsufficientInstanceCapacity`,
and the AWS provider treats it as retryable, so a starved availability zone
looks like a create that hangs for twenty minutes rather than an error. If
`module.nat.aws_instance.nat` sits at "Still creating", check the AZ before
suspecting the network:

```bash
aws ec2 run-instances --dry-run --instance-type t4g.micro \
  --image-id <al2023-arm64> --subnet-id <the NAT subnet>
```

`nat_subnet_index` picks the public subnet. It defaults to `1`
(`ap-south-1b`) because `ap-south-1a` had no `t4g.micro` capacity.

Instance type is separately constrained: this account is on the restricted Free
Tier plan, which rejects any type that is not free-tier eligible with
`InvalidParameterCombination`. Check with
`aws ec2 describe-instance-types --filters Name=free-tier-eligible,Values=true`.

### Cognito cannot reach the GitHub shim

Creating the GitHub identity provider straight after the shim's API Gateway
fails with `InvalidParameterException: Unable to contact well-known endpoint`.
The stage is not reachable yet. Confirm the endpoint serves 200 and re-apply;
nothing is wrong with the configuration.

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
| Route 53 zone | `Z048163752SZ07B44U3X` (`structra.cloud`) |
| ACM cert (us-east-1) | `structra.cloud` + `*.structra.cloud` |
| VPC | `vpc-010688c3bb2114fa2` (10.0.0.0/16, AZs a/b) |
| ECR | `structra-api`, `structra-worker` |
| Frontend bucket | `structra-frontend-190084967282` |
| Assets bucket | `structra-assets-190084967282` |
| CI deploy role | `structra-github-OIDC-Role` |
| CloudFront | `E3TT6LH3AUCL9F` |
| API Gateway | `ox6gigpd59` |
| NAT instance | `i-0c72afac0304d95df` (ap-south-1b) |
| RDS | `structra-prod-db` (private) |
| SQS | `structra-eval-queue` (+ `structra-eval-dlq`) |
| Lambdas | `structra-prod-backend`, `structra-prod-worker` |

(IDs are environment-specific; `terraform output` in each stack is the source of truth.)

## Not included (deferred)

SES (Cognito login OTP and app email both go over Zoho SMTP) and RDS Proxy.
