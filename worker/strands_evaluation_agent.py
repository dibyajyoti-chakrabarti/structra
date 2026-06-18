import json
import logging

from django.conf import settings
from strands import Agent, tool
from strands.models import BedrockModel

from evaluation_service import (
    _call_bedrock_cloud_analysis,
    _semantic_enrich_canvas_state,
    call_bedrock_for_prompt,
    evaluate_canvas_state,
)

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a software architecture evaluation agent. You orchestrate a pipeline to evaluate system designs.

Given a canvas (JSON of architecture nodes/edges) and workspace tier, you MUST follow this exact pipeline:
1. Call semantic_enrich with the canvas JSON and tier to inject architectural keywords
2. Call run_rule_engine with the enriched canvas JSON and tier to score the architecture
3. Parse the rule engine result — check the failed_count from summary
4. If failed_count > 0: call generate_suggestions with the prompt from the rule engine result
5. If tier == 'enterprise' AND failed_count > 0: call well_architected_analysis with failed rules, canvas, and metadata
6. Return a single JSON object with these keys:
   score (int), results (list), summary (dict), suggestions (str), cloud_analysis (str), ai_error (bool)

Do not skip any step. Do not call tools out of order."""


@tool
def semantic_enrich(canvas_json: str, tier: str) -> str:
    """Enrich architecture canvas nodes with semantic architectural keywords using Bedrock AI.
    Only runs for paid tiers (individual, team, enterprise). Returns the enriched canvas JSON."""
    canvas = json.loads(canvas_json)
    enriched = _semantic_enrich_canvas_state(canvas, tier)
    return json.dumps(enriched)


@tool
def run_rule_engine(canvas_json: str, tier: str) -> str:
    """Evaluate the architecture canvas against the structural rule engine.
    Returns JSON with: score (int), results (list), summary (dict with passed/failed/applicable counts), prompt (str for AI suggestions)."""
    canvas = json.loads(canvas_json)
    result = evaluate_canvas_state(canvas, tier)
    return json.dumps(result)


@tool
def generate_suggestions(evaluation_prompt: str) -> str:
    """Generate AI-powered improvement suggestions for failed architecture rules using Bedrock.
    Returns narrative improvement text, or empty string if AI call fails."""
    suggestions, error = call_bedrock_for_prompt(evaluation_prompt)
    return suggestions or ""


@tool
def well_architected_analysis(failed_rules_json: str, canvas_json: str, metadata_json: str) -> str:
    """Perform AWS Well-Architected Framework review for Enterprise tier using Bedrock.
    Evaluates across 5 pillars: Operational Excellence, Security, Reliability, Performance, Cost.
    Returns Markdown analysis text, or empty string if AI call fails."""
    failed_rules = json.loads(failed_rules_json)
    canvas = json.loads(canvas_json)
    metadata = json.loads(metadata_json)
    analysis, error = _call_bedrock_cloud_analysis(failed_rules, canvas, metadata)
    return analysis or ""


def create_evaluation_agent() -> Agent:
    strands_model_id = getattr(settings, 'STRANDS_MODEL_ID', 'us.meta.llama3-3-70b-instruct-v1:0')
    strands_region = getattr(settings, 'STRANDS_BEDROCK_REGION', 'us-east-1')
    # Llama (and many open-source models on Bedrock) support tool use only via non-streaming converse.
    model = BedrockModel(
        model_id=strands_model_id,
        region_name=strands_region,
        streaming=False,
    )
    return Agent(
        model=model,
        system_prompt=SYSTEM_PROMPT,
        tools=[semantic_enrich, run_rule_engine, generate_suggestions, well_architected_analysis],
    )
