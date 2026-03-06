from datetime import timedelta

from django.utils import timezone

from workspaces.models import EvaluationRun


HOURLY_WORKSPACE_AI_EVALUATION_LIMIT = 10


class WorkspaceAiRateLimitError(RuntimeError):
    def __init__(self, retry_after_seconds):
        super().__init__('AI evaluation rate limit reached.')
        self.retry_after_seconds = retry_after_seconds


def enforce_workspace_hourly_ai_limit(*, workspace_id, now=None):
    now = now or timezone.now()
    one_hour_ago = now - timedelta(hours=1)

    recent_requests = EvaluationRun.objects.filter(
        workspace_id=workspace_id,
        created_at__gte=one_hour_ago,
    ).order_by('created_at')

    if recent_requests.count() < HOURLY_WORKSPACE_AI_EVALUATION_LIMIT:
        return

    first_event = recent_requests.first()
    retry_after = 60
    if first_event:
        retry_after = max(
            int(((first_event.created_at + timedelta(hours=1)) - now).total_seconds()),
            1,
        )
    raise WorkspaceAiRateLimitError(retry_after)
