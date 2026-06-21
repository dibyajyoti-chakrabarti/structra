# Structra — Evaluation Worker

The worker is a **stateless Lambda microservice** that consumes evaluation jobs from SQS, runs a Node.js rule engine, calls AWS Bedrock for AI suggestions, and POSTs the result back to the backend via a secret-authenticated HTTP callback. It owns no database.

---

## Why a Separate Worker?

Evaluations take ~12 seconds (rule engine + LLM call). Running them inside the HTTP request would:
- Block the user's browser for 12 seconds
- Risk hitting API Gateway's 29-second hard timeout
- Tie up the backend Lambda during slow AI calls

SQS decouples the web request from the compute. The backend publishes a job and returns `202` immediately; the worker processes it asynchronously.

---

## Stateless Design (database-per-service)

The worker **never connects to RDS**. Instead:

- It receives a **self-contained job payload**: `{ runId, canvasState, workspaceTier }`
- It does all compute locally
- It **POSTs the result** back to the backend callback endpoint with a shared-secret header (`X-Internal-Token`)
- The backend performs all persistence (EvaluationRun update, EvaluationLog, audit event, token refund)

Because it never touches RDS, the worker is **not VPC-attached** — it reaches Bedrock and the backend API directly over the internet (no NAT, faster cold starts).

---

## Files

```
worker/
├── evaluation_worker.py     # Entry point: main loop / Lambda handler
├── evaluation_service.py    # Local-dev path: DB persistence (docker-compose only)
├── evaluation_compute.py    # Pure compute: rule engine + Bedrock calls (shared by both modes)
├── evaluation_queue.py      # Queue abstraction: LocalQueue (DB) and SQSQueue
├── cloud_handler.py         # Lambda handler: receives SQS event, POSTs result to backend
├── sqs_worker.py            # SQS-mode entry wrapper (used by local SQS testing)
├── sqs_publisher.py         # SQS send helper (used by tests and local tools)
├── evaluation/
│   ├── runner.mjs           # Node.js rule engine entry point
│   └── evaluateRules.mjs    # Rule evaluation logic
├── worker_hub/
│   └── settings/            # Minimal Django settings (no admin, no DRF, no middleware)
│       ├── base.py
│       ├── local.py
│       └── production.py
└── tests/
    ├── test_evaluation_queue.py
    └── test_ai_evaluation_tokens.py
```

---

## Two Execution Modes

### Production (Lambda + SQS)

`cloud_handler.py` is the Lambda entry point (`LAMBDA_HANDLER=cloud_handler.handler`).

```
SQS → Worker Lambda → cloud_handler.py
         ├── evaluate_canvas_state() (rule engine subprocess)
         ├── call_bedrock_for_prompt() (Bedrock converse API)
         └── POST /api/internal/evaluations/{runId}/result/
                   (X-Internal-Token header)
```

The handler iterates over SQS records (always 1 per invocation, `batch_size=1`) and for each:
1. Calls `evaluate_canvas_state(canvasState, workspaceTier)` — spawns the Node.js subprocess
2. If failures exist, calls `call_bedrock_for_prompt(prompt)` — LLM suggestions
3. For enterprise tier, calls `_call_bedrock_cloud_analysis(...)` — second AI pass
4. POSTs the assembled result to the backend callback
5. If the POST itself fails, catches the exception (SQS will retry → DLQ after 3 attempts)

### Local Dev (long-running process + DB queue)

`evaluation_worker.py` is the entry point (`python evaluation_worker.py`).

```
DB queue (EvaluationQueueJob) → evaluation_worker.py
         ├── dequeue() (poll every 5s)
         ├── evaluate_canvas_state() (rule engine subprocess)
         ├── call_bedrock_for_prompt() (Bedrock)
         └── evaluation_service.run_evaluation_job() → writes directly to RDS
```

In local dev the worker IS connected to Django ORM (it has `PYTHONPATH=/app/backend`), so it writes results directly to the database. The `evaluation_service.py` module handles all persistence for this path.

---

## The Rule Engine (Node.js Subprocess)

The canvas state is evaluated by a **Node.js subprocess** in `worker/evaluation/`:

```
python: subprocess.run(["node", "evaluation/runner.mjs", "--input", json_payload])
```

`runner.mjs` loads the canvas JSON, passes it to `evaluateRules.mjs`, and returns a JSON payload:

