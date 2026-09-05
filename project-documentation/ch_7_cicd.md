# Chapter 7 — CI/CD

All workflows live in `.github/workflows/`. GitHub Actions uses **OIDC** to assume an IAM role in AWS account `469465348250`, no long-lived access keys are stored as secrets.

Three roles, split by blast radius rather than one role for everything:

| Role | Used by | Rights |
|---|---|---|
| `structra-github-OIDC-Role` | the deploy and power workflows below | push images, update Lambda code, sync the SPA, invalidate CloudFront, stop/start NAT and RDS |
| `structra-github-terraform-plan` | `terraform.yml` plan | ReadOnlyAccess plus remote-state access |
| `structra-github-terraform-apply` | `terraform.yml` apply | PowerUserAccess, IAM scoped to `structra-*`, SSM SecureString reads |

---

## Infrastructure Workflow

### `terraform.yml` — Infrastructure changes

**Trigger:** pull requests touching `infra/terraform/**` or `services/github-oidc-shim/**` run a plan for all three stacks and post it as a PR comment. Applies are `workflow_dispatch` only, taking a stack (or `all`) and an action.

Apply runs in the `production` GitHub environment, and the apply role's trust policy names that environment in its OIDC subject condition. A workflow run outside the environment cannot assume the role even if someone edits the workflow file, so the gate holds at the AWS end rather than only in GitHub.

Applies are serialised by a concurrency group: parallel runs would contend for the DynamoDB state lock, and `all` depends on the stacks being applied bottom-up, since upper stacks read lower ones through `terraform_remote_state`.

For `10-persistent` the job builds `services/github-oidc-shim` first, because that stack zips `dist-lambda/`, which is not committed.

`bootstrap/` is deliberately not in the workflow: it creates the state bucket and lock table the other stacks depend on, uses local state, and is a one-time manual step.

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

These two workflows automate the same `stop-instances`/`start-instances`/`stop-db-instance` calls the `make prod-down`/`make prod-up` Makefile targets wrap manually — see [Chapter 6](./ch_6_infrastructure.md#the-cost-onoff-switch).

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

Migrations must run from inside the VPC (only the backend Lambda can reach private RDS — see [Chapter 2](./ch_2_architecture.md#rds-postgresql)). Running them from a laptop is not possible.

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

Application secrets (DB password, Django key, etc.) are in **SSM Parameter Store** and never in GitHub — see the full table in [Chapter 6](./ch_6_infrastructure.md#secrets--ssm-parameter-store).

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

---

**See also:** [Chapter 6 — Infrastructure](./ch_6_infrastructure.md) for the Terraform stacks these workflows deploy into · [Chapter 8 — Local Development](./ch_8_local_development.md) for running migrations locally instead.
