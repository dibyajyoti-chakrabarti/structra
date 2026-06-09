import json
import logging
import subprocess
from pathlib import Path

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from django.conf import settings
from django.db import close_old_connections
from django.utils import timezone

from audit.services import record_system_event
from canvases.models import Canvas
from workspaces.models import EvaluationLog, EvaluationRun
from workspaces.services.insight_token_service import refund_insight_token

logger = logging.getLogger(__name__)

RUNNER_PATH = Path(__file__).resolve().parent / 'evaluation' / 'runner.mjs'
TIER_MAP = {
    'CORE': 'core',
    'INDIVIDUAL': 'individual',
    'TEAM': 'team',
    'ENTERPRISE': 'enterprise',
}


def resolve_workspace_tier(workspace):
    raw_plan = (getattr(workspace.owner, 'current_plan', 'CORE') or 'CORE').upper()
    return TIER_MAP.get(raw_plan, 'core')


def _run_rule_engine(canvas_state, workspace_tier):
    payload = {
        'canvasState': canvas_state,
        'workspaceTier': workspace_tier,
    }
    try:
        process = subprocess.run(
            ['/usr/bin/node', str(RUNNER_PATH)],
            input=json.dumps(payload),
            capture_output=True,
            text=True,
            check=True,
            timeout=25,
        )
    except FileNotFoundError as exc:
        raise RuntimeError('Rule engine runtime is unavailable (`node` not found).') from exc
    except OSError as exc:
        raise RuntimeError(f'Rule engine could not be started: {exc}.') from exc
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError('Rule engine timed out.') from exc
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(exc.stderr or 'Rule engine execution failed.') from exc

    try:
        return json.loads(process.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError('Invalid rule engine response.') from exc


def evaluate_canvas_state(canvas_state, workspace_tier):
    engine_payload = _run_rule_engine(canvas_state, workspace_tier)
    results = engine_payload.get('results', [])
    summary = engine_payload.get('summary', {})
    score = int(engine_payload.get('score', summary.get('score', 0) or 0))
    prompt = engine_payload.get('prompt', '')
    return {
        'results': results,
        'summary': summary,
        'score': score,
        'prompt': prompt,
    }


def _get_bedrock_client(region=None):
    region = region or settings.AWS_REGION
    if getattr(settings, 'AWS_PROFILE', ''):
        session = boto3.Session(profile_name=settings.AWS_PROFILE)
        return session.client('bedrock-runtime', region_name=region)
    return boto3.client('bedrock-runtime', region_name=region)


def _call_bedrock(prompt, model_id, timeout_seconds=60):
    try:
        client = _get_bedrock_client()
        response = client.converse(
            modelId=model_id,
            messages=[{'role': 'user', 'content': [{'text': prompt}]}],
            inferenceConfig={'maxTokens': 4096, 'temperature': 0.2},
        )
        text = response['output']['message']['content'][0]['text']
        if isinstance(text, str) and text.strip():
            return text.strip(), False
        logger.warning('bedrock response missing text model=%s', model_id)
        return None, True
    except (ClientError, BotoCoreError) as exc:
        logger.error('bedrock call failed model=%s error=%s', model_id, exc)
        return None, True
    except Exception as exc:
        logger.error('bedrock unexpected error model=%s error=%s', model_id, exc)
        return None, True


def call_bedrock_for_prompt(prompt):
    model_id = settings.BEDROCK_MODEL_ID
    timeout = settings.BEDROCK_TIMEOUT_SECONDS
    logger.info('bedrock suggestions call model=%s', model_id)
    return _call_bedrock(prompt, model_id, timeout)


# ─── Semantic enrichment ─────────────────────────────────────────────────────

_SEMANTIC_ATTRIBUTES = {
    'eviction-policy': ['lru', 'lfu', 'ttl', 'fifo', 'write-through', 'write-back', 'eviction'],
    'auth-mechanism': ['jwt', 'oauth2', 'api-key', 'mtls', 'saml', 'oidc', 'bearer', 'basic-auth'],
    'consistency-model': ['strong-consistency', 'eventual-consistency', 'read-your-writes', 'causal-consistency', 'linearizable', 'serializability', 'acid', 'base'],
    'scaling-strategy': ['horizontal', 'auto-scaling', 'stateless', 'kubernetes', 'replicas'],
    'connection-pooling': ['connection-pool', 'pgbouncer', 'hikari', 'pool-size'],
    'idempotency': ['idempotent', 'idempotency-key', 'dedupe', 'exactly-once'],
    'failure-handling': ['retry', 'circuit-breaker', 'fallback', 'graceful-degradation', 'timeout', 'dead-letter'],
    'encryption': ['tls', 'https', 'aes-256', 'at-rest', 'in-transit', 'mtls'],
    'secrets-management': ['vault', 'aws-secrets-manager', 'secrets-manager', 'azure-key-vault'],
    'statelessness': ['stateless', 'externalized-session', 'jwt-session'],
    'db-justification': ['relational', 'transactional', 'acid', 'nosql', 'document', 'key-value', 'time-series', 'oltp', 'olap'],
    'http-status-codes': ['2xx', '4xx', '5xx', 'error-response', 'status-code'],
    'replication': ['replica', 'replication', 'read-replica', 'standby', 'primary-replica'],
    'id-strategy': ['uuid', 'snowflake', 'ulid', 'globally-unique'],
    'rate-limiting': ['rate-limit', 'token-bucket', 'sliding-window', 'throttle'],
    'observability': ['health-check', 'liveness', 'readiness', 'heartbeat'],
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


def _semantic_enrich_canvas_state(canvas_state, workspace_tier):
    """Inject canonical keywords into node metadata using Bedrock semantic analysis.

    Runs only for paid tiers. Falls back to unenriched canvas on any error — non-blocking.
    """
    if workspace_tier not in ('individual', 'team', 'enterprise'):
        return canvas_state

    nodes = canvas_state.get('nodes', [])
    if not nodes:
        return canvas_state

    nodes_with_meta = [
        {'id': n.get('id'), 'type': n.get('type'), 'metadata': n.get('metadata', {})}
        for n in nodes
        if n.get('metadata') and any(n['metadata'].get(k) for k in ('purpose', 'techChoice', 'notes', 'responsibilities'))
    ]
    if not nodes_with_meta:
        return canvas_state

    vocabulary_lines = '\n'.join(f'  {k}: inject keywords {v}' for k, v in _SEMANTIC_ATTRIBUTES.items())
    prompt = _SEMANTIC_PROMPT_TEMPLATE.format(
        vocabulary=vocabulary_lines,
        nodes_json=json.dumps(nodes_with_meta, indent=2),
    )

    try:
        model_id = settings.BEDROCK_SEMANTIC_MODEL_ID
        response_text, error = _call_bedrock(prompt, model_id, timeout_seconds=20)
        if error or not response_text:
            logger.warning('semantic enrichment bedrock call failed; proceeding without enrichment')
            return canvas_state

        # Extract JSON from response (model may wrap it in markdown fences)
        raw = response_text.strip()
        if raw.startswith('```'):
            raw = raw.split('```')[1]
            if raw.startswith('json'):
                raw = raw[4:]
        enrichment_map = json.loads(raw.strip())
    except (json.JSONDecodeError, Exception) as exc:
        logger.warning('semantic enrichment parse error=%s; proceeding without enrichment', exc)
        return canvas_state

    # Inject canonical keywords into matching nodes
    enriched_nodes = []
    for node in nodes:
        node_id = node.get('id')
        matched_attrs = enrichment_map.get(node_id, [])
        if matched_attrs:
            keywords = ' '.join(
                kw for attr in matched_attrs for kw in _SEMANTIC_ATTRIBUTES.get(attr, [])
            )
            enriched = dict(node)
            enriched['metadata'] = dict(node.get('metadata') or {})
            existing_tags = enriched['metadata'].get('semanticTags', '')
            enriched['metadata']['semanticTags'] = f'{existing_tags} {keywords}'.strip()
            enriched_nodes.append(enriched)
        else:
            enriched_nodes.append(node)

    logger.info('semantic enrichment completed enriched_nodes=%d/%d', sum(1 for n, e in zip(nodes, enriched_nodes) if n != e), len(nodes))
    return {**canvas_state, 'nodes': enriched_nodes}


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


def _call_bedrock_cloud_analysis(failed_rules, canvas_state, system_metadata):
    """AWS Well-Architected analysis for Enterprise tier. Returns (text, error_flag)."""
    failed_list = '\n'.join(
        f'- [{r.get("id")}] {r.get("reason", "")}' for r in failed_rules
    ) or 'None'

    nodes = canvas_state.get('nodes', [])
    node_summary = ', '.join(
        f'{n.get("type", "unknown")}({n.get("metadata", {}).get("purpose", "") or n.get("id", "")})'
        for n in nodes[:30]
    )

    prompt = _CLOUD_ANALYSIS_PROMPT_TEMPLATE.format(
        system_goal=system_metadata.get('goal', 'Not stated'),
        constraints=system_metadata.get('constraints', 'Not stated'),
        failed_rules=failed_list,
        architecture_summary=node_summary or 'No nodes provided',
    )

    model_id = settings.BEDROCK_MODEL_ID
    logger.info('bedrock cloud analysis call model=%s', model_id)
    return _call_bedrock(prompt, model_id, timeout_seconds=settings.BEDROCK_TIMEOUT_SECONDS)


def mark_run_failed(run_id, exc):
    logger.exception('evaluation failed run_id=%s', run_id)
    EvaluationRun.objects.filter(pk=run_id).update(
        status=EvaluationRun.Status.FAILED,
        error_message=str(exc),
        completed_at=timezone.now(),
    )


def _record_evaluation_event(*, workspace, system, actor, run, action, status='success', message='', metadata=None):
    if workspace is None:
        return
    record_system_event(
        workspace=workspace,
        system=system,
        actor=actor,
        category='evaluation',
        action=action,
        target_name=getattr(system, 'name', '') or str(getattr(run, 'system_id', '')),
        target_id=getattr(run, 'id', ''),
        status=status,
        message=message,
        metadata=metadata or {},
    )


def _refund_run_token_if_needed(run):
    if not run or not getattr(run, 'insight_token_consumed', False):
        return None

    token_state = refund_insight_token(workspace_id=run.workspace_id)
    run.insight_token_consumed = False
    run.insight_tokens_remaining = token_state['insightTokensRemaining']
    return token_state


def run_evaluation_job(run, canvas_state):
    close_old_connections()
    run_instance = None
    workspace = None
    system = None
    try:
        run_instance = EvaluationRun.objects.select_related('workspace__owner', 'user').get(pk=run.pk)
        run_instance.status = EvaluationRun.Status.RUNNING
        run_instance.started_at = timezone.now()
        run_instance.save(update_fields=['status', 'started_at'])

        logger.info(
            'evaluation started run_id=%s workspace_id=%s system_id=%s',
            run_instance.id,
            run_instance.workspace_id,
            run_instance.system_id,
        )

        run = run_instance
        workspace = run.workspace
        system = Canvas.objects.filter(id=run.system_id, workspace=workspace).first()
        if system is None:
            raise RuntimeError('System not found for this evaluation run.')
        _record_evaluation_event(
            workspace=workspace,
            system=system,
            actor=run.user,
            run=run,
            action='Evaluation Started',
            metadata={'run_id': str(run.id), 'workspace_tier': run.workspace_tier},
        )

        workspace_tier = run.workspace_tier or resolve_workspace_tier(workspace)
        enriched_canvas = _semantic_enrich_canvas_state(canvas_state or run.canvas_state or {}, workspace_tier)
        engine_payload = evaluate_canvas_state(enriched_canvas, workspace_tier)
        results = engine_payload['results']
        summary = engine_payload['summary']
        score = engine_payload['score']
        prompt = engine_payload['prompt']

        failed_count = int(summary.get('failed', 0) or 0)
        credits_remaining = int(run.credits_remaining or 0)
        suggestions = None
        ai_error = False
        cloud_analysis = ''

        if failed_count == 0:
            suggestions = 'Your architecture passes all applicable rules. No improvements to suggest.'
        else:
            logger.info('processing evaluation run_id=%s phase=bedrock_suggestions', run.id)
            suggestions, ai_error = call_bedrock_for_prompt(prompt)
            logger.info('bedrock suggestions completed run_id=%s ai_error=%s', run.id, ai_error)

            if workspace_tier == 'enterprise':
                failed_rules = [r for r in results if r.get('passed') is False]
                system_metadata = (enriched_canvas.get('systemMetadata') or {})
                cloud_analysis_text, cloud_error = _call_bedrock_cloud_analysis(
                    failed_rules, enriched_canvas, system_metadata,
                )
                if cloud_error:
                    logger.warning('cloud analysis failed run_id=%s; continuing without it', run.id)
                else:
                    cloud_analysis = cloud_analysis_text or ''

        token_refunded = False
        if ai_error:
            token_state = _refund_run_token_if_needed(run)
            if token_state:
                token_refunded = True

        EvaluationLog.objects.create(
            workspace=workspace,
            system_id=system.id,
            user=run.user,
            workspace_tier=workspace_tier,
            score=score,
            rules_evaluated=int(summary.get('applicable', 0) or 0),
            rules_passed=int(summary.get('passed', 0) or 0),
            credit_consumed=True,
        )

        run.status = EvaluationRun.Status.COMPLETED
        run.score = score
        run.summary = summary
        run.results = results
        run.suggestions = suggestions
        run.cloud_analysis = cloud_analysis
        run.credits_exhausted = False
        run.credits_remaining = credits_remaining
        run.ai_error = ai_error
        run.error_message = 'Insight Token refunded because AI service returned no response.' if token_refunded else ''
        run.completed_at = timezone.now()
        run.save(
            update_fields=[
                'status',
                'score',
                'summary',
                'results',
                'suggestions',
                'cloud_analysis',
                'credits_exhausted',
                'credits_remaining',
                'ai_error',
                'error_message',
                'completed_at',
                'insight_token_consumed',
                'insight_tokens_remaining',
            ]
        )
        completion_status = 'warning' if ai_error else 'success'
        completion_action = 'Evaluation Completed (AI Warning)' if ai_error else 'Evaluation Completed'
        completion_message = (
            'Rule evaluation completed, but AI narrative generation failed.'
            if ai_error else
            'Rule evaluation and report generation completed.'
        )
        _record_evaluation_event(
            workspace=workspace,
            system=system,
            actor=run.user,
            run=run,
            action=completion_action,
            status=completion_status,
            message=completion_message,
            metadata={
                'run_id': str(run.id),
                'score': score,
                'failed_rules': failed_count,
                'ai_error': ai_error,
                'insight_token_refunded': token_refunded,
                'workspace_tier': workspace_tier,
            },
        )

        logger.info(
            'evaluation completed run_id=%s workspace_id=%s system_id=%s',
            run.id,
            run.workspace_id,
            run.system_id,
        )
    except Exception as exc:
        token_state = None
        if run_instance is not None:
            token_state = _refund_run_token_if_needed(run_instance)
        _record_evaluation_event(
            workspace=workspace,
            system=system,
            actor=getattr(run_instance, 'user', None),
            run=run_instance or run,
            action='Evaluation Failed',
            status='error',
            message=str(exc),
            metadata={
                'run_id': str(getattr(run_instance, 'id', getattr(run, 'id', ''))),
                'workspace_tier': getattr(run_instance, 'workspace_tier', None),
                'insight_token_refunded': bool(token_state),
            },
        )
        if run_instance is not None:
            run_instance.error_message = str(exc)
            run_instance.completed_at = timezone.now()
            run_instance.status = EvaluationRun.Status.FAILED
            run_instance.save(
                update_fields=[
                    'status',
                    'error_message',
                    'completed_at',
                    'insight_token_consumed',
                    'insight_tokens_remaining',
                ]
            )
        else:
            mark_run_failed(run.id, exc)
        raise
    finally:
        close_old_connections()