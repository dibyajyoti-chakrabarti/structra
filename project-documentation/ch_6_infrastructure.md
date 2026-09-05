# Chapter 6 — Infrastructure

**Account:** `469465348250`
**Primary region:** `ap-south-1` (Mumbai)
**Bedrock region:** `us-east-1` (Llama 3.3 availability)

---

## Terraform Stacks

Infrastructure is split into **layered stacks by lifecycle** so expensive parts can be turned off independently. Each stack has its own S3 state file.

```
infra/terraform/
├── bootstrap/            # S3 state bucket + DynamoDB lock table  (run once ever)
├── stacks/
│   ├── 10-persistent/    # VPC, ECR, IAM roles, S3 frontend bucket, Cognito
│   ├── 20-data/          # RDS PostgreSQL
│   └── 30-compute/       # NAT instance, Lambdas, SQS, API Gateway, CloudFront
└── modules/
    ├── networking/       # VPC, subnets, route tables, IGW
    ├── nat-instance/     # EC2 NAT with iptables masquerade
    ├── rds/              # RDS PostgreSQL instance
    ├── lambda-fn/        # Generic Lambda container image module
    ├── api-gateway/      # HTTP API v2 + Lambda integration
    ├── frontend-cdn/     # CloudFront + S3 OAC + www redirect
    ├── cognito/          # User pool, app client, IdPs, triggers
    └── github-oidc-shim/ # GitHub → OIDC adapter (imported CloudFormation stack)
```

Upper stacks read lower stacks' outputs via `terraform_remote_state`. Reusable logic lives in modules.

---

## Stack Details

### `bootstrap/` — Run Once

Creates the S3 bucket that stores all Terraform state and the DynamoDB table used for state locking. Never destroyed.

### `10-persistent/` — Never Destroyed

| Resource | Details |
|---|---|
| VPC | `10.0.0.0/16`, 2 AZs, 3 subnet tiers |
| ECR repositories | `structra-backend`, `structra-worker` |
| IAM roles | Backend Lambda role, Worker Lambda role |
| S3 (frontend) | Private bucket; CloudFront OAC policy |
| Cognito | Imported live pool (see [Chapter 3](./ch_3_authentication.md)) |
| DNS (Route53 zone) | `structra.cloud` hosted zone |

### `20-data/` — Stop to Save Cost

| Resource | Details |
|---|---|
| RDS PostgreSQL 16 | `db.t3.micro`, private subnets, `publicly_accessible=false` |
| Secrets | SSM SecureStrings (DB password, Django key, Razorpay, SMTP, internal token) |

RDS has `backup_retention_period = 0` (AWS Free Tier cap). Increase once off the free plan.

### `30-compute/` — Destroy/Stop Freely

| Resource | Details |
|---|---|
| NAT instance | `t4g.micro` EC2, public subnet, `source_dest_check=false` |
| Backend Lambda | Container image from ECR, VPC-attached (private app subnets) |
| Worker Lambda | Container image from ECR, **no VPC** |
| SQS eval queue | `structra-eval-queue`, visibility timeout = `worker_timeout × 6` |
| SQS DLQ | `structra-eval-dlq`, 14-day retention, 3 max receives before DLQ |
| SQS event source mapping | `batch_size=1`, connects queue to worker Lambda |
| API Gateway | HTTP API v2, `$default` stage, AWS_PROXY to backend Lambda |
| CloudFront | Distribution with OAC to private S3 bucket |
| Security groups | Backend Lambda → RDS (5432), NAT → internet |

The full picture of what these resources do at runtime is in [Chapter 2 — System Architecture](./ch_2_architecture.md); this chapter is the "how it's provisioned" view.

---

## The Cost On/Off Switch

Only **two** resources cost money while idle: the **NAT instance** (EC2) and **RDS**. Everything else (Lambda, API Gateway, SQS, CloudFront, S3) is pay-per-use and costs ≈ $0 when nothing is happening.

```bash
# Turn the app off (data preserved, ~$2.60/mo residual)
make prod-down    # stops NAT EC2 + RDS instance

# Turn the app back on (no redeploy needed, ~2-3 min)
make prod-up      # starts RDS + NAT EC2
```

The Makefile targets call `aws ec2 stop-instances` / `aws rds stop-db-instance` (and their start equivalents). This is an **operational action**, not a Terraform destroy — data is kept.

