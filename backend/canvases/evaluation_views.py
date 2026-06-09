from datetime import timedelta
import logging

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, serializers, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from django.conf import settings

from audit.services import record_system_event
from canvases.models import Canvas
from canvases.queue_publisher import enqueue_evaluation_job
from permissions.checks import user_has_system_read_access
from permissions.models import WorkspaceMember
from workspaces.models import EvaluationRun, Workspace
from workspaces.credit_service import (
    CreditExhaustedError,
    TeamSoftThrottleError,
    claim_ai_credit,
)
from workspaces.services.insight_token_service import (
    NoInsightTokensError,
    consume_insight_token_on_confirmation,
    get_workspace_insight_token_status,
    refund_insight_token,
)
HOURLY_WORKSPACE_EVALUATION_LIMIT = 10
logger = logging.getLogger(__name__)

_TIER_MAP = {
    'CORE': 'core',
    'INDIVIDUAL': 'individual',
    'TEAM': 'team',
    'ENTERPRISE': 'enterprise',
}


def _resolve_workspace_tier(workspace):
    raw_plan = (getattr(workspace.owner, 'current_plan', 'CORE') or 'CORE').upper()
    return _TIER_MAP.get(raw_plan, 'core')


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


class InsightTokenStatusRequestSerializer(serializers.Serializer):
    workspaceId = serializers.CharField(max_length=8)


class AIEvaluationRequestSerializer(EvaluateRequestSerializer):
    pass


def _dispatch_evaluation_job(*, run, workspace, system, canvas_state):
    transport = 'sqs' if settings.USE_SQS else 'local'
    payload = {
        'runId': str(run.id),
        'workspaceId': str(workspace.id),
        'systemId': str(system.id),
        'canvasState': canvas_state,
    }
    queued = enqueue_evaluation_job(payload)
    if queued:
        logger.info(
            'evaluation job queued run_id=%s workspace_id=%s system_id=%s transport=%s',
            run.id, workspace.id, system.id, transport,
        )
        return True

    run.status = EvaluationRun.Status.FAILED
    run.error_message = 'Failed to queue evaluation'
    run.save(update_fields=['status', 'error_message'])
    logger.error(
        'evaluation queue publish failed run_id=%s workspace_id=%s system_id=%s transport=%s',
        run.id, workspace.id, system.id, transport,
    )
    return False


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
        'cloudAnalysis': run.cloud_analysis or None,
        'creditsExhausted': run.credits_exhausted,
        'creditsRemaining': run.credits_remaining,
        'insightTokenConsumed': run.insight_token_consumed,
        'insightTokensRemaining': run.insight_tokens_remaining,
        'aiError': run.ai_error,
        'error': run.error_message or None,
        'createdAt': run.created_at,
        'startedAt': run.started_at,
        'completedAt': run.completed_at,
    }


def _record_evaluation_audit_event(*, workspace, system, actor, run, action, request=None, status='success', message='', metadata=None):
    try:
        record_system_event(
            workspace=workspace,
            system=system,
            actor=actor,
            request=request,
            category='evaluation',
            action=action,
            status=status,
            target_name=getattr(system, 'name', ''),
            target_id=getattr(run, 'id', ''),
            message=message,
            metadata=metadata or {},
        )
    except Exception:
        logger.exception(
            'evaluation audit logging failed workspace_id=%s system_id=%s run_id=%s action=%s',
            getattr(workspace, 'id', None),
            getattr(system, 'id', None),
            getattr(run, 'id', None),
            action,
        )


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
        logger.info(
            'ai evaluation context resolved workspace_id=%s system_id=%s',
            workspace.id,
            system.id,
        )

        now = timezone.now()
        one_hour_ago = now - timedelta(hours=1)
        recent_requests = EvaluationRun.objects.filter(
            workspace_id=workspace_id,
            created_at__gte=one_hour_ago,
        ).order_by('created_at')
        if recent_requests.count() >= HOURLY_WORKSPACE_EVALUATION_LIMIT:
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

        is_member = WorkspaceMember.objects.filter(workspace=workspace, user=request.user).exists()
        if not is_member or not user_has_system_read_access(system, request.user):
            raise PermissionDenied('You do not have permission to evaluate this system.')

        workspace_tier = _resolve_workspace_tier(workspace)
        try:
            with transaction.atomic():
                run = EvaluationRun.objects.create(
                    workspace=workspace,
                    system_id=system.id,
                    user=request.user,
                    workspace_tier=workspace_tier,
                    canvas_state=canvas_state,
                    status=EvaluationRun.Status.PENDING,
                )
                token_state = consume_insight_token_on_confirmation(
                    workspace_id=workspace.id,
                    now=now,
                )
                run.insight_token_consumed = True
                run.insight_tokens_remaining = token_state['insightTokensRemaining']
                claim_result = claim_ai_credit(
                    workspace_id=workspace.id,
                    user_id=request.user.user_id,
                    evaluation_run_id=run.id,
                    now=now,
                )
                run.credits_remaining = claim_result['credits_remaining']
                run.save(
                    update_fields=[
                        'insight_token_consumed',
                        'insight_tokens_remaining',
                        'credits_remaining',
                    ]
                )
        except NoInsightTokensError as exc:
            return Response(
                {'error': 'NO_TOKENS', 'message': str(exc)},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )
        except TeamSoftThrottleError as exc:
            return Response(
                {'error': 'user_throttle', 'message': str(exc)},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        except CreditExhaustedError:
            return Response(
                {'error': 'credits_exhausted', 'message': 'Workspace AI credits are exhausted.'},
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )
        _record_evaluation_audit_event(
            workspace=workspace,
            system=system,
            actor=request.user,
            run=run,
            request=request,
            action='Evaluation Queued',
            metadata={'run_id': str(run.id), 'workspace_tier': workspace_tier},
        )

        if not _dispatch_evaluation_job(
            run=run,
            workspace=workspace,
            system=system,
            canvas_state=canvas_state,
        ):
            token_state = None
            if run.insight_token_consumed:
                token_state = refund_insight_token(workspace_id=workspace.id)
                run.insight_token_consumed = False
                run.insight_tokens_remaining = token_state['insightTokensRemaining']
                run.save(update_fields=['insight_token_consumed', 'insight_tokens_remaining'])
            _record_evaluation_audit_event(
                workspace=workspace,
                system=system,
                actor=request.user,
                run=run,
                request=request,
                action='Evaluation Queue Failed',
                status='error',
                message='Failed to queue evaluation for processing.',
                metadata={'run_id': str(run.id)},
            )
            return Response(
                {
                    'error': 'Evaluation service temporarily unavailable',
                    'insightTokensRemaining': token_state['insightTokensRemaining'] if token_state else None,
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response({'runId': str(run.id)}, status=status.HTTP_202_ACCEPTED)


class InsightTokenStatusAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = InsightTokenStatusRequestSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        workspace_id = serializer.validated_data['workspaceId']
        workspace = get_object_or_404(Workspace.objects.select_related('owner'), id=workspace_id)

        is_member = WorkspaceMember.objects.filter(workspace=workspace, user=request.user).exists()
        if not is_member:
            raise PermissionDenied('You do not have permission to access this workspace.')

        token_state = get_workspace_insight_token_status(workspace_id=workspace.id)
        return Response(token_state, status=status.HTTP_200_OK)


class AIEvaluationAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Keep endpoint compatibility while enforcing the same async execution path.
        return EvaluateAPIView().post(request)


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
