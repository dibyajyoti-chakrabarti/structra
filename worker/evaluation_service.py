import json
import logging
import os
import subprocess
from pathlib import Path
from urllib import error as urllib_error
from urllib import request as urllib_request

from django.db import close_old_connections
from django.utils import timezone

from audit.services import record_system_event
from canvases.models import Canvas
from workspaces.models import EvaluationLog, EvaluationRun
from workspaces.services.insight_token_service import refund_insight_token

logger = logging.getLogger(__name__)

RUNNER_PATH = Path(__file__).resolve().parent / 'evaluation' / 'runner.mjs'
DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'
DEFAULT_GEMINI_TIMEOUT_SECONDS = 60
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


def _call_gemini(prompt, api_keys, model_name):
    if not api_keys:
        logger.error('No Gemini API keys provided.')
        return None, True

    model = (model_name or DEFAULT_GEMINI_MODEL).strip()
    url_base = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key='

    payload = json.dumps(
        {
            'contents': [{'parts': [{'text': prompt}]}],
            'generationConfig': {
                'temperature': 0.2,
                'topP': 0.9,
                'responseMimeType': 'text/plain',
            },
        }
    ).encode('utf-8')

    try:
        timeout_seconds = float(os.getenv('GEMINI_TIMEOUT_SECONDS', DEFAULT_GEMINI_TIMEOUT_SECONDS))
    except (TypeError, ValueError):
        timeout_seconds = DEFAULT_GEMINI_TIMEOUT_SECONDS

    for index, api_key in enumerate(api_keys):
        url = url_base + api_key
        request = urllib_request.Request(
            url,
            data=payload,
            headers={'Content-Type': 'application/json'},
            method='POST',
        )

        try:
            with urllib_request.urlopen(request, timeout=timeout_seconds) as response:
                data = json.loads(response.read().decode('utf-8'))

                candidates = data.get('candidates') or []
                for candidate in candidates:
                    parts = (candidate.get('content') or {}).get('parts') or []
                    for part in parts:
                        text = part.get('text')
                        if isinstance(text, str) and text.strip():
                            return text.strip(), False

                logger.warning(
                    'gemini response missing text candidates keys=%s',
                    sorted(data.keys()) if isinstance(data, dict) else 'non-dict',
                )
                return None, True

        except urllib_error.HTTPError as exc:
            body = ''
            try:
                body = exc.read().decode('utf-8')
            except Exception:
                pass

            # Rotate on 400 (API key invalid/expired), 429 (quota), 401 (unauthorized), 403 (forbidden)
            if exc.code in (400, 429, 401, 403):
                logger.warning(
                    'gemini key index=%d failed with status=%s. Rotating to next key. body=%s',
                    index, exc.code, body[:200],
                )
                continue

            # Fail immediately on server errors
            logger.error('gemini http error status=%s model=%s body=%s', exc.code, model, body[:500])
            return None, True

        except urllib_error.URLError as exc:
            logger.error('gemini url error model=%s reason=%s', model, exc.reason)
            return None, True
        except TimeoutError:
            logger.error('gemini request timed out model=%s timeout=%s', model, timeout_seconds)
            return None, True
        except json.JSONDecodeError as exc:
            logger.error('gemini response json parse error model=%s: %s', model, exc)
            return None, True

    logger.error('All Gemini API keys exhausted or invalid.')
    return None, True


def call_gemini_for_prompt(prompt):
    # Support both GEMINI_API_KEYS and GEMINI_API_KEY (comma-separated values in either)
    keys_env = os.getenv('GEMINI_API_KEYS') or os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY') or ''
    api_keys = [k.strip() for k in keys_env.split(',') if k.strip()]

    logger.info('gemini loaded %d api key(s)', len(api_keys))
    gemini_model = os.getenv('GEMINI_MODEL', DEFAULT_GEMINI_MODEL)
    return _call_gemini(prompt, api_keys, gemini_model)


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
            logger.info('processing evaluation run_id=%s phase=gemini', run.id)
            suggestions, gemini_error = call_gemini_for_prompt(prompt)
            logger.info('gemini completed run_id=%s gemini_error=%s', run.id, gemini_error)

        token_refunded = False
        if gemini_error:
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
        run.credits_exhausted = False
        run.credits_remaining = credits_remaining
        run.gemini_error = gemini_error
        run.error_message = 'Insight Token refunded because Gemini returned no response.' if token_refunded else ''
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
                'insight_token_consumed',
                'insight_tokens_remaining',
            ]
        )
        completion_status = 'warning' if gemini_error else 'success'
        completion_action = 'Evaluation Completed (AI Warning)' if gemini_error else 'Evaluation Completed'
        completion_message = (
            'Rule evaluation completed, but AI narrative generation failed.'
            if gemini_error else
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
                'gemini_error': gemini_error,
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