import json
import os
import subprocess
import threading
from datetime import timedelta
from pathlib import Path
from urllib import error as urllib_error
from urllib import request as urllib_request

from django.db import close_old_connections, transaction
from django.db.models import F
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, serializers, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from canvases.models import Canvas
from permissions.checks import user_has_system_read_access
from permissions.models import WorkspaceMember
from workspaces.models import EvaluationLog, EvaluationRun, Workspace

RUNNER_PATH = Path(__file__).resolve().parent / 'evaluation' / 'runner.mjs'
DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'
TIER_MAP = {
    'CORE': 'core',
    'INDIVIDUAL': 'individual',
    'TEAM': 'team',
    'ENTERPRISE': 'enterprise',
}


class EvaluateRequestSerializer(serializers.Serializer):
    workspaceId = serializers.CharField(max_length=8)
    systemId = serializers.CharField(max_length=8)
    canvasState = serializers.JSONField()

    def validate_canvasState(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('canvasState must be an object.')
        nodes = value.get('nodes', [])
        edges = value.get('edges', [])
        if not isinstance(nodes, list) or not isinstance(edges, list):
            raise serializers.ValidationError('canvasState.nodes and canvasState.edges must be arrays.')
        return value


def _next_month_reset(now):
    month = 1 if now.month == 12 else now.month + 1
    year = now.year + 1 if now.month == 12 else now.year
    return now.replace(year=year, month=month, day=1, hour=0, minute=0, second=0, microsecond=0)


def _resolve_workspace_tier(workspace):
    raw_plan = (getattr(workspace.owner, 'current_plan', 'CORE') or 'CORE').upper()
    return TIER_MAP.get(raw_plan, 'core')


def _team_seat_count(workspace):
    return max(workspace.members.count(), 1)


def _monthly_credits_for_tier(workspace, workspace_tier):
    if workspace_tier == 'core':
        return 5
    if workspace_tier == 'individual':
        return 50
    if workspace_tier == 'team':
        return _team_seat_count(workspace) * 80
    return max(int(workspace.ai_credits_monthly or 100), 1)


def _ensure_credit_state(workspace, workspace_tier):
    now = timezone.now()
    monthly = _monthly_credits_for_tier(workspace, workspace_tier)
    fields_to_update = []

    if workspace.ai_credits_monthly != monthly:
        workspace.ai_credits_monthly = monthly
        fields_to_update.append('ai_credits_monthly')

    if workspace.ai_credits_reset_at is None:
        workspace.ai_credits_reset_at = _next_month_reset(now)
        fields_to_update.append('ai_credits_reset_at')

    if workspace.ai_credits_remaining is None:
        workspace.ai_credits_remaining = monthly
        fields_to_update.append('ai_credits_remaining')

    if workspace.ai_credits_reset_at and now >= workspace.ai_credits_reset_at:
        workspace.ai_credits_remaining = monthly
        workspace.ai_credits_reset_at = _next_month_reset(now)
        if 'ai_credits_remaining' not in fields_to_update:
            fields_to_update.append('ai_credits_remaining')
        if 'ai_credits_reset_at' not in fields_to_update:
            fields_to_update.append('ai_credits_reset_at')

    if fields_to_update:
        workspace.save(update_fields=fields_to_update)


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


def _call_gemini(prompt, api_key, model_name):
    if not api_key:
        return None, True

    model = (model_name or DEFAULT_GEMINI_MODEL).strip()
    url = (
        'https://generativelanguage.googleapis.com/v1beta/models/'
        f'{model}:generateContent?key={api_key}'
    )
    payload = json.dumps(
        {'contents': [{'parts': [{'text': prompt}]}]}
    ).encode('utf-8')

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


def _serialize_run(run):
    return {
        'id': str(run.id),
        'workspaceId': run.workspace_id,
        'systemId': run.system_id,
        'status': run.status,
        'workspaceTier': run.workspace_tier,
        'score': run.score,
        'summary': run.summary or None,
        'results': run.results or [],
        'suggestions': run.suggestions,
        'creditsExhausted': run.credits_exhausted,
        'creditsRemaining': run.credits_remaining,
        'geminiError': run.gemini_error,
        'error': run.error_message or None,
        'createdAt': run.created_at,
        'startedAt': run.started_at,
        'completedAt': run.completed_at,
    }


def _process_evaluation_run(run_id):
    close_old_connections()
    try:
        run = EvaluationRun.objects.select_related('workspace__owner', 'user').get(pk=run_id)
        if run.status != EvaluationRun.Status.PENDING:
            return

        run.status = EvaluationRun.Status.RUNNING
        run.started_at = timezone.now()
        run.save(update_fields=['status', 'started_at'])

        workspace = run.workspace
        system = Canvas.objects.filter(id=run.system_id, workspace=workspace).first()
        if system is None:
            raise RuntimeError('System not found for this evaluation run.')

        workspace_tier = run.workspace_tier or _resolve_workspace_tier(workspace)
        _ensure_credit_state(workspace, workspace_tier)

        engine_payload = _run_rule_engine(run.canvas_state or {}, workspace_tier)
        results = engine_payload.get('results', [])
        summary = engine_payload.get('summary', {})
        score = int(engine_payload.get('score', summary.get('score', 0) or 0))
        prompt = engine_payload.get('prompt', '')

        failed_count = int(summary.get('failed', 0) or 0)
        credits_remaining = int(workspace.ai_credits_remaining or 0)
        suggestions = None
        credits_exhausted = False
        gemini_error = False
        credit_consumed = False

        if failed_count == 0:
            suggestions = 'Your architecture passes all applicable rules. No improvements to suggest.'
        elif credits_remaining <= 0:
            credits_exhausted = True
            credits_remaining = 0
        else:
            if workspace_tier == 'team':
                seven_days_ago = timezone.now() - timedelta(days=7)
                user_consumed = EvaluationLog.objects.filter(
                    workspace=workspace,
                    user=run.user,
                    evaluated_at__gte=seven_days_ago,
                    credit_consumed=True,
                ).count()
                pool_limit = max(int(workspace.ai_credits_monthly or 0), 1)
                if (user_consumed + 1) > (pool_limit * 0.4):
                    raise RuntimeError('You have used 40% of the team pool. Contact your admin to override.')

            api_key = os.getenv('GEMINI_API_KEY', '')
            gemini_model = os.getenv('GEMINI_MODEL', DEFAULT_GEMINI_MODEL)
            suggestions, gemini_error = _call_gemini(prompt, api_key, gemini_model)

            if suggestions:
                with transaction.atomic():
                    updated_rows = Workspace.objects.filter(
                        id=workspace.id,
                        ai_credits_remaining__gt=0,
                    ).update(ai_credits_remaining=F('ai_credits_remaining') - 1)
                    if updated_rows:
                        credit_consumed = True
                        workspace.refresh_from_db(fields=['ai_credits_remaining'])
                        credits_remaining = int(workspace.ai_credits_remaining or 0)
                    else:
                        credits_exhausted = True
                        credits_remaining = 0
                        suggestions = None

        EvaluationLog.objects.create(
            workspace=workspace,
            system_id=system.id,
            user=run.user,
            workspace_tier=workspace_tier,
            score=score,
            rules_evaluated=int(summary.get('applicable', 0) or 0),
            rules_passed=int(summary.get('passed', 0) or 0),
            credit_consumed=credit_consumed,
        )

        run.status = EvaluationRun.Status.COMPLETED
        run.score = score
        run.summary = summary
        run.results = results
        run.suggestions = suggestions
        run.credits_exhausted = credits_exhausted
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
    except Exception as exc:
        EvaluationRun.objects.filter(pk=run_id).update(
            status=EvaluationRun.Status.FAILED,
            error_message=str(exc),
            completed_at=timezone.now(),
        )
    finally:
        close_old_connections()


class EvaluateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = EvaluateRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        workspace_id = serializer.validated_data['workspaceId']
        system_id = serializer.validated_data['systemId']
        canvas_state = serializer.validated_data['canvasState']

        workspace = get_object_or_404(Workspace.objects.select_related('owner'), id=workspace_id)
        system = get_object_or_404(Canvas, id=system_id, workspace=workspace)

        is_member = WorkspaceMember.objects.filter(workspace=workspace, user=request.user).exists()
        if not is_member or not user_has_system_read_access(system, request.user):
            raise PermissionDenied('You do not have permission to evaluate this system.')

        workspace_tier = _resolve_workspace_tier(workspace)

        now = timezone.now()
        one_hour_ago = now - timedelta(hours=1)
        recent_requests = EvaluationRun.objects.filter(
            workspace=workspace,
            created_at__gte=one_hour_ago,
        ).order_by('created_at')
        if recent_requests.count() >= 10:
            first_event = recent_requests.first()
            retry_after = 60
            if first_event:
                retry_after = max(
                    int(((first_event.created_at + timedelta(hours=1)) - now).total_seconds()),
                    1,
                )
            return Response(
                {'error': 'rate_limit', 'retryAfterSeconds': retry_after},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        _ensure_credit_state(workspace, workspace_tier)

        if workspace_tier == 'team':
            seven_days_ago = now - timedelta(days=7)
            user_consumed = EvaluationLog.objects.filter(
                workspace=workspace,
                user=request.user,
                evaluated_at__gte=seven_days_ago,
                credit_consumed=True,
            ).count()
            pool_limit = max(int(workspace.ai_credits_monthly or 0), 1)
            if (user_consumed + 1) > (pool_limit * 0.4):
                return Response(
                    {
                        'error': 'user_throttle',
                        'message': 'You have used 40% of the team pool. Contact your admin to override.',
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

        run = EvaluationRun.objects.create(
            workspace=workspace,
            system_id=system.id,
            user=request.user,
            workspace_tier=workspace_tier,
            canvas_state=canvas_state,
            status=EvaluationRun.Status.PENDING,
            credits_remaining=int(workspace.ai_credits_remaining or 0),
        )

        worker = threading.Thread(target=_process_evaluation_run, args=(run.id,), daemon=True)
        worker.start()

        return Response(
            {
                'runId': str(run.id),
                'status': run.status,
                'workspaceTier': workspace_tier,
                'createdAt': run.created_at,
            },
            status=status.HTTP_202_ACCEPTED,
        )


class EvaluationRunStatusAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, run_id):
        run = get_object_or_404(
            EvaluationRun.objects.select_related('workspace', 'workspace__owner'),
            id=run_id,
        )
        system = get_object_or_404(Canvas, id=run.system_id, workspace=run.workspace)

        is_member = WorkspaceMember.objects.filter(workspace=run.workspace, user=request.user).exists()
        if not is_member or not user_has_system_read_access(system, request.user):
            raise PermissionDenied('You do not have permission to view this evaluation run.')

        return Response(_serialize_run(run), status=status.HTTP_200_OK)


class WorkspaceEvaluationListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, workspace_id):
        workspace = get_object_or_404(Workspace, id=workspace_id)

        is_member = WorkspaceMember.objects.filter(workspace=workspace, user=request.user).exists()
        if not is_member:
            raise PermissionDenied('You do not have permission to view workspace evaluations.')

        runs = (
            EvaluationRun.objects.filter(workspace=workspace)
            .select_related('user')
            .order_by('-created_at')[:100]
        )
        active_count = EvaluationRun.objects.filter(
            workspace=workspace,
            status__in=[EvaluationRun.Status.PENDING, EvaluationRun.Status.RUNNING],
        ).count()

        return Response(
            {
                'activeCount': active_count,
                'totalCount': EvaluationRun.objects.filter(workspace=workspace).count(),
                'runs': [_serialize_run(run) for run in runs],
            },
            status=status.HTTP_200_OK,
        )
