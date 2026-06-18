# Structra Cloud Architecture — Explained

This document explains **what we built**, **how it fits together**, and **why each
decision was made**. It complements [README.md](./README.md) (which is the operator
runbook). Read this to understand the system; read the README to operate it.

---

## 1. The big picture

Structra runs as a **serverless application** on AWS account `042843883108`, region
`ap-south-1`. There are no always-on application servers — code runs on Lambda, on
demand. The only machines that run 24/7 are a tiny NAT instance and the database.

```
                              INTERNET
                                 │
        ┌────────────────────────┼─────────────────────────────┐
        │ user's browser         │                             │
        ▼                        ▼                             ▼
  ┌───────────┐          ┌──────────────┐              ┌────────────────┐
  │  Cognito  │          │  CloudFront   │              │  API Gateway    │
  │ user pool │◀─ auth ─▶│  (CDN, OAC)   │              │  (HTTP API)     │
  │ +4 triggers          └──────┬───────┘              └───────┬────────┘
  └───────────┘                 │ static SPA                   │ AWS_PROXY
                                ▼                              ▼  (invoke)
                         ┌─────────────┐              ╔═══════════════════════╗
                         │ S3 (private)│              ║   VPC 10.0.0.0/16      ║
                         │  frontend   │              ║  (2 Availability Zones)║
                         └─────────────┘              ║                        ║
                                                      ║  PUBLIC subnets        ║
                                                      ║  ┌──────────────────┐  ║
                              internet egress ◀───────╫──┤  NAT instance     │  ║
                              (Cognito JWKS,          ║  │  (t4g.micro EC2)  │  ║
                               Bedrock, Razorpay,     ║  └─────────▲────────┘  ║
                               Zoho SMTP)             ║            │ 0.0.0.0/0 ║
                                                      ║  PRIVATE app subnets   ║
                                                      ║  ┌───────────────────┐ ║
                                                      ║  │ Backend Lambda     │ ║
                                            ┌─────────╫──┤ (Django + Mangum)  │ ║
                                            │  SQS    ║  └───────────────────┘ ║
                                            │ (queue) ║  ┌───────────────────┐ ║
                                            └────────▶║  │ Worker Lambda      │ ║
                                              trigger ║  │ (evaluations)      │ ║
                                                      ║  └─────────┬─────────┘ ║
                                                      ║  PRIVATE db subnets    ║
                                                      ║  ┌───────────────────┐ ║
                                                      ║  │ RDS PostgreSQL     │ ║
                                                      ║  │ (private)          │ ║
                                                      ║  └───────────────────┘ ║
                                                      ╚═══════════════════════╝
```

**Core idea:** the database is private (unreachable from the internet). The Lambdas
live *inside* the VPC so they can reach it. But a VPC-attached Lambda loses its default
internet access, so a **NAT instance** gives them a way out to the public services they
depend on. The frontend is just static files in S3, served globally by CloudFront.

---

## 2. How a request actually flows

### A. Loading the app (static frontend)
```
Browser → CloudFront → (Origin Access Control) → private S3 bucket → returns index.html + JS/CSS
```
The S3 bucket is **private** — only CloudFront can read it (enforced by an OAC policy).
Users never hit S3 directly. SPA routes (e.g. `/login`) work because CloudFront rewrites
S3's 403/404 to `/index.html` (200), letting the React router take over.

### B. An authenticated API call
```
Browser → Cognito (log in, get a JWT)
Browser → API Gateway → Backend Lambda
            ├─ validates the JWT against Cognito's JWKS  ──(NAT)──▶ internet
            ├─ reads/writes RDS                           ──(in-VPC)──▶ private DB
            └─ returns JSON
```
API Gateway doesn't "network route" to the Lambda — it **invokes** it through the Lambda
service (AWS_PROXY). The Lambda then makes its own outbound calls: validating the token
needs Cognito's public JWKS endpoint (internet → via NAT), while the database is reached
privately inside the VPC.

### C. Running an evaluation (the asynchronous part)
```
1. Browser → API GW → Backend Lambda:  POST /api/evaluation/ai/
2. Backend Lambda: create EvaluationRun row, send {runId,...} to SQS, return 200 immediately
3. SQS → triggers the Worker Lambda (event source mapping)
4. Worker Lambda: run_evaluation_job()
      ├─ Node.js rule engine (subprocess) scores the architecture
      ├─ Bedrock (Llama 3.3) generates suggestions   ──(NAT)──▶ us-east-1
      └─ writes results back to RDS
5. Browser polls GET /api/.../evaluations/  → sees COMPLETED + the report
```
The user's request finishes at step 2 — they don't wait for the (slow) evaluation. **SQS
decouples** the fast web request from the slow background work. This is why the system
feels responsive even though an evaluation takes ~12 seconds.