> **Note:** A stopped RDS auto-restarts after 7 days. For long pauses, run `make prod-down` again after AWS auto-restarts it. This same start/stop mechanism is also automated by GitHub Actions — see `infra-start.yml`, `infra-stop.yml`, and `scheduled-infra-stop.yml` in [Chapter 7](./ch_7_cicd.md#infrastructure-workflows).

---

## IAM Roles

### Backend Lambda Role

Permissions granted:
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`
- `ec2:CreateNetworkInterface`, `ec2:DescribeNetworkInterfaces`, `ec2:DeleteNetworkInterface` (VPC attachment)
- `ssm:GetParameter`, `ssm:GetParameters` (read SSM secrets)
- `sqs:SendMessage` on the eval queue (publish evaluation jobs)
- `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on the assets bucket

### Worker Lambda Role

Permissions granted:
- `logs:*` (CloudWatch)
- `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:GetQueueAttributes` on the eval queue
- `bedrock:InvokeModel` on the Llama 3.3 model ARN
- `ecr:GetAuthorizationToken`, `ecr:BatchGetImage`, `ecr:GetDownloadUrlForLayer` (image pull)

---

## Secrets — SSM Parameter Store

All secrets are **SecureStrings** (KMS-encrypted), created manually so they never enter git. Terraform reads them at `apply` time using `data "aws_ssm_parameter"` and injects them as Lambda environment variables.

| Parameter path | Injected as |
|---|---|
| `/structra/prod/db_password` | `DB_PASSWORD` |
| `/structra/prod/django_secret_key` | `DJANGO_SECRET_KEY` |
| `/structra/prod/razorpay_secret` | `RAZORPAY_KEY_SECRET` |
| `/structra/prod/razorpay_webhook_secret` | `RAZORPAY_WEBHOOK_SECRET` |
| `/structra/prod/smtp_password` | `SMTP_PASS` (Cognito trigger Lambda) |
| `/structra/prod/internal_api_token` | `INTERNAL_API_TOKEN` |

To rotate a secret: update the SSM value, then run `terraform apply` on `30-compute` to push the new env var to the Lambda (or update the Lambda env directly via CLI for zero-downtime rotation).

These are strictly **application** secrets. CI-only deployment values (Lambda names, bucket names, role ARNs) live in GitHub repository secrets instead — see [Chapter 7](./ch_7_cicd.md#secrets-in-github-ci-only).

---

## Networking — Subnet Layout

```
VPC: 10.0.0.0/16

  AZ-a (ap-south-1a)            AZ-b (ap-south-1b)
  ┌─────────────────────┐       ┌─────────────────────┐
  │ Public subnet        │       │ Public subnet        │
  │ 10.0.1.0/24          │       │ 10.0.2.0/24          │
  │ [NAT instance]       │       │                     │
  └─────────────────────┘       └─────────────────────┘
  ┌─────────────────────┐       ┌─────────────────────┐
  │ Private app subnet   │       │ Private app subnet   │
  │ 10.0.11.0/24         │       │ 10.0.12.0/24         │
  │ [Backend Lambda ENI] │       │ [Backend Lambda ENI] │
  └─────────────────────┘       └─────────────────────┘
  ┌─────────────────────┐       ┌─────────────────────┐
  │ Private DB subnet    │       │ Private DB subnet    │
  │ 10.0.21.0/24         │       │ 10.0.22.0/24         │
  │ [RDS primary]        │       │ [RDS subnet group]   │
  └─────────────────────┘       └─────────────────────┘
```

Private app subnets route `0.0.0.0/0` → NAT instance network interface.
Private DB subnets have no `0.0.0.0/0` route at all.

---

## Free Tier Notes

This account is on the AWS Free plan, which influenced two settings:

- `backup_retention_period = 0` on RDS (Free Tier caps retention)
- `t4g.micro` for the NAT instance (Free Tier eligible; `t4g.nano` is not)
- `AWS_REGION` is never set in Lambda env (reserved variable the runtime fills automatically)

Revisit instance sizing and enable backup retention once off the free plan.

---

**See also:** [Chapter 2 — System Architecture](./ch_2_architecture.md) for what these resources do at runtime · [Chapter 7 — CI/CD](./ch_7_cicd.md) for how these resources get deployed and updated.
