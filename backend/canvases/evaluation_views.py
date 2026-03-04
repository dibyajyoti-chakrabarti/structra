import json
import os
import subprocess
from datetime import timedelta
from pathlib import Path
from urllib import error as urllib_error
from urllib import request as urllib_request

from django.db import transaction
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
from workspaces.models import EvaluationLog, Workspace

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
    # Includes workspace admin seat.
    return max(workspace.members.count(), 1)


def _monthly_credits_for_tier(workspace, workspace_tier):
    if workspace_tier == 'core':
        return 5
    if workspace_tier == 'individual':
        return 50
    if workspace_tier == 'team':
        return _team_seat_count(workspace) * 80
    # Enterprise defaults to configured value when present.
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
    payload = json.dumps({
        'contents': [
            {
                'parts': [{'text': prompt}],
            }
        ]
    }).encode('utf-8')

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
        recent_requests = EvaluationLog.objects.filter(
            workspace=workspace,
            evaluated_at__gte=one_hour_ago,
        ).order_by('evaluated_at')
        if recent_requests.count() >= 10:
            first_event = recent_requests.first()
            retry_after = 60
            if first_event:
                retry_after = max(
                    int(((first_event.evaluated_at + timedelta(hours=1)) - now).total_seconds()),
                    1,
                )
            return Response(
                {'error': 'rate_limit', 'retryAfterSeconds': retry_after},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        _ensure_credit_state(workspace, workspace_tier)

        try:
            engine_payload = _run_rule_engine(canvas_state, workspace_tier)
        except RuntimeError as exc:
            return Response({'error': 'evaluation_failed', 'message': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        results = engine_payload.get('results', [])
        summary = engine_payload.get('summary', {})
        score = int(engine_payload.get('score', summary.get('score', 0) or 0))
        prompt = engine_payload.get('prompt', '')

        failed_count = int(summary.get('failed', 0) or 0)
        credits_remaining = int(workspace.ai_credits_remaining or 0)

        response_payload = {
            'score': score,
            'summary': summary,
            'results': results,
            'suggestions': None,
            'creditsExhausted': False,
            'creditsRemaining': credits_remaining,
            'workspaceTier': workspace_tier,
        }

        if failed_count == 0:
            response_payload['suggestions'] = 'Your architecture passes all applicable rules. No improvements to suggest.'
            EvaluationLog.objects.create(
                workspace=workspace,
                system_id=system.id,
                user=request.user,
                workspace_tier=workspace_tier,
                score=score,
                rules_evaluated=int(summary.get('applicable', 0) or 0),
                rules_passed=int(summary.get('passed', 0) or 0),
                credit_consumed=False,
            )
            return Response(response_payload, status=status.HTTP_200_OK)

        if credits_remaining <= 0:
            response_payload['creditsExhausted'] = True
            response_payload['creditsRemaining'] = 0
            EvaluationLog.objects.create(
                workspace=workspace,
                system_id=system.id,
                user=request.user,
                workspace_tier=workspace_tier,
                score=score,
                rules_evaluated=int(summary.get('applicable', 0) or 0),
                rules_passed=int(summary.get('passed', 0) or 0),
                credit_consumed=False,
            )
            return Response(response_payload, status=status.HTTP_200_OK)

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

        api_key = os.getenv('GEMINI_API_KEY', '')
        gemini_model = os.getenv('GEMINI_MODEL', DEFAULT_GEMINI_MODEL)
        suggestions, gemini_error = _call_gemini(prompt, api_key, gemini_model)

        credit_consumed = False
        if suggestions:
            with transaction.atomic():
                updated_rows = Workspace.objects.filter(
                    id=workspace.id,
                    ai_credits_remaining__gt=0,
                ).update(ai_credits_remaining=F('ai_credits_remaining') - 1)
                if updated_rows:
                    credit_consumed = True
                    workspace.refresh_from_db(fields=['ai_credits_remaining'])
                    response_payload['creditsRemaining'] = int(workspace.ai_credits_remaining or 0)
                else:
                    response_payload['creditsExhausted'] = True
                    response_payload['creditsRemaining'] = 0
                    suggestions = None

        response_payload['suggestions'] = suggestions
        if gemini_error and suggestions is None:
            response_payload['geminiError'] = True

        EvaluationLog.objects.create(
            workspace=workspace,
            system_id=system.id,
            user=request.user,
            workspace_tier=workspace_tier,
            score=score,
            rules_evaluated=int(summary.get('applicable', 0) or 0),
            rules_passed=int(summary.get('passed', 0) or 0),
            credit_consumed=credit_consumed,
        )

        return Response(response_payload, status=status.HTTP_200_OK)
