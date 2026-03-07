from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, serializers, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.services import record_system_event
from canvases.evaluation_service import (
    call_gemini_for_prompt,
    evaluate_canvas_state,
    resolve_workspace_tier,
    run_evaluation_job,
)
from canvases.models import Canvas
from canvases.sqs_publisher import publish_evaluation_job
from permissions.checks import user_has_system_read_access
from permissions.models import WorkspaceMember
from workspaces.models import EvaluationLog, EvaluationRun, Workspace
from workspaces.credit_service import (
    CreditExhaustedError,
    TeamSoftThrottleError,
    claim_ai_credit,
)
from workspaces.middleware.check_insight_tokens import (
    WorkspaceAiRateLimitError,
    enforce_workspace_hourly_ai_limit,
)
from workspaces.services.insight_token_service import (
    NoInsightTokensError,
    consume_insight_token_after_success,
    ensure_workspace_has_insight_tokens,
    get_workspace_insight_token_status,
)
HOURLY_WORKSPACE_EVALUATION_LIMIT = 10


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
        'insightTokenConsumed': run.insight_token_consumed,
        'insightTokensRemaining': run.insight_tokens_remaining,
        'geminiError': run.gemini_error,
        'error': run.error_message or None,
        'createdAt': run.created_at,
        'startedAt': run.started_at,
        'completedAt': run.completed_at,
    }


