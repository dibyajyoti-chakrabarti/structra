# Chapter 9 — Reference

A consolidated cram sheet. Everything here is explained in full elsewhere in the book — this chapter just collects the facts you'd want to have on one screen before an interview or a debugging session.

---

## All API Endpoints

| Area | Method | Path |
|---|---|---|
| Health | GET | `/api/health/` |
| Auth | POST | `/api/auth/register/` |
| Auth | POST | `/api/auth/login/` |
| Auth | POST | `/api/auth/logout/` |
| Auth | POST | `/api/auth/token/refresh/` |
| Auth | POST | `/api/auth/google/` |
| Auth | POST | `/api/auth/github/` |
| Auth | POST | `/api/auth/email-otp/initiate/` |
| Auth | POST | `/api/auth/email-otp/verify/` |
| Auth | POST | `/api/auth/password-reset/request/` |
| Auth | POST | `/api/auth/password-reset/confirm/` |
| Users | GET | `/api/users/search/?q=` |
| Users | GET | `/api/users/<username>/profile/` |
| Users | GET/PATCH | `/api/users/me/` |
| Workspaces | GET/POST | `/api/workspaces/` |
| Workspaces | GET/PATCH/DELETE | `/api/workspaces/<id>/` |
| Workspaces | GET | `/api/workspaces/public/search/?q=` |
| Workspaces | POST/DELETE | `/api/workspaces/<id>/star/` |
| Systems | GET/POST | `/api/workspaces/<id>/canvases/` |
| Systems | GET/PATCH/DELETE | `/api/workspaces/<ws_id>/canvases/<sys_id>/` |
| Systems | PUT | `/api/systems/<id>/canvas/` |
| Systems | GET/POST | `/api/workspaces/<id>/systems/<sys_id>/comments/` |
| Permissions | GET | `/api/workspaces/<id>/members/` |
| Permissions | DELETE | `/api/workspaces/<id>/members/<user_id>/` |
| Permissions | GET/POST | `/api/workspaces/<id>/systems/<sys_id>/permissions/` |
| Invitations | POST | `/api/workspaces/<id>/invitations/` |
| Invitations | POST | `/api/invitations/accept/` |
| Invitations | POST | `/api/invitations/decline/` |
| Notifications | GET | `/api/notifications/feed/` |
| Notifications | PATCH | `/api/notifications/<id>/read/` |
| Audit | GET | `/api/workspaces/<id>/audit/logs/` |
| Evaluation | POST | `/api/evaluate/` |
| Evaluation | GET | `/api/workspaces/<id>/evaluations/` |
| Evaluation | GET | `/api/workspaces/<id>/evaluations/<run_id>/` |
| Evaluation | GET | `/api/evaluation/insight-tokens/` |
| Evaluation | POST | `/api/internal/evaluations/<run_id>/result/` (`X-Internal-Token`) |
| Payments | POST | `/api/payments/checkout/` |
| Payments | POST | `/api/payments/webhook/` |
| Payments | GET | `/api/payments/subscription/` |
| Payments | POST | `/api/payments/seats/purchase/` |

Full context: [Chapter 4](./ch_4_backend_service.md).

---

## AWS Resource Names & IDs

| Resource | Value |
|---|---|
| AWS Account ID | `469465348250` |
| Primary region | `ap-south-1` (Mumbai) |
| Bedrock region | `us-east-1` |
| VPC CIDR | `10.0.0.0/16` |
| Cognito User Pool ID | minted on first apply, see `terraform output cognito_user_pool_id` |
| Cognito app client | `structra-web` |
| Cognito hosted UI domain | `auth.structra.cloud` |
| ECR repos | `structra-api`, `structra-worker` |
| SQS main queue | `structra-eval-queue` |
| SQS DLQ | `structra-eval-dlq` (14-day retention, 3 max receives) |
| Bedrock model ID | `us.meta.llama3-3-70b-instruct-v1:0` |
| RDS instance class | `db.t3.micro`, PostgreSQL 16 |
| NAT instance type | `t4g.micro` |
| GitHub Actions IAM role | `structra-github-OIDC-Role` |
| Route53 hosted zone | `structra.cloud` |
| GitHub repo | `dibyajyoti-chakrabarti/structra` |

Full context: [Chapter 6](./ch_6_infrastructure.md).

---

## SSM Parameter Store Secrets (application)