---

## 3. Every component, and *why*

### VPC with public + private subnets (2 AZs)
A dedicated network (not AWS's default VPC) so everything is codified and isolated.
Three tiers of subnets, spread across two Availability Zones:
- **public** — has a route to the internet (Internet Gateway). Hosts the NAT instance.
- **private app** — no direct internet. Hosts the Lambdas.
- **private db** — fully isolated. Hosts RDS.

> **Why subnets matter:** placement decides reachability. Anything that must be reachable
> from the internet goes public; anything that must *never* be goes private. The database
> being in a private subnet is what makes it unreachable from outside — the strongest part
> of the security posture.

### NAT instance (a small EC2) — **the key cost decision**
A private-subnet Lambda has **no internet access**. But our Lambdas must reach public
services: Cognito's JWKS (to validate tokens), Bedrock, Razorpay, Zoho SMTP. Something has
to give them a path out.

- **Option considered — NAT Gateway:** AWS-managed, zero-maintenance, ~**$32/mo** even idle.
- **Option chosen — NAT instance:** a `t4g.micro` EC2 running iptables masquerading. ~**$3/mo**,
  and it can be **stopped** to ~$0 when the app is off.

> **Why an instance over the gateway:** for an early-stage product the ~$29/mo difference
> matters more than the gateway's managed HA. The instance is a single point of failure in
> one AZ — an accepted trade-off, easily upgraded to a NAT Gateway later. We also deliberately
> rejected **VPC interface endpoints** (PrivateLink): they're ~$7/mo *each*, and they don't
> cover Cognito JWKS or Razorpay (which are public internet, not AWS services) — so they'd
> cost more *and* still break auth.

Technical notes: the instance has `source_dest_check = false` (so it can forward packets not
addressed to itself), uses an auto-assigned public IP (no Elastic IP — saves the IPv4 charge
while stopped), and the private subnets' route tables send `0.0.0.0/0` to its network interface.

### Backend Lambda + API Gateway (HTTP API)
The Django app runs as a **container-image Lambda**. **Mangum** adapts Lambda/API-Gateway
events into the ASGI calls Django expects — so the *same* Django code runs in Lambda with no
rewrite. API Gateway (HTTP API, the cheaper v2) fronts it and proxies every path to the Lambda.

> **Why Lambda over a server:** no idle cost, scales to zero, scales up automatically. The
> trade-off is cold starts (~3s on the first request after idle, including VPC ENI attach) —
> negligible for an evaluation tool.

### Worker Lambda + SQS (and why we dropped Strands)
Evaluations are slow (rule engine + an LLM call). Doing them inside the web request would
make the UI hang and risk API Gateway's 29s timeout. So the backend drops a message on **SQS**
and returns instantly; a separate **worker Lambda** is triggered by the queue to do the work.

The worker calls `run_evaluation_job()` directly — the same code path the local worker uses.
We originally planned to wrap this in a **Strands agent**, but Strands requires Bedrock's
*streaming* tool-use API, which on this account hit a marketplace-subscription wall (and the
open-source model we use doesn't support streaming tool-use anyway). Since the evaluation
pipeline is a fixed sequence, the agent added no value — so the worker runs the steps directly.
A dead-letter queue (DLQ) catches messages that fail 3 times.

### RDS PostgreSQL (private)
A single managed Postgres instance in the **private db subnets**, `publicly_accessible = false`.
Both Lambdas reach it over the VPC's internal network; the security group only allows port 5432
from the app subnets.

> **Why private:** the database holds all user/workspace data — it should never be reachable
> from the internet. The cost of this choice is that migrations can't be run from a laptop;
> they run from inside the VPC via the backend Lambda (see README → Migrations).

### CloudFront + S3 + OAC (frontend)
The React app is built to static files and uploaded to a **private** S3 bucket. **CloudFront**
serves it worldwide over HTTPS with caching. **Origin Access Control (OAC)** is the mechanism
that lets *only* CloudFront read the private bucket — the bucket itself blocks all public access.

### Cognito (referenced, not created)
Auth (email OTP + Google/GitHub OAuth) is handled by an **existing** Cognito user pool with 4
Lambda triggers (pre-signup, create/define/verify-auth). Terraform **references** the pool (a
read-only data source) and never manages or destroys it — losing it would mean losing every
user identity. Trigger management is available but gated off by default, because importing live
auth functions is a deliberate, careful step rather than something a routine apply should do.

### SSM Parameter Store (secrets) — **the secrets decision**
Five secrets (DB password, Django secret key, Razorpay secret + webhook secret, email password)
are stored as **SecureStrings** in SSM Parameter Store, created out-of-band so they never enter
git. Terraform reads them at apply time and injects them as Lambda environment variables — so the
app keeps reading plain `os.getenv` with **no code change**.

> **Why SSM, not GitHub Secrets:** the *running Lambda* needs the values, and a Lambda cannot
> read GitHub Secrets (those exist only during a CI run). SSM is AWS-native, free, readable both
> by a manual `apply` and by future CI/CD. GitHub Secrets will later hold the *deploy
> credentials*, while SSM keeps holding the *app secrets*.

### Bedrock (the AI model)
Evaluations call **Bedrock** for suggestions. We use the open-source **Llama 3.3 70B**
(`us.meta.llama3-3-70b-instruct-v1:0`) in **us-east-1**, via the non-streaming `converse` API.
Anthropic Claude models in ap-south-1 needed cross-region inference profiles that hit a
marketplace/payment wall on this account; the open-source model works on-demand without that,
and is cheaper. The worker reaches Bedrock through the NAT instance.

---

## 4. How the Terraform is organized (and the cost on/off switch)

The IaC is split into **layered stacks by lifecycle**, each with its own state file, so the
expensive parts can be turned off without disturbing the rest:

```
bootstrap/            → S3 state bucket + DynamoDB lock        (run once)
stacks/10-persistent/ → VPC, ECR, IAM roles, frontend bucket   (NEVER destroyed)
stacks/20-data/       → RDS                                    (stop to save cost)
stacks/30-compute/    → NAT, Lambdas, SQS, API GW, CloudFront  (stop NAT / destroy freely)
```

Upper layers read lower layers' outputs through `terraform_remote_state`, so they stay loosely
coupled. Reusable building blocks live in `modules/` (networking, nat-instance, rds, lambda-fn,
api-gateway, frontend-cdn, cognito-triggers).

**The cost model:** only **two** resources cost money while idle — the NAT instance (EC2) and
RDS. Everything else (Lambda, API GW, SQS, CloudFront, S3) is pay-per-use and costs ≈ $0 when
nothing is happening. So turning the app "off" is just **stopping those two** — an operational
AWS CLI action (`make prod-down`), *not* a Terraform destroy. Data is preserved; `make prod-up`
resumes with no redeploy. (A stopped RDS auto-restarts after 7 days, so long pauses need a
re-stop.)

```
make prod-down   # stop NAT + RDS         → ~$2.6/mo residual, data kept
make prod-up     # start RDS + NAT        → back in ~2-3 min, no apply needed
```

---

## 5. Decisions at a glance

| Decision | Chosen | Why |
|---|---|---|
| Compute | Lambda (containers) | No idle cost; scales to zero; same Django code via Mangum |
| Internet egress | **NAT instance** (t4g.micro) | ~$3/mo vs ~$32/mo NAT Gateway; stoppable |
| Endpoints vs NAT | NAT | Endpoints cost more *and* don't cover Cognito/Razorpay (public) |
| Async work | SQS + worker Lambda | Decouple slow eval from the web request |
| Orchestration | Direct call, **no Strands** | Bedrock streaming tool-use blocked; fixed pipeline needs no agent |
| Database | Private RDS | Never internet-reachable; reached only in-VPC |
| Frontend | S3 + CloudFront + OAC | Cheap, global, private origin |
| Auth | Existing Cognito (referenced) | Irreplaceable; never managed/destroyed by TF |
| Secrets | SSM SecureString | AWS-native, free, no app change; Lambdas can read it |
| AI model | Llama 3.3 (us-east-1) | On-demand without marketplace wall; cheaper |
| IaC layout | Layered stacks | Stop/destroy expensive layers independently |
| Cost off-switch | Stop NAT + RDS | The only two idle-cost resources |

---

## 6. What's intentionally not here (yet)

- **Route53 / custom domain + TLS** — currently on the raw `*.cloudfront.net` / `*.execute-api`
  URLs.
- **CI/CD pipeline** — deploys are `make deploy-*` for now; GitHub Actions can be added later.
- **RDS Proxy** — connection pooling; only needed at higher concurrency.
- **New SES setup** — Cognito login OTP uses the existing verified SES identity; app email uses
  Zoho SMTP.
- **Multi-AZ NAT / RDS** — single-AZ for cost; upgrade when uptime matters more than spend.

---

## 7. Free Tier notes

This account is on the AWS Free plan, which shaped two settings: RDS `backup_retention_period = 0`
(retention is capped) and the NAT instance type `t4g.micro` (free-tier eligible; `t4g.nano` is not).
`AWS_REGION` is never set in Lambda env — it's a reserved key the runtime fills with the function's
region (`ap-south-1`). Raise the backup retention and revisit instance sizing once off the free plan.
