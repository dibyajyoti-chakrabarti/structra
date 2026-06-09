---
sidebar_position: 3
title: AI Evaluation Report
description: How Structra's AI-generated report works, what it contains, and how Insight Tokens are consumed and refunded.
slug: /evaluation-principles/ai-suggestions
toc_min_heading_level: 2
toc_max_heading_level: 3
---

# AI Evaluation Report

After the deterministic rule engine finishes scoring your architecture, Structra generates an AI-powered evaluation report. This report synthesizes the rule findings into structured, actionable guidance that goes beyond a pass/fail list.

## What the Report Contains

The AI report always follows the same six-section structure.

### Executive Summary

A short assessment of the overall architectural posture. Describes the most critical risks and the general health of the design relative to the stated system goal and constraints.

### Risk Register

A table with one row per identified risk. Columns are:

| Risk ID | Domain | Severity | Evidence | Business Impact | Recommended Fix |

Severity follows a `Critical → High → Medium → Low` scale. Each row maps to at least one failing rule and describes the real-world consequence of leaving it unresolved.

### Findings By Domain

Per-area analysis organized under six headers: **Connectivity**, **Compute**, **Data**, **Security**, **Reliability**, and **Observability**. Each finding includes:

- The specific architectural gap
- Why it matters for your system in particular
- Implementation-level remediation steps
- The measurable outcome after remediation

### Remediation Roadmap

A phased action plan with concrete, implementation-specific sub-actions:

- **Immediate (0–2 weeks)**: correctness gaps, security failures, and anything with a direct availability or data-integrity risk
- **Near-term (2–6 weeks)**: resilience improvements, queue safety, and reliability controls
- **Mid-term (6–12 weeks)**: scalability, operability, and governance hardening

### Verification Checklist

A set of markdown checkboxes with acceptance criteria for each remediation item. Use this list as a code-review or architecture-review gate before marking work complete.

### Overall Assessment

A closing statement on the architecture's readiness and the highest-leverage next actions.

---

## What the AI Report Is Not

The AI report is a synthesis layer. It does not re-score your architecture or override the rule engine. The score shown in your evaluation is always the deterministic rule engine output.

If the rule engine finds zero failures, the report confirms it and no AI analysis is generated. The AI layer only activates when there are failed rules to reason about.

The quality of the report depends directly on the quality of your architecture inputs. Sparse node metadata, undefined goals, and missing constraints reduce the depth and specificity of the findings. See [Getting Started](/getting-started) for guidance on providing high-signal inputs.

---

## Insight Tokens

Each AI report consumes one Insight Token from your workspace's daily allocation.

| Plan | Daily Insight Tokens |
|---|---|
| Core | 3 (shared across all owner workspaces) |
| Individual | 15 (shared across all owner workspaces) |
| Team | 25 × seat count (workspace-level pool) |
| Enterprise | 25 × seat count (workspace-level pool) |

Tokens reset at the start of each day. The token count is shown in the evaluation panel before you confirm the AI step.

### Token Refunds

If the AI service fails to return a response, the consumed token is automatically refunded to your workspace. The rule engine results and score are always preserved regardless of AI availability. The evaluation report will show the rule findings only, with a notice that the AI narrative was unavailable.

---

## How Input Quality Affects Report Depth

The AI report uses the same metadata you provide to the rule engine — node purpose, tech choices, notes, responsibilities, system goals, constraints, and assumptions. The more specific this information is, the more targeted the remediation steps become.

For example:

- A node with `purpose: "handles payments"` and `notes: "uses Stripe, no idempotency key"` produces a specific, actionable finding about idempotency risk.
- A node with no metadata produces a generic finding based only on node type.

Investing five minutes in documenting your architecture's intent before evaluating produces significantly better output than evaluating a bare diagram.
