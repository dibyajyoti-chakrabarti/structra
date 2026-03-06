from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from core.pricing import PLAN_CORE, PLAN_INDIVIDUAL, PLAN_TEAM, normalize_plan
from workspaces.models import Workspace


CORE_DAILY_INSIGHT_TOKENS = 3
INDIVIDUAL_DAILY_INSIGHT_TOKENS = 15
TEAM_DAILY_INSIGHT_TOKENS_PER_SEAT = 25


class NoInsightTokensError(RuntimeError):
    pass


def get_workspace_tier(workspace: Workspace) -> str:
    owner = getattr(workspace, 'owner', None)
    return normalize_plan(getattr(owner, 'current_plan', PLAN_CORE)).lower()


def get_workspace_seat_count(workspace: Workspace) -> int:
    tier = get_workspace_tier(workspace)
    if tier != 'team':
        return 1
    owner = getattr(workspace, 'owner', None)
    return max(int(getattr(owner, 'purchased_team_seats', 1) or 1), 1)


def get_daily_insight_tokens(workspace: Workspace) -> int:
    tier = get_workspace_tier(workspace)
    if tier == 'core':
        return CORE_DAILY_INSIGHT_TOKENS
    if tier == 'individual':
        return INDIVIDUAL_DAILY_INSIGHT_TOKENS
    if tier == 'team':
        return TEAM_DAILY_INSIGHT_TOKENS_PER_SEAT * get_workspace_seat_count(workspace)
    # Enterprise currently follows Team seat-pooled allocation.
    return TEAM_DAILY_INSIGHT_TOKENS_PER_SEAT * get_workspace_seat_count(workspace)


def ensure_workspace_insight_token_state(workspace: Workspace, *, now=None, force_reset=False) -> Workspace:
    now = now or timezone.now()
    today = timezone.localdate(now)
    allocation = get_daily_insight_tokens(workspace)

    fields_to_update = []

    if workspace.daily_insight_tokens != allocation:
        workspace.daily_insight_tokens = allocation
        fields_to_update.append('daily_insight_tokens')

    if workspace.insight_tokens_remaining is None:
        workspace.insight_tokens_remaining = allocation
        fields_to_update.append('insight_tokens_remaining')

    should_reset = force_reset or workspace.last_token_reset_date != today
    if should_reset:
        workspace.insight_tokens_remaining = allocation
        workspace.last_token_reset_date = today
        if 'insight_tokens_remaining' not in fields_to_update:
            fields_to_update.append('insight_tokens_remaining')
        fields_to_update.append('last_token_reset_date')

    if fields_to_update:
        workspace.save(update_fields=fields_to_update)

    return workspace


def get_workspace_insight_token_status(*, workspace_id, now=None):
    now = now or timezone.now()
    workspace = Workspace.all_objects.select_related('owner').get(id=workspace_id)
    workspace = ensure_workspace_insight_token_state(workspace, now=now)

    return {
        'tier': get_workspace_tier(workspace),
        'seatCount': get_workspace_seat_count(workspace),
        'dailyInsightTokens': int(workspace.daily_insight_tokens or 0),
        'insightTokensRemaining': int(workspace.insight_tokens_remaining or 0),
        'lastTokenResetDate': workspace.last_token_reset_date,
    }


def ensure_workspace_has_insight_tokens(*, workspace_id, now=None):
    now = now or timezone.now()
    with transaction.atomic():
        workspace = (
            Workspace.all_objects.select_related('owner').select_for_update().get(id=workspace_id)
        )
        workspace = ensure_workspace_insight_token_state(workspace, now=now)
        remaining = int(workspace.insight_tokens_remaining or 0)
        if remaining <= 0:
            raise NoInsightTokensError(
                'You have no Insight Tokens remaining today. Tokens reset tomorrow.'
            )

        return {
            'tier': get_workspace_tier(workspace),
            'seatCount': get_workspace_seat_count(workspace),
            'dailyInsightTokens': int(workspace.daily_insight_tokens or 0),
            'insightTokensRemaining': remaining,
            'lastTokenResetDate': workspace.last_token_reset_date,
        }


def consume_insight_token_after_success(*, workspace_id, now=None):
    now = now or timezone.now()
    with transaction.atomic():
        workspace = (
            Workspace.all_objects.select_related('owner').select_for_update().get(id=workspace_id)
        )
        workspace = ensure_workspace_insight_token_state(workspace, now=now)

        remaining = int(workspace.insight_tokens_remaining or 0)
        if remaining <= 0:
            raise NoInsightTokensError(
                'You have no Insight Tokens remaining today. Tokens reset tomorrow.'
            )

        workspace.insight_tokens_remaining = remaining - 1
        workspace.save(update_fields=['insight_tokens_remaining', 'updated_at'])

        return {
            'tier': get_workspace_tier(workspace),
            'seatCount': get_workspace_seat_count(workspace),
            'dailyInsightTokens': int(workspace.daily_insight_tokens or 0),
            'insightTokensRemaining': int(workspace.insight_tokens_remaining or 0),
            'lastTokenResetDate': workspace.last_token_reset_date,
        }
