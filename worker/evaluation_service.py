"""Local-dev evaluation path (Django + DB).

The pure compute (rule engine + Bedrock) now lives in `evaluation_compute` and is
shared with the standalone cloud worker. This module keeps the DB persistence and
side-effects used by the local docker-compose worker (`evaluation_worker.py`).
The cloud worker does NOT import this module — it talks to the backend over HTTP.
"""
import logging

from django.db import close_old_connections
from django.utils import timezone

from audit.services import record_system_event
from canvases.models import Canvas
from workspaces.models import EvaluationLog, EvaluationRun
from workspaces.services.insight_token_service import refund_insight_token

from evaluation_compute import (
    _call_bedrock_cloud_analysis,
    _semantic_enrich_canvas_state,
    call_bedrock_for_prompt,
    evaluate_canvas_state,
)

logger = logging.getLogger(__name__)

TIER_MAP = {
    'CORE': 'core',
    'INDIVIDUAL': 'individual',
    'TEAM': 'team',
    'ENTERPRISE': 'enterprise',
}


def resolve_workspace_tier(workspace):
    raw_plan = (getattr(workspace.owner, 'current_plan', 'CORE') or 'CORE').upper()
    return TIER_MAP.get(raw_plan, 'core')


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
