# Structra — The Book

This is the internal technical documentation for the Structra monorepo, written as a study book rather than a flat reference. Read it front to back to build a full mental model of the system — product, architecture, every service, infrastructure, and how it all deploys. Each chapter ends with a **See also** line pointing to related chapters, so you can also jump around once you've done one full pass.

**Live at:** [structra.cloud](https://structra.cloud) · **Public docs:** [docs.structra.cloud](https://docs.structra.cloud)

---

## Table of Contents

| Chapter | Covers |
|---|---|
| [Ch. 1 — Introduction](./ch_1_introduction.md) | What Structra is, core product concepts, subscription plans, monorepo layout, design philosophy |
| [Ch. 2 — System Architecture](./ch_2_architecture.md) | The big picture, network topology, the three request flows, security posture. **Home of the architecture diagram.** |
| [Ch. 3 — Authentication](./ch_3_authentication.md) | Cognito, the 5 trigger Lambdas, OTP/Google/GitHub login, JWT validation, plan enforcement |
| [Ch. 4 — Backend Service](./ch_4_backend_service.md) | Django apps, API endpoints, key models, Lambda deployment, production settings |
| [Ch. 5 — The Evaluation Pipeline](./ch_5_evaluation_pipeline.md) | The full async evaluation story end-to-end: dispatch → SQS → worker → rule engine → Bedrock AI → callback |
| [Ch. 6 — Infrastructure](./ch_6_infrastructure.md) | Terraform stacks, IAM, networking, secrets, the cost on/off switch |
| [Ch. 7 — CI/CD](./ch_7_cicd.md) | GitHub Actions workflows, OIDC, deployment order, rollback |
| [Ch. 8 — Local Development](./ch_8_local_development.md) | Docker Compose setup, environment files, running services natively, testing |
| [Ch. 9 — Reference](./ch_9_reference.md) | Cram sheet: every endpoint, env var, secret, and resource name in one place |

---

## Architecture Diagram

![Structra System Architecture](./assets/architecture.png)

Mermaid source: [assets/architecture.mmd](./assets/architecture.mmd). Full explanation in [Chapter 2](./ch_2_architecture.md).
