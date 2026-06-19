"""Stateless cloud worker entrypoint (SQS-triggered).

Owns no database. Receives a self-contained job over SQS, runs the evaluation
compute (rule engine + Bedrock), and POSTs the result to the backend's internal
callback endpoint, which persists it. No Django, no DB access.

Required env:
  BACKEND_CALLBACK_BASE_URL   base URL of the backend API (e.g. the API Gateway URL)
  INTERNAL_API_TOKEN          shared secret for the callback's X-Internal-Token header
  BEDROCK_* / AWS_PROFILE     consumed by evaluation_compute via config.py
"""
import json
import logging
import os

import requests

from evaluation_compute import (
    _call_bedrock_cloud_analysis,
    _semantic_enrich_canvas_state,
    call_bedrock_for_prompt,
    evaluate_canvas_state,
)

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("worker.cloud_handler")

CALLBACK_BASE_URL = os.environ["BACKEND_CALLBACK_BASE_URL"].rstrip("/")
INTERNAL_API_TOKEN = os.environ["INTERNAL_API_TOKEN"]
CALLBACK_TIMEOUT_SECONDS = float(os.getenv("CALLBACK_TIMEOUT_SECONDS", "15"))


def handler(event, context):
    for record in event.get("Records", []):
        _process_record(record)


def _process_record(record):
    try:
        body = json.loads(record["body"])
    except (json.JSONDecodeError, KeyError) as exc:
        logger.error("failed to parse SQS body: %s", exc)
        return

    run_id = body.get("runId")
    if not run_id:
        logger.warning("SQS message missing runId; acknowledging")
        return

    canvas_state = body.get("canvasState") or {}
    workspace_tier = body.get("workspaceTier") or "core"
    logger.info("evaluation started run_id=%s tier=%s", run_id, workspace_tier)

    try:
        result = _evaluate(canvas_state, workspace_tier)
    except Exception as exc:  # noqa: BLE001
        logger.exception("evaluation compute failed run_id=%s", run_id)
        _post_result(run_id, {"status": "failed", "error_message": str(exc)})
        return

    _post_result(run_id, result)
    logger.info("evaluation completed run_id=%s score=%s ai_error=%s",
                run_id, result.get("score"), result.get("ai_error"))


def _evaluate(canvas_state, workspace_tier):
    enriched = _semantic_enrich_canvas_state(canvas_state, workspace_tier)
    engine = evaluate_canvas_state(enriched, workspace_tier)
    results = engine["results"]
    summary = engine["summary"]
    score = engine["score"]
    prompt = engine["prompt"]

    failed_count = int(summary.get("failed", 0) or 0)
    ai_error = False
    cloud_analysis = ""

    if failed_count == 0:
        suggestions = "Your architecture passes all applicable rules. No improvements to suggest."
    else:
        suggestions, ai_error = call_bedrock_for_prompt(prompt)
        suggestions = suggestions or ""
        if workspace_tier == "enterprise":
            failed_rules = [r for r in results if r.get("passed") is False]
            system_metadata = enriched.get("systemMetadata") or {}
            text, cloud_error = _call_bedrock_cloud_analysis(failed_rules, enriched, system_metadata)
            if not cloud_error:
                cloud_analysis = text or ""

    return {
        "status": "completed",
        "score": score,
        "summary": summary,
        "results": results,
        "suggestions": suggestions,
        "cloud_analysis": cloud_analysis,
        "ai_error": bool(ai_error),
    }


def _post_result(run_id, payload):
    url = f"{CALLBACK_BASE_URL}/api/internal/evaluations/{run_id}/result/"
    resp = requests.post(
        url,
        json=payload,
        headers={"X-Internal-Token": INTERNAL_API_TOKEN},
        timeout=CALLBACK_TIMEOUT_SECONDS,
    )
    # Raise on 4xx/5xx so SQS retries (and eventually DLQs) a failed delivery.
    resp.raise_for_status()
    logger.info("result posted run_id=%s status=%s http=%s", run_id, payload.get("status"), resp.status_code)