| Parameter path | Injected as | Used by |
|---|---|---|
| `/structra/prod/db_password` | `DB_PASSWORD` | Backend Lambda |
| `/structra/prod/django_secret_key` | `DJANGO_SECRET_KEY` | Backend Lambda |
| `/structra/prod/razorpay_secret` | `RAZORPAY_KEY_SECRET` | Backend Lambda |
| `/structra/prod/razorpay_webhook_secret` | `RAZORPAY_WEBHOOK_SECRET` | Backend Lambda |
| `/structra/prod/smtp_password` | `SMTP_PASS` | Cognito `create_auth` Lambda |
| `/structra/prod/internal_api_token` | `INTERNAL_API_TOKEN` | Backend + Worker Lambda |

Full context: [Chapter 6](./ch_6_infrastructure.md#secrets--ssm-parameter-store).

## GitHub Repository Secrets (CI only)

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

Full context: [Chapter 7](./ch_7_cicd.md#secrets-in-github-ci-only).

---

## Worker Environment Variables (Production)

| Variable | Notes |
|---|---|
| `DJANGO_ENV` | `production` |
| `BACKEND_BASE_URL` | Backend API URL for the result callback |
| `INTERNAL_API_TOKEN` | Shared secret for `X-Internal-Token` header |
| `BEDROCK_REGION` | `us-east-1` |
| `BEDROCK_MODEL_ID` | `us.meta.llama3-3-70b-instruct-v1:0` |
| `USE_SQS` | `true` |
| `SQS_QUEUE_URL` | The eval queue URL |
| `AWS_REGION` | Runtime-injected, never set manually |

Full context: [Chapter 5](./ch_5_evaluation_pipeline.md#environment-variables-production).

---

## GitHub Actions Workflows

| Workflow | Trigger | What it does |
|---|---|---|
| `deploy-backend.yml` | Push to `main`, `backend/**` or `lambdas/**` changed | Build + push backend image to ECR, update Lambda code |
| `deploy-worker.yml` | Push to `main`, `worker/**` changed | Build + push worker image to ECR, update Lambda code |
| `deploy-frontend.yml` | Push to `main`, `frontend/**` changed | Build, `s3 sync`, CloudFront invalidation |
| `run-migrations.yml` | Manual | Invokes backend Lambda with `{"migrate": true}` |
| `infra-start.yml` | Manual | Start RDS then NAT EC2 |
| `infra-stop.yml` | Manual | Stop NAT EC2 then RDS |
| `scheduled-infra-stop.yml` | Cron, every 6h | Auto-stop RDS if running |

Full context: [Chapter 7](./ch_7_cicd.md).

---

## Cognito Trigger Lambdas

| Lambda | Trigger | Timeout |
|---|---|---|
| `pre_signup.py` | Pre-signup | 3s |
| `post_confirmation.py` | Post-confirmation | 10s |
| `define_auth.py` | Define Auth Challenge | 3s |
| `create_auth.py` | Create Auth Challenge | 3s |
| `verify_auth.py` | Verify Auth Challenge | 3s |

Full context: [Chapter 3](./ch_3_authentication.md#cognito-trigger-lambdas).

---

## Ports & Local URLs

| Service | URL / Port |
|---|---|
| Backend API | `http://localhost:8000` |
| Frontend | `http://localhost:5173` |
| Docs site | `http://localhost:3000` |
| PostgreSQL | `localhost:5432` (`postgres` / db `structra`) |
| Zoho SMTP | `smtp.zoho.in:587` (STARTTLS) |

Full context: [Chapter 8](./ch_8_local_development.md).

---

## Cost Reference

| Item | Cost |
|---|---|
| NAT instance (`t4g.micro`) | ~$3/mo |
| NAT Gateway (rejected alternative) | ~$32/mo |
| VPC interface endpoint (rejected alternative) | ~$7/mo each |
| App fully stopped (`make prod-down`) | ~$2.60/mo residual |
| Lambda / API Gateway / SQS / CloudFront / S3 while idle | ≈ $0 (pay-per-use) |

Full context: [Chapter 2](./ch_2_architecture.md#nat-instance-t4gmicro-ec2), [Chapter 6](./ch_6_infrastructure.md#the-cost-onoff-switch).

---

**See also:** every row above links back to the chapter with the full explanation — use this chapter as an index, not a replacement for reading them.