```json
{
  "results": [
    { "ruleId": "...", "ruleName": "...", "passed": true/false, "tier": "core", ... }
  ],
  "summary": { "applicable": 12, "passed": 10, "failed": 2 },
  "score": 83,
  "prompt": "You are an architecture advisor. The following rules failed: ..."
}
```

Rules are tier-gated: `CORE` rules apply to all plans; `INDIVIDUAL`, `TEAM`, `ENTERPRISE` rules only apply to canvases evaluated under that plan tier or above. The prompt string is pre-built by the rule engine and passed directly to Bedrock.

---

## Bedrock Integration

Model: `us.meta.llama3-3-70b-instruct-v1:0` in `us-east-1` (cross-region from `ap-south-1`).

Two Bedrock calls (in `evaluation_compute.py`):

### 1. `call_bedrock_for_prompt(prompt)` — Standard Suggestions

- Non-streaming `converse` API call
- Input: the pre-built prompt from the rule engine
- Output: AI narrative text with improvement suggestions
- On failure: returns `(None, True)` — the caller sets `ai_error=True` and the backend refunds the insight token

### 2. `_call_bedrock_cloud_analysis(failed_rules, canvas, metadata)` — Enterprise Cloud Analysis

- Second Bedrock call, only for `enterprise` tier
- Input: list of failed rules + the full enriched canvas + system metadata
- Output: infrastructure-specific analysis (cloud provider details, scalability concerns, etc.)
- Failure is non-fatal: evaluation continues with standard suggestions only

### Model Choice

Llama 3.3 70B was chosen over Claude models because:
- Available on-demand in this AWS account without a marketplace subscription
- No cross-region inference profile required
- Cheaper per-token than equivalent Claude models in this configuration

The model was previously referred to as Gemini in some older files — the backend was migrated from Google Gemini to AWS Bedrock.

---

## Semantic Enrichment

Before the rule engine runs, `_semantic_enrich_canvas_state(canvas_state, workspace_tier)` adds derived metadata to the canvas (e.g. inferred service types, connectivity patterns). This improves rule accuracy and provides richer context to the AI prompt.

---

## Queue Abstraction

`evaluation_queue.py` provides a unified interface with two backends:

```python
class LocalQueue:
    backend_name = "local-db"
    idle_sleep_seconds = 5        # poll interval

class SQSQueue:
    backend_name = "sqs"
    idle_sleep_seconds = None     # SQS triggers Lambda; no polling loop

def get_evaluation_queue() -> LocalQueue | SQSQueue:
    # returns SQSQueue if USE_SQS=true, else LocalQueue
```

Both implement `dequeue()`, `ack(job)`, and `fail(job, exc)`.

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Rule engine subprocess fails | Raises exception → Lambda fails → SQS retries → DLQ after 3 |
| Bedrock returns no response | `ai_error=True` → POST result with `ai_error=True` → backend refunds insight token |
| Backend callback POST fails | Lambda fails → SQS retries the entire job → DLQ after 3 |
| `runId` missing or run not found | Job acknowledged immediately (no retry) |
| Run already COMPLETED or FAILED | Job acknowledged immediately (idempotency) |

---

## Environment Variables (Production)

| Variable | Source | Notes |
|---|---|---|
| `DJANGO_ENV` | Lambda env | `production` |
| `BACKEND_BASE_URL` | SSM → Lambda env | Backend API URL for the result callback |
| `INTERNAL_API_TOKEN` | SSM → Lambda env | Shared secret for `X-Internal-Token` header |
| `BEDROCK_REGION` | Lambda env | `us-east-1` |
| `BEDROCK_MODEL_ID` | Lambda env | `us.meta.llama3-3-70b-instruct-v1:0` |
| `USE_SQS` | Lambda env | `true` |
| `SQS_QUEUE_URL` | Lambda env | The eval queue URL |
| `AWS_REGION` | Runtime-injected | `ap-south-1` (reserved; do not set in env) |

---

## Docker Build

The worker Dockerfile builds from the monorepo root and copies `backend/` into the image:

```dockerfile
COPY backend/ /app/backend/
COPY worker/ /app/worker/
ENV PYTHONPATH=/app/backend
```

This gives the worker full Django ORM access to `workspaces`, `systems`, `accounts`, and `audit` models without duplicating them. **The worker never runs migrations** — only the backend does.

Two Dockerfiles:
- `Dockerfile` — standard long-running process (local dev)
- `Dockerfile.lambda` — Lambda container image (production)