def _record_evaluation_audit_event(*, workspace, system, actor, run, action, request=None, status='success', message='', metadata=None):
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

        workspace_tier = resolve_workspace_tier(workspace)
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
                claim_result = claim_ai_credit(
                    workspace_id=workspace.id,
                    user_id=request.user.user_id,
                    evaluation_run_id=run.id,
                    now=now,
                )
                run.credits_remaining = claim_result['credits_remaining']
                run.save(update_fields=['credits_remaining'])
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

        if settings.USE_SQS:
            published = publish_evaluation_job(
                run_id=str(run.id),
                workspace_id=str(workspace.id),
                system_id=str(system_id),
                canvas_state=canvas_state,
            )
            if not published:
                run.status = EvaluationRun.Status.FAILED
                run.error_message = 'Failed to queue evaluation'
                run.save(update_fields=['status', 'error_message'])
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
                    {'error': 'Evaluation service temporarily unavailable'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
        else:
            import threading

            worker = threading.Thread(target=run_evaluation_job, args=(run, canvas_state), daemon=True)
            worker.start()

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
        serializer = AIEvaluationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        workspace_id = serializer.validated_data['workspaceId']
        system_id = serializer.validated_data['systemId']
        canvas_state = serializer.validated_data['canvasState']

        workspace = get_object_or_404(Workspace.objects.select_related('owner'), id=workspace_id)
        system = get_object_or_404(Canvas, id=system_id, workspace=workspace)

        is_member = WorkspaceMember.objects.filter(workspace=workspace, user=request.user).exists()
        if not is_member or not user_has_system_read_access(system, request.user):
            raise PermissionDenied('You do not have permission to evaluate this system.')

        now = timezone.now()
        try:
            enforce_workspace_hourly_ai_limit(workspace_id=workspace.id, now=now)
        except WorkspaceAiRateLimitError as exc:
            return Response(
                {'error': 'RATE_LIMIT', 'retryAfterSeconds': exc.retry_after_seconds},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        workspace_tier = resolve_workspace_tier(workspace)
        engine_payload = evaluate_canvas_state(canvas_state, workspace_tier)
        results = engine_payload['results']
        summary = engine_payload['summary']
        score = engine_payload['score']
        prompt = engine_payload['prompt']

        run = EvaluationRun.objects.create(
            workspace=workspace,
            system_id=system.id,
            user=request.user,
            workspace_tier=workspace_tier,
            canvas_state=canvas_state,
            status=EvaluationRun.Status.RUNNING,
            started_at=now,
        )
        _record_evaluation_audit_event(
            workspace=workspace,
            system=system,
            actor=request.user,
            run=run,
            request=request,
            action='Evaluation Started',
            metadata={'run_id': str(run.id), 'workspace_tier': workspace_tier},
        )

        failed_count = int(summary.get('failed', 0) or 0)
        if failed_count == 0:
            token_state = get_workspace_insight_token_status(workspace_id=workspace.id, now=now)
            suggestions = 'Your architecture passes all applicable rules. No improvements to suggest.'

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

            run.status = EvaluationRun.Status.COMPLETED
            run.score = score
            run.summary = summary
            run.results = results
            run.suggestions = suggestions
            run.credits_exhausted = False
            run.credits_remaining = token_state['insightTokensRemaining']
            run.insight_token_consumed = False
            run.insight_tokens_remaining = token_state['insightTokensRemaining']
            run.gemini_error = False
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
                    'insight_token_consumed',
                    'insight_tokens_remaining',
                    'gemini_error',
                    'error_message',
                    'completed_at',
                ]
            )
            _record_evaluation_audit_event(
                workspace=workspace,
                system=system,
                actor=request.user,
                run=run,
                request=request,
                action='Evaluation Completed',
                message='Rule evaluation completed without AI generation.',
                metadata={
                    'run_id': str(run.id),
                    'score': score,
                    'failed_rules': failed_count,
                    'gemini_error': False,
                },
            )

            return Response(
                {
                    'runId': str(run.id),
                    'workspaceTier': workspace_tier,
                    'score': score,
                    'summary': summary,
                    'results': results,
                    'suggestions': suggestions,
                    'tokenConsumed': False,
                    **token_state,
                },
                status=status.HTTP_200_OK,
            )

        try:
            ensure_workspace_has_insight_tokens(workspace_id=workspace.id, now=now)
        except NoInsightTokensError as exc:
            run.status = EvaluationRun.Status.FAILED
            run.score = score
            run.summary = summary
            run.results = results
            run.suggestions = None
            run.credits_exhausted = True
            run.credits_remaining = 0
            run.insight_token_consumed = False
            run.insight_tokens_remaining = 0
            run.gemini_error = False
            run.error_message = str(exc)
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
                    'insight_token_consumed',
                    'insight_tokens_remaining',
                    'gemini_error',
                    'error_message',
                    'completed_at',
                ]
            )
            _record_evaluation_audit_event(
                workspace=workspace,
                system=system,
                actor=request.user,
                run=run,
                request=request,
                action='Evaluation Failed',
                status='error',
                message=str(exc),
                metadata={'run_id': str(run.id), 'score': score, 'failed_rules': failed_count},
            )
            return Response(
                {
                    'error': 'NO_TOKENS',
                    'message': str(exc),
                    'workspaceTier': workspace_tier,
                    'score': score,
                    'summary': summary,
                    'results': results,
                    'insightTokensRemaining': 0,
                },
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        suggestions, gemini_error = call_gemini_for_prompt(prompt)
        if gemini_error or not suggestions:
            token_state = get_workspace_insight_token_status(workspace_id=workspace.id, now=timezone.now())
            run.status = EvaluationRun.Status.COMPLETED
            run.score = score
            run.summary = summary
            run.results = results
            run.suggestions = None
            run.credits_exhausted = False
            run.credits_remaining = token_state['insightTokensRemaining']
            run.insight_token_consumed = False
            run.insight_tokens_remaining = token_state['insightTokensRemaining']
            run.gemini_error = True
            run.error_message = 'Could not reach AI service.'
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
                    'insight_token_consumed',
                    'insight_tokens_remaining',
                    'gemini_error',
                    'error_message',
                    'completed_at',
                ]
            )
            _record_evaluation_audit_event(
                workspace=workspace,
                system=system,
                actor=request.user,
                run=run,
                request=request,
                action='Evaluation Completed (AI Warning)',
                status='warning',
                message='Rule evaluation completed, but AI service response was unavailable.',
                metadata={'run_id': str(run.id), 'score': score, 'failed_rules': failed_count, 'gemini_error': True},
            )

            return Response(
                {
                    'error': 'GEMINI_FAILED',
                    'message': 'Could not reach AI service.',
                    'workspaceTier': workspace_tier,
                    'score': score,
                    'summary': summary,
                    'results': results,
                    **token_state,
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            token_state = consume_insight_token_after_success(workspace_id=workspace.id, now=timezone.now())
        except NoInsightTokensError as exc:
            run.status = EvaluationRun.Status.FAILED
            run.score = score
            run.summary = summary
            run.results = results
            run.suggestions = None
            run.credits_exhausted = True
            run.credits_remaining = 0
            run.insight_token_consumed = False
            run.insight_tokens_remaining = 0
            run.gemini_error = False
            run.error_message = str(exc)
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
                    'insight_token_consumed',
                    'insight_tokens_remaining',
                    'gemini_error',
                    'error_message',
                    'completed_at',
                ]
            )
            _record_evaluation_audit_event(
                workspace=workspace,
                system=system,
                actor=request.user,
                run=run,
                request=request,
                action='Evaluation Failed',
                status='error',
                message=str(exc),
                metadata={'run_id': str(run.id), 'score': score, 'failed_rules': failed_count},
            )
            return Response(
                {
                    'error': 'NO_TOKENS',
                    'message': str(exc),
                    'workspaceTier': workspace_tier,
                    'score': score,
                    'summary': summary,
                    'results': results,
                    'insightTokensRemaining': 0,
                },
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        EvaluationLog.objects.create(
            workspace=workspace,
            system_id=system.id,
            user=request.user,
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
        run.credits_remaining = token_state['insightTokensRemaining']
        run.insight_token_consumed = True
        run.insight_tokens_remaining = token_state['insightTokensRemaining']
        run.gemini_error = False
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
                'insight_token_consumed',
                'insight_tokens_remaining',
                'gemini_error',
                'error_message',
                'completed_at',
            ]
        )
        _record_evaluation_audit_event(
            workspace=workspace,
            system=system,
            actor=request.user,
            run=run,
            request=request,
            action='Evaluation Completed',
            message='Rule evaluation and AI report generation completed.',
            metadata={
                'run_id': str(run.id),
                'score': score,
                'failed_rules': failed_count,
                'gemini_error': False,
            },
        )

        return Response(
            {
                'runId': str(run.id),
                'workspaceTier': workspace_tier,
                'score': score,
                'summary': summary,
                'results': results,
                'suggestions': suggestions,
                'tokenConsumed': True,
                **token_state,
            },
            status=status.HTTP_200_OK,
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
