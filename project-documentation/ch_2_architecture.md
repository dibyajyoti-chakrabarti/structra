# Chapter 2 — System Architecture

![Structra System Architecture](./assets/architecture.png)

> Mermaid source: [assets/architecture.mmd](./assets/architecture.mmd)

---

## The Big Picture

Structra is a **fully serverless application** on AWS (`ap-south-1`). No always-on application servers — all code runs on Lambda, on demand. The only resources running 24/7 are a single NAT instance (EC2) and the RDS database — both of which can be stopped without losing data (see [Chapter 6](./ch_6_infrastructure.md#the-cost-onoff-switch)).

Three runtime components:

| Component | Runtime | Reaches |
|---|---|---|
| **Backend Lambda** | Django + Mangum, inside VPC, private app subnet | RDS (private), public internet via NAT |
| **Worker Lambda** | Python + Node.js, **no VPC** | Bedrock (direct internet), backend API callback (direct internet) |
| **Frontend** | Static React SPA in S3 | CloudFront serves it; browser hits API Gateway |

---

## Request Flows

### 1. Loading the App (static frontend)

```
Browser → CloudFront → (Origin Access Control) → private S3 bucket
```

S3 is private — only CloudFront can read it (OAC policy). SPA routing works because CloudFront rewrites S3 403/404 errors to `/index.html` (200), letting React Router take over.

### 2. An Authenticated API Call

```
Browser → Cognito → (JWT issued)
Browser → API Gateway → Backend Lambda (VPC)
              ├── validates JWT against Cognito JWKS  ──(NAT)──▶ internet
              ├── reads/writes RDS                    ──(in-VPC)──▶ private DB
              └── returns JSON response
```

API Gateway does not "network-route" to the Lambda; it **invokes** it through the Lambda service (AWS_PROXY integration). The Lambda then makes its own outbound calls inside the VPC. Full JWT validation mechanics are in [Chapter 3](./ch_3_authentication.md#jwt-validation-in-the-backend).

### 3. Running an AI Evaluation (async)

```
1. Browser → API GW → Backend: POST /api/evaluate/
2. Backend: creates EvaluationRun (PENDING), publishes self-contained job
   { runId, canvasState, workspaceTier } to SQS → returns 202 immediately
3. SQS event source mapping → triggers Worker Lambda
4. Worker (stateless, no DB):
      ├── Node.js rule engine (subprocess) scores the canvas
      └── Bedrock Llama 3.3 70B generates narrative suggestions
            (enterprise: second Bedrock call for cloud-specific analysis)
5. Worker → POST /api/internal/evaluations/{runId}/result/
                (X-Internal-Token header — shared secret)
6. Backend callback: persists result (EvaluationRun → COMPLETED,
   EvaluationLog, audit event, insight token refund if AI error)
7. Browser polls GET /api/workspaces/{id}/evaluations/ → sees COMPLETED
```

The user's request returns at step 2. The evaluation takes ~12 seconds, entirely in the background. **SQS decouples** the fast web request from the slow compute. The worker never touches RDS — it POSTs the result back through a secret-authed backend callback. This flow is covered rule-by-rule, model-by-model in [Chapter 5](./ch_5_evaluation_pipeline.md).

---

## Component Reference

### VPC — `10.0.0.0/16`, 2 Availability Zones

Three subnet tiers, each pair spread across 2 AZs:

| Tier | Internet? | Hosts |
|---|---|---|
| **Public** | Yes (Internet Gateway) | NAT instance (EC2) |
| **Private App** | No direct access | Backend Lambda ENIs |
| **Private DB** | No access at all | RDS PostgreSQL |

Subnet placement is the primary security boundary. The database being in a private subnet is what makes it unreachable from outside — no security group rule can compensate for a missing route. Full CIDR layout in [Chapter 6](./ch_6_infrastructure.md#networking--subnet-layout).

### NAT Instance (`t4g.micro` EC2)

The backend Lambda is VPC-attached (needs private RDS) but also needs to reach public internet services: Cognito JWKS, Razorpay, Zoho SMTP. The NAT instance provides that path.

- `source_dest_check = false` — allows forwarding packets not addressed to itself
- Uses iptables masquerading
- Auto-assigned public IP (no Elastic IP, saves IPv4 charge while stopped)
- Private app subnets' route tables point `0.0.0.0/0` to its network interface

**Why not NAT Gateway?** ~$32/mo idle vs ~$3/mo for the instance. For an early-stage product the difference matters. Accepted trade-off: single point of failure in one AZ — easily upgraded later.

**Why not VPC interface endpoints?** ~$7/mo each, and they don't cover Cognito JWKS or Razorpay (public internet, not AWS private services). They'd cost more and still break auth.

### Backend Lambda + API Gateway

- **Django 6** running as a **container-image Lambda**
- **Mangum** adapts Lambda/API Gateway events to the ASGI interface Django expects — no code rewrite needed
- **API Gateway (HTTP API v2)** fronts it; every path proxies to the Lambda via AWS_PROXY
- Attached to the **private app subnets**; reaches RDS over private VPC networking
- Reaches public internet via the NAT instance

Cold starts: ~3s on first request after idle (includes VPC ENI attach). Negligible for an architecture evaluation tool. Endpoint-by-endpoint detail is in [Chapter 4](./ch_4_backend_service.md).

### Worker Lambda (Stateless Microservice)

- **Not VPC-attached** — no database, no NAT needed
- Triggered by SQS event source mapping (`batch_size = 1`)
- Receives a self-contained job payload: `{ runId, canvasState, workspaceTier }`
- Runs two compute phases: the Node.js rule engine, then Bedrock
- POSTs the result back to `/api/internal/evaluations/{runId}/result/` with `X-Internal-Token`
- DLQ catches messages that fail 3 times (14-day retention)

Full internals — execution modes, queue abstraction, error handling — are in [Chapter 5](./ch_5_evaluation_pipeline.md).

### RDS PostgreSQL

- Private subnets (`publicly_accessible = false`)
- Only the backend Lambda can reach it (security group allows port 5432 from app subnets)
- The worker never connects to it
- Migrations run from inside the VPC via the backend Lambda, invoked by a GitHub Actions workflow (see [Chapter 7](./ch_7_cicd.md#run-migrationsyml--database-migrations))

### CloudFront + S3 + OAC (Frontend)

- React app built to static files and uploaded to a **private S3 bucket**
- CloudFront serves it globally over HTTPS with caching
- **Origin Access Control (OAC)** — only CloudFront can read the bucket; direct S3 access is blocked
- SPA routing: CloudFront error pages for 403/404 redirect to `/index.html` with a 200 status

### AWS Cognito

Manages all authentication. The user pool is `ap-south-1_QD5vjF5ej`. Five trigger Lambdas handle sign-up, confirmation, and the custom OTP challenge flow; Google and GitHub are federated identity providers. Full detail — including the GitHub OIDC shim and the exact JWT validation steps — is in [Chapter 3](./ch_3_authentication.md).

### SQS Evaluation Queue

- **Main queue:** `structra-eval-queue` — visibility timeout = `worker_timeout × 6`
- **Dead-letter queue (DLQ):** `structra-eval-dlq` — 14-day retention, receives after 3 failed receives
- **Event source mapping:** `batch_size = 1` (one job per worker invocation)
- Local dev uses a `EvaluationQueueJob` PostgreSQL table instead; toggled by `USE_SQS=false`

Full queue mechanics in [Chapter 5](./ch_5_evaluation_pipeline.md#queue-abstraction).

### SSM Parameter Store (Secrets)

Six secrets stored as SecureStrings, created out-of-band (never enter git): DB password, Django secret key, Razorpay key + webhook secret, SMTP password, and the internal API token. Terraform reads them at `apply` time and injects them as Lambda environment variables. Full table in [Chapter 6](./ch_6_infrastructure.md#secrets--ssm-parameter-store).

### AWS Bedrock (AI Model)

- Model: **Llama 3.3 70B** (`us.meta.llama3-3-70b-instruct-v1:0`)
- Region: `us-east-1` (cross-region from the main `ap-south-1`)
- API: non-streaming `converse` call
- Chosen because: on-demand without marketplace subscription; cheaper than Claude in this account's configuration

Enterprise tier gets a second Bedrock call: a separate "cloud analysis" pass. Full rationale and call structure in [Chapter 5](./ch_5_evaluation_pipeline.md#bedrock-integration).

---

## Security Posture Summary

| Threat | Mitigation |
|---|---|
| Database exposed to internet | Private subnets, `publicly_accessible = false`, security group allows only app subnets |
| Frontend origin tampered | CloudFront OAC — S3 blocks all direct public access |
| Unauthorized API access | Cognito JWT on every request, validated against public JWKS |
| Worker writes directly to DB | Worker is stateless; callback endpoint uses `X-Internal-Token` shared secret |
| Secrets in code or git | SSM SecureStrings, injected at deploy time by Terraform |
| SQS message replay | Idempotency: worker checks `run.status` before processing; already-terminal runs are acked immediately |

---

**See also:** [Chapter 3 — Authentication](./ch_3_authentication.md) for Cognito internals · [Chapter 5 — The Evaluation Pipeline](./ch_5_evaluation_pipeline.md) for the async flow in full · [Chapter 6 — Infrastructure](./ch_6_infrastructure.md) for the Terraform layer that builds all of this.
