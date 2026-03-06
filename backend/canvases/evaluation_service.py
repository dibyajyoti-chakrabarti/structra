import json
import logging
import os
import subprocess
from pathlib import Path
from urllib import error as urllib_error
from urllib import request as urllib_request

from django.db import close_old_connections
from django.utils import timezone

from canvases.models import Canvas
from workspaces.models import EvaluationLog, EvaluationRun

logger = logging.getLogger(__name__)

RUNNER_PATH = Path(__file__).resolve().parent / 'evaluation' / 'runner.mjs'
DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'
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
            ['node', str(RUNNER_PATH)],
            input=json.dumps(payload),
            capture_output=True,
            text=True,
            check=True,
            timeout=25,
        )
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


def _call_gemini(prompt, api_key, model_name):
    if not api_key:
        return None, True

    model = (model_name or DEFAULT_GEMINI_MODEL).strip()
    url = (
        'https://generativelanguage.googleapis.com/v1beta/models/'
        f'{model}:generateContent?key={api_key}'
    )
    payload = json.dumps({'contents': [{'parts': [{'text': prompt}]}]}).encode('utf-8')

    request = urllib_request.Request(
        url,
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )

    try:
        with urllib_request.urlopen(request, timeout=25) as response:
            data = json.loads(response.read().decode('utf-8'))
    except (urllib_error.URLError, urllib_error.HTTPError, TimeoutError, json.JSONDecodeError):
        return None, True

    suggestions = (
        data.get('candidates', [{}])[0]
        .get('content', {})
        .get('parts', [{}])[0]
        .get('text')
    )
    return suggestions, False


def call_gemini_for_prompt(prompt):
    api_key = os.getenv('GEMINI_API_KEY', '')
    gemini_model = os.getenv('GEMINI_MODEL', DEFAULT_GEMINI_MODEL)
    return _call_gemini(prompt, api_key, gemini_model)


def mark_run_failed(run_id, exc):
    logger.exception('evaluation failed run_id=%s', run_id)
    EvaluationRun.objects.filter(pk=run_id).update(
        status=EvaluationRun.Status.FAILED,
        error_message=str(exc),
        completed_at=timezone.now(),
    )


def run_evaluation_job(run, canvas_state):
    close_old_connections()
    run_instance = None
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

        workspace_tier = run.workspace_tier or resolve_workspace_tier(workspace)
        engine_payload = evaluate_canvas_state(canvas_state or run.canvas_state or {}, workspace_tier)
        results = engine_payload['results']
        summary = engine_payload['summary']
        score = engine_payload['score']
        prompt = engine_payload['prompt']

        failed_count = int(summary.get('failed', 0) or 0)
        credits_remaining = int(run.credits_remaining or 0)
        suggestions = None
        gemini_error = False

        if failed_count == 0:
            suggestions = 'Your architecture passes all applicable rules. No improvements to suggest.'
        else:
            suggestions, gemini_error = call_gemini_for_prompt(prompt)

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
        run.credits_exhausted = False
        run.credits_remaining = credits_remaining
        run.gemini_error = gemini_error
        run.error_message = ''
        run.completed_at = timezone.now()
        run.save(
            update_fields=[
                'status',
                'score',
                'summary',
                'results',
                'suggestions',
                'credits_exhausted',
                'credits_remaining',
                'gemini_error',
                'error_message',
                'completed_at',
            ]
        )

        logger.info(
            'evaluation completed run_id=%s workspace_id=%s system_id=%s',
            run.id,
            run.workspace_id,
            run.system_id,
        )
    except Exception as exc:
        if run_instance is not None:
            mark_run_failed(run_instance.id, exc)
        raise
    finally:
        close_old_connections()
