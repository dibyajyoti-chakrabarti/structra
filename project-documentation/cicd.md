# Structra — CI/CD

All workflows live in `.github/workflows/`. GitHub Actions uses **OIDC** to assume an IAM role in AWS account `042843883108` — no long-lived access keys are stored as secrets.

---

## Deployment Workflows

### `deploy-backend.yml` — Backend Lambda

**Trigger:** Push to `main` when files under `backend/**` or `lambdas/**` change.

**Steps:**
1. Configure AWS credentials via OIDC
2. Authenticate Docker to ECR
3. Build the backend Docker image from `backend/Dockerfile`
4. Push to ECR (`structra-backend:latest` + `:<git-sha>`)
5. Update the backend Lambda function code to the new image URI
6. Wait for the update to complete (`lambda wait function-updated`)

### `deploy-worker.yml` — Worker Lambda

**Trigger:** Push to `main` when files under `worker/**` change.

**Steps:**
1. Configure AWS credentials via OIDC
2. Authenticate Docker to ECR
3. Build the worker Docker image from `worker/Dockerfile.lambda`
4. Push to ECR (`structra-worker:latest` + `:<git-sha>`)
5. Update the worker Lambda function code to the new image URI

### `deploy-frontend.yml` — React SPA

**Trigger:** Push to `main` when files under `frontend/**` change.

**Steps:**
1. Configure AWS credentials via OIDC
2. `npm ci && npm run build` (produces `frontend/dist/`)
3. `aws s3 sync dist/ s3://<frontend-bucket>/ --delete`
4. Create a CloudFront invalidation (`/*`) to purge cached files

---

## Infrastructure Workflows

### `infra-start.yml` — Start the App

**Trigger:** Manual (`workflow_dispatch`)

**Steps:**
1. Start the RDS instance (`aws rds start-db-instance`)
2. Wait for RDS to be available (`aws rds wait db-instance-available`)
3. Start the NAT EC2 instance (`aws ec2 start-instances`)

### `infra-stop.yml` — Stop the App

**Trigger:** Manual (`workflow_dispatch`)

**Steps:**
1. Stop the NAT EC2 instance
2. Stop the RDS instance

### `scheduled-infra-stop.yml` — Automatic Cost Guard

**Trigger:** Cron schedule (every 6 hours)

**Steps:**
1. Check if RDS is running
2. If running → stop it

This prevents RDS from running idle if someone forgets to stop it after testing. RDS auto-restarts after 7 days of being stopped; this workflow stops it again.

### `run-migrations.yml` — Database Migrations

**Trigger:** Manual (`workflow_dispatch`)

**Steps:**
1. Configure AWS credentials via OIDC
2. Invoke the backend Lambda with a migration event payload:
   ```json
   { "migrate": true }
   ```
3. `migrate_handler.py` (the Lambda's secondary entry point) runs `django.core.management.call_command('migrate')`
4. Logs the migration output from the Lambda invocation response

Migrations must run from inside the VPC (only the backend Lambda can reach private RDS). Running them from a laptop is not possible.

---

## AWS OIDC Setup

GitHub Actions uses OIDC federation to get short-lived AWS credentials:

- **IAM role:** `structra-github-actions-role` (in `10-persistent` stack `iam.tf`)
- **Trust policy:** allows `token.actions.githubusercontent.com` as the OIDC provider, scoped to the `dibyajyoti-chakrabarti/structra` repository
- **Permissions:** ECR push, Lambda update function code, S3 sync, CloudFront invalidation, EC2 start/stop, RDS start/stop

No `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` secrets are stored in GitHub.

---

## Secrets in GitHub (CI only)

GitHub repository secrets hold deployment-time values that the CI runner needs (not the running Lambda):

| Secret | Used for |
|---|---|
| `AWS_ROLE_ARN` | OIDC role to assume |
| `ECR_REGISTRY` | ECR registry URL |
| `BACKEND_LAMBDA_NAME` | Lambda function name to update |
| `WORKER_LAMBDA_NAME` | Lambda function name to update |
| `FRONTEND_BUCKET` | S3 bucket name for frontend sync |
| `CLOUDFRONT_DISTRIBUTION_ID` | For cache invalidation |
| `RDS_INSTANCE_ID` | For start/stop |
| `NAT_INSTANCE_ID` | For start/stop |

Application secrets (DB password, Django key, etc.) are in **SSM Parameter Store** and never in GitHub.

---

## Deployment Order

When deploying from scratch (after `terraform apply`):

1. `terraform apply` — `10-persistent` → `20-data` → `30-compute`
2. `run-migrations.yml` — run database migrations
3. `deploy-backend.yml` — push and deploy backend image
4. `deploy-worker.yml` — push and deploy worker image
5. `deploy-frontend.yml` — build and sync frontend

For routine code changes, only the relevant deploy workflow needs to run (it's path-scoped).

---

## Image Tagging

Both Lambda images are tagged with:
- `latest` — always points to the most recent deploy
- `<git-sha>` — immutable reference for rollback

To roll back the backend Lambda:
```bash
aws lambda update-function-code \
  --function-name structra-backend \
  --image-uri <ecr-registry>/structra-backend:<previous-sha>
```
