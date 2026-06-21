# Structra — Project Documentation

Internal technical documentation for the Structra monorepo.

---

## Contents

| Document | What it covers |
|---|---|
| [overview.md](./overview.md) | What Structra is, product concepts, tech stack, subscription plans |
| [architecture.md](./architecture.md) | Full system architecture — components, request flows, security |
| [aws.md](./aws.md) | AWS infrastructure, Terraform stacks, IAM, secrets, cost model |
| [auth.md](./auth.md) | Cognito setup, OTP flow, Google/GitHub OAuth, JWT validation |
| [backend.md](./backend.md) | Django apps, API endpoints, key models, evaluation dispatch |
| [worker.md](./worker.md) | Evaluation worker, rule engine, Bedrock AI, SQS queue |
| [local-dev.md](./local-dev.md) | How to run the full stack locally with Docker Compose |
| [cicd.md](./cicd.md) | GitHub Actions workflows, deployment order, OIDC setup |

## Architecture Diagram

![Structra System Architecture](./assets/architecture.png)

The Mermaid source is at [assets/architecture.mmd](./assets/architecture.mmd).
