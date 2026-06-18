# Structra Infrastructure (Terraform)

Production-grade IaC for the Structra serverless architecture on AWS.

- **Account / profile / region:** `042843883108` / `structra-admin` / `ap-south-1`
- **State:** S3 (`structra-tfstate-042843883108-ap-south-1`) + DynamoDB lock (`structra-tflock`)

## Architecture

```
User ─HTTPS─▶ API Gateway (HTTP API) ──▶ Backend Lambda ┐         CloudFront ─OAC─▶ S3 (frontend)
                                          (VPC, private) │              ▲
Cognito (existing pool + 4 triggers) ◀──── JWT/OAuth ────┤              └── User (static assets)
                                                         │
              Backend Lambda ──send──▶ SQS ──trigger──▶ Worker Lambda (VPC, private)
                                                         │  run_evaluation_job(): Node rule engine + Bedrock
              Both Lambdas ──▶ RDS PostgreSQL (private)  │
              Both Lambdas ──outbound──▶ NAT instance (t4g.nano, public subnet) ──▶ Internet
                                          (Cognito JWKS, Bedrock, SQS, Razorpay, Zoho SMTP)
```

Outbound internet for the VPC-attached Lambdas goes through a **NAT instance** (a small EC2, not a managed NAT Gateway) for cost. RDS is private; Lambdas reach it inside the VPC.

## Layered stacks (each = independent remote state)

| Stack | Contents | Lifecycle |
|---|---|---|
| `bootstrap/` | S3 state bucket + DynamoDB lock | one-time, local state |
| `stacks/10-persistent/` | VPC, subnets, IGW, route tables; ECR repos; Lambda exec IAM roles; Cognito 4 triggers (+ pool referenced); frontend S3 bucket | **never destroyed** |
| `stacks/20-data/` | RDS PostgreSQL + subnet group + SG | destroyable w/ final snapshot; normally just **stopped** |
| `stacks/30-compute/` | NAT instance + private routes; backend Lambda + API GW; worker Lambda + SQS/DLQ; CloudFront/OAC | **freely destroyable** |

Upper stacks read lower ones via `terraform_remote_state`. Only the NAT EC2 and RDS cost money at idle — everything else is pay-per-use (~$0).

## Prerequisites

- Terraform >= 1.7, AWS CLI v2, Docker (for Lambda images), Node 20 + npm (for frontend).
- `aws configure --profile structra-admin` with admin-ish credentials for account `042843883108`.

## First-time setup

1. **Create the 5 app secrets** in SSM Parameter Store (out-of-band; values never enter git):
   ```bash
   for k in DB_PASSWORD DJANGO_SECRET_KEY RAZORPAY_KEY_SECRET RAZORPAY_WEBHOOK_SECRET EMAIL_HOST_PASSWORD; do
     read -rsp "$k: " v; echo
     aws ssm put-parameter --profile structra-admin --region ap-south-1 \
       --name "/structra/prod/$k" --type SecureString --value "$v" --overwrite
   done
   ```
2. **Bootstrap remote state**, then point each stack's `backend.tf` at the bucket/table:
   ```bash
   make bootstrap
   ```
3. **Provide non-secret config:** copy `terraform.tfvars.example` → `terraform.tfvars` in each stack and fill in values (region, CIDRs, Razorpay public ids, email host, Cognito ids, etc.).
4. **Init + apply in order:**
   ```bash
   make init-all
   make apply-persistent
   make deploy-backend deploy-worker          # build+push initial images (ECR must exist first)
   make apply-data                            # RDS — wait until 'available'
   # run DB migrations against the new RDS endpoint (see below)
   make apply-compute
   make deploy-frontend                       # needs VITE_* env (see frontend/.env.production)
   ```
5. Update the Cognito app client callback/logout URLs to the new CloudFront URL.

### DB migrations
After `apply-data`, run Django migrations once against the RDS endpoint (RDS is private — run from a host with VPC access, or temporarily from a bastion/SSM session):
```bash
DB_HOST=$(terraform -chdir=stacks/20-data output -raw rds_endpoint_address) \
DB_NAME=structra DB_USER=postgres DB_PASSWORD=... DB_PORT=5432 \
DJANGO_ENV=production CORS_ALLOWED_ORIGINS=http://x CSRF_TRUSTED_ORIGINS=http://x \
COGNITO_USER_POOL_ID=ap-south-1_QD5vjF5ej COGNITO_CLIENT_ID=2dmikoh9ligfjqe9auo8ioh21m \
python backend/manage.py migrate
```

## Day-2 operations

| Action | Command |
|---|---|
| Turn app **off** (stop NAT + RDS, data kept) | `make prod-down` |
| Turn app **on** | `make prod-up` |
| Power status | `make prod-status` |
| Redeploy backend / worker | `make deploy-backend` / `make deploy-worker` |
| Redeploy frontend | `make deploy-frontend` |
| Deep-off (remove compute) | `make destroy-compute` |
| Remove RDS (guarded) | disable `deletion_protection`, apply, then `make destroy-data CONFIRM=yes` |

`prod-down`/`prod-up` are AWS CLI stop/start — **not** Terraform. State is untouched; no re-apply needed to resume. A stopped RDS auto-restarts after 7 days, so re-run `prod-down` (or schedule it) for long pauses.

## Secrets — how it works

The 5 secrets live in **SSM Parameter Store SecureString** (`/structra/prod/*`). Terraform reads them with `data.aws_ssm_parameter` and injects them as Lambda env vars (the app reads plain `os.getenv` — no code change). Trade-off: resolved values land in the Terraform **state**, which is why the state bucket is private + encrypted. Lambda env is KMS-encrypted at rest. Rotate by updating SSM and re-applying (`30-compute`, plus `20-data` for `DB_PASSWORD`).

GitHub Secrets are **not** used for app secrets — the running Lambda can't read them; they only exist during a CI run. When CI/CD is added, GitHub Secrets will hold the AWS deploy credentials while the pipeline continues to read app secrets from SSM.

## Images

Lambda container images are built from the repo Dockerfiles and pushed to ECR:
- backend: `docker build -f backend/Dockerfile.lambda -t <repo-api>:<tag> backend/`
- worker: `docker build -f worker/Dockerfile.lambda -t <repo-worker>:<tag> .` (context = repo root)

The Lambda functions set `image_uri` initially and use `lifecycle { ignore_changes = [image_uri] }`, so `make deploy-*` (which calls `update-function-code`) does not cause Terraform drift.

## Not included (deferred)

Route53 / custom domain, new SES setup (Cognito login OTP still uses the existing verified SES identity; app email uses Zoho SMTP), RDS Proxy, CI/CD pipeline.
