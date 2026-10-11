"""Pure evaluation compute — no Django, no database.

This module is shared by:
  - the standalone cloud worker (cloud_handler.py), and
  - the local-dev worker (evaluation_service.run_evaluation_job).

It runs the Node.js rule engine and the LLM calls (see llm_client). It returns plain data;
persistence is the caller's responsibility.
"""
import json
import logging
import subprocess
from pathlib import Path

import llm_config as config
from llm_client import call_llm, parse_json_object

logger = logging.getLogger(__name__)

RUNNER_PATH = Path(__file__).resolve().parent / "evaluation" / "runner.mjs"


def _run_rule_engine(canvas_state, workspace_tier):
    payload = {
        "canvasState": canvas_state,
        "workspaceTier": workspace_tier,
    }
    try:
        process = subprocess.run(
            ["/usr/bin/node", str(RUNNER_PATH)],
            input=json.dumps(payload),
            capture_output=True,
            text=True,
            check=True,
            timeout=25,
        )
    except FileNotFoundError as exc:
        raise RuntimeError("Rule engine runtime is unavailable (`node` not found).") from exc
    except OSError as exc:
        raise RuntimeError(f"Rule engine could not be started: {exc}.") from exc
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError("Rule engine timed out.") from exc
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(exc.stderr or "Rule engine execution failed.") from exc

    try:
        return json.loads(process.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError("Invalid rule engine response.") from exc


def evaluate_canvas_state(canvas_state, workspace_tier):
    engine_payload = _run_rule_engine(canvas_state, workspace_tier)
    results = engine_payload.get("results", [])
    summary = engine_payload.get("summary", {})
    score = int(engine_payload.get("score", summary.get("score", 0) or 0))
    prompt = engine_payload.get("prompt", "")
    return {
        "results": results,
        "summary": summary,
        "score": score,
        "prompt": prompt,
    }


def call_llm_for_prompt(prompt):
    """Improvement suggestions for the failed rules. Returns (text, error_flag)."""
    logger.info("llm suggestions call")
    return call_llm(prompt)


# ─── Semantic enrichment ─────────────────────────────────────────────────────

_SEMANTIC_ATTRIBUTES = {
    "eviction-policy": ["lru", "lfu", "ttl", "fifo", "write-through", "write-back", "eviction"],
    "auth-mechanism": ["jwt", "oauth2", "api-key", "mtls", "saml", "oidc", "bearer", "basic-auth"],
    "consistency-model": ["strong-consistency", "eventual-consistency", "read-your-writes", "causal-consistency", "linearizable", "serializability", "acid", "base"],
    "scaling-strategy": ["horizontal", "auto-scaling", "stateless", "kubernetes", "replicas"],
    "connection-pooling": ["connection-pool", "pgbouncer", "hikari", "pool-size"],
    "idempotency": ["idempotent", "idempotency-key", "dedupe", "exactly-once"],
    "failure-handling": ["retry", "circuit-breaker", "fallback", "graceful-degradation", "timeout", "dead-letter"],
    "encryption": ["tls", "https", "aes-256", "at-rest", "in-transit", "mtls"],
    "secrets-management": ["vault", "aws-secrets-manager", "secrets-manager", "azure-key-vault"],
    "statelessness": ["stateless", "externalized-session", "jwt-session"],
    "db-justification": ["relational", "transactional", "acid", "nosql", "document", "key-value", "time-series", "oltp", "olap"],
    "http-status-codes": ["2xx", "4xx", "5xx", "error-response", "status-code"],
    "replication": ["replica", "replication", "read-replica", "standby", "primary-replica"],
    "id-strategy": ["uuid", "snowflake", "ulid", "globally-unique"],
    "rate-limiting": ["rate-limit", "token-bucket", "sliding-window", "throttle"],
    "observability": ["health-check", "liveness", "readiness", "heartbeat"],
}

_SEMANTIC_PROMPT_TEMPLATE = """You are analyzing architecture diagram node metadata for a software system.

For each node listed below, determine which architectural attributes are documented in its metadata.
Return ONLY a JSON object mapping each nodeId to a list of attribute keys from the controlled vocabulary where evidence exists in the metadata.
If a node's metadata clearly describes an attribute (even using synonyms or verbose phrasing), include that attribute key.
Only include attributes with actual evidence — do not infer from node type alone.

Controlled vocabulary of attributes to detect:
{vocabulary}

Nodes to analyze:
{nodes_json}

Return format (JSON only, no explanation):
{{"nodeId1": ["attr-key", ...], "nodeId2": [], ...}}"""


def _known_attributes(value):
    """Keep only attribute keys from the controlled vocabulary, whatever shape the model replied with."""
    if isinstance(value, str):
        value = [value]
    if not isinstance(value, list):
        return []
    return [attr for attr in value if isinstance(attr, str) and attr in _SEMANTIC_ATTRIBUTES]


def _semantic_enrich_canvas_state(canvas_state, workspace_tier):
    """Inject canonical keywords into node metadata using LLM semantic analysis.

    Runs only for paid tiers. Falls back to unenriched canvas on any error — non-blocking.
    """
    if workspace_tier not in ("individual", "team", "enterprise"):
        return canvas_state

    nodes = canvas_state.get("nodes", [])
    if not nodes:
        return canvas_state

    nodes_with_meta = [
        {"id": n.get("id"), "type": n.get("type"), "metadata": n.get("metadata", {})}
        for n in nodes
        if n.get("metadata") and any(n["metadata"].get(k) for k in ("purpose", "techChoice", "notes", "responsibilities"))
    ]
    if not nodes_with_meta:
        return canvas_state

    vocabulary_lines = "\n".join(f"  {k}: inject keywords {v}" for k, v in _SEMANTIC_ATTRIBUTES.items())
    prompt = _SEMANTIC_PROMPT_TEMPLATE.format(
        vocabulary=vocabulary_lines,
        nodes_json=json.dumps(nodes_with_meta, indent=2),
    )

    response_text, error = call_llm(prompt, semantic=True, timeout_seconds=20)
    if error or not response_text:
        logger.warning("semantic enrichment llm call failed; proceeding without enrichment")
        return canvas_state

    parsed = parse_json_object(response_text)
    if parsed is None:
        logger.warning("semantic enrichment reply was not valid JSON; proceeding without enrichment")
        return canvas_state
    enrichment_map = {str(key): value for key, value in parsed.items()}

    enriched_nodes = []
    for node in nodes:
        matched_attrs = _known_attributes(enrichment_map.get(str(node.get("id"))))
        if matched_attrs:
            keywords = " ".join(
                kw for attr in matched_attrs for kw in _SEMANTIC_ATTRIBUTES.get(attr, [])
            )
            enriched = dict(node)
            enriched["metadata"] = dict(node.get("metadata") or {})
            existing_tags = enriched["metadata"].get("semanticTags", "")
            enriched["metadata"]["semanticTags"] = f"{existing_tags} {keywords}".strip()
            enriched_nodes.append(enriched)
        else:
            enriched_nodes.append(node)

    logger.info("semantic enrichment completed enriched_nodes=%d/%d", sum(1 for n, e in zip(nodes, enriched_nodes) if n != e), len(nodes))
    return {**canvas_state, "nodes": enriched_nodes}


# ─── Enterprise cloud analysis ────────────────────────────────────────────────

_CLOUD_ANALYSIS_PROMPT_TEMPLATE = """You are a cloud architecture reviewer evaluating a software system design against the AWS Well-Architected Framework.

SYSTEM GOAL:
{system_goal}

CONSTRAINTS:
{constraints}

FAILED STRUCTURAL RULES (already identified — do not repeat these findings, build on them):
{failed_rules}

ARCHITECTURE SUMMARY:
{architecture_summary}

Evaluate this architecture against the 5 AWS Well-Architected pillars. For each pillar, identify cloud-specific gaps not covered by the structural rules above, and provide concrete remediation steps.

OUTPUT FORMAT (Markdown only):

## Cloud Architecture Analysis

### Operational Excellence
[2-4 bullet findings with specific remediation. Focus on deployment automation, runbook coverage, and change management.]

### Security
[2-4 bullet findings with specific remediation. Focus on IAM least-privilege, network segmentation, data classification.]

### Reliability
[2-4 bullet findings with specific remediation. Focus on multi-AZ/region strategy, backup/restore RTO/RPO, quota planning.]

### Performance Efficiency
[2-4 bullet findings with specific remediation. Focus on right-sizing, auto-scaling triggers, caching strategy.]

### Cost Optimization
[2-4 bullet findings with specific remediation. Focus on reserved/spot instances, right-sizing, data transfer costs.]

Keep language precise and actionable. Each finding must reference a specific component or pattern from the architecture."""


def call_llm_cloud_analysis(failed_rules, canvas_state, system_metadata):
    """AWS Well-Architected analysis for Enterprise tier. Returns (text, error_flag)."""
    failed_list = "\n".join(
        f'- [{r.get("id")}] {r.get("reason", "")}' for r in failed_rules
    ) or "None"

    nodes = canvas_state.get("nodes", [])
    node_summary = ", ".join(
        f'{n.get("type", "unknown")}({n.get("metadata", {}).get("purpose", "") or n.get("id", "")})'
        for n in nodes[:30]
    )

    prompt = _CLOUD_ANALYSIS_PROMPT_TEMPLATE.format(
        system_goal=system_metadata.get("goal", "Not stated"),
        constraints=system_metadata.get("constraints", "Not stated"),
        failed_rules=failed_list,
        architecture_summary=node_summary or "No nodes provided",
    )

    logger.info("llm cloud analysis call")
    return call_llm(prompt, timeout_seconds=config.LLM_TIMEOUT_SECONDS)
