---
sidebar_position: 4
title: Enterprise Cloud Analysis
description: AWS Well-Architected alignment review available on the Enterprise plan.
slug: /evaluation-principles/cloud-analysis
toc_min_heading_level: 2
toc_max_heading_level: 3
---

# Enterprise Cloud Analysis

Enterprise workspaces receive an additional AI-powered analysis after the standard evaluation. This analysis evaluates your architecture against the five pillars of the **AWS Well-Architected Framework**, surfacing cloud-specific gaps that the deterministic rule engine does not cover.

## When It Runs

The Cloud Analysis runs automatically for every evaluation on an Enterprise workspace when one or more rules fail. It runs alongside the standard AI report and appears as a separate collapsible section in the evaluation results.

If all rules pass, no Cloud Analysis is generated — a passing architecture has no gaps for it to reason about.

---

## What It Covers

### Operational Excellence

Gaps in deployment automation, runbook coverage, and operational change management. Common findings include missing deployment pipeline definitions, absence of documented rollback procedures, and undefined on-call or escalation paths.

### Security

Cloud-specific security gaps beyond what the structural rules check. Findings focus on IAM least-privilege posture, network segmentation (VPC design, security groups), data classification, and audit trail completeness. This pillar extends the Enterprise rules `P-25` through `P-28` with cloud-native remediation steps.

### Reliability

Multi-region and multi-AZ deployment strategy, backup and restore coverage with explicit RTO/RPO targets, quota planning, and dependency health monitoring. The analysis identifies architectures that state high-availability targets without the cloud infrastructure to support them.

### Performance Efficiency

Right-sizing decisions, auto-scaling trigger design, caching strategy effectiveness, and use of managed services versus self-managed infrastructure. Findings are specific to the components identified in your architecture.

### Cost Optimization

Reserved capacity opportunities, spot instance suitability, right-sizing signals, data transfer cost exposure, and storage tier alignment. The analysis flags patterns that indicate structural over-provisioning or inefficient data movement.

---

## How to Read the Results

The Cloud Analysis is organized under the five pillar headers. Each finding includes:

- The specific component or pattern from your architecture
- The cloud-specific risk or inefficiency
- A concrete remediation step with expected outcome

The findings are additive to the standard AI report — they do not repeat what the rule engine or the standard report already covered.

Use the Cloud Analysis output in combination with the standard Remediation Roadmap. Typically, the standard roadmap covers structural correctness and reliability, while the Cloud Analysis covers deployment, cost, and operational maturity gaps.

---

## Availability

Cloud Analysis is available on the **Enterprise plan** only. It uses the same Insight Token as the standard AI report — one token covers both the standard report and the Cloud Analysis in a single evaluation.
