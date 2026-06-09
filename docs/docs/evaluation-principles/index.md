---
sidebar_position: 4
title: Evaluation Principles
description: Overview of Structra's rule framework, evidence expectations, and workspace-plan enforcement model.
slug: /evaluation-principles
toc_min_heading_level: 2
toc_max_heading_level: 2
---

# Evaluation Principles

Structra's evaluation framework is organized into principle sets that progressively increase architectural rigor. The framework is designed to move from baseline correctness toward scale, resilience, security, and operational completeness.

## Principle Documents

- [Structra Basics](/evaluation-principles/structra-basics): the primary 50-rule framework used by the evaluation engine
- [Production System Design Principles](/evaluation-principles/production-system-principles): advanced architecture review principles for high-stakes production systems
- [AI Evaluation Report](/evaluation-principles/ai-suggestions): the AI-generated analysis that synthesizes rule results into an actionable report
- [Enterprise Cloud Analysis](/evaluation-principles/cloud-analysis): AWS Well-Architected alignment review available on the Enterprise plan

## How the Framework Is Organized

Structra uses rule taxonomy tiers to separate foundational concerns from more advanced design expectations.

- **Basic (`F-01` to `F-20`)**: production hygiene, core correctness, and baseline architecture quality
- **Pro (`P-01` to `P-20`)**: distributed-systems maturity, reliability controls, and scale-readiness concerns
- **Enterprise (`P-21` to `P-30`)**: stricter security, governance, data architecture, and observability expectations

These tier labels describe evaluation depth. They are not pricing-plan names.

## How Principles Are Applied

Each rule is mapped to a specific architecture concern so findings stay concrete and actionable.

- Availability and failure isolation
- Consistency and correctness boundaries
- Scalability and bottleneck prevention
- Security and access-control clarity
- Observability and operational readiness

The intent is not to produce abstract scorekeeping. The intent is to surface design weaknesses that can be remediated before they become production incidents or expensive migrations.

## Evidence Structra Expects

Evaluations are strongest when the underlying system description includes both architecture shape and operating assumptions.

Prepare evidence such as:

- Architecture diagrams or component inventories
- Datastore and message-flow definitions
- Traffic, latency, and growth assumptions
- Failure-mode and recovery expectations
- Security and observability controls

If these inputs are incomplete, some findings may be missing, ambiguous, or less useful than they should be.

## AI Evaluation Layer

After the deterministic rule engine scores your architecture, Structra generates an AI-powered report that synthesizes the rule results into an actionable analysis. The AI layer does not re-evaluate — it uses the rule findings as evidence and produces structured output covering:

- **Executive Summary**: the overall architectural posture and highest-priority risks
- **Risk Register**: a table of risks with severity, evidence, business impact, and recommended fix
- **Findings By Domain**: per-area analysis across connectivity, compute, data, security, reliability, and observability
- **Remediation Roadmap**: phased action plan with implementation-specific steps (0–2 weeks, 2–6 weeks, 6–12 weeks)
- **Verification Checklist**: acceptance criteria for each remediation item

The AI report is generated once per evaluation and requires an Insight Token. Tokens reset daily. See [AI Evaluation Report](/evaluation-principles/ai-suggestions) for full details.

Enterprise workspaces additionally receive a [Cloud Architecture Analysis](/evaluation-principles/cloud-analysis) aligned to the AWS Well-Architected Framework.

## Workspace Plan Enforcement

Everyone can read the full documentation set. Enforcement happens in the evaluation engine based on workspace plan.

- `Core`: evaluates `Basic` only (`F-01` to `F-20`)
- `Individual`: evaluates all standard rules
- `Team`: evaluates all standard rules
- `Enterprise`: evaluates all standard rules plus AWS Well-Architected cloud analysis

## Recommended Review Flow

Use the framework in this order:

1. Resolve clear `Basic` failures first.
2. Use `Pro` rules to harden scale, retries, queue safety, and dependency behavior.
3. Use `Enterprise` rules to tighten governance, security, and observability completeness.

This order keeps teams focused on the highest-leverage architectural corrections before moving into more advanced controls.
