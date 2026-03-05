from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from core.constants import WorkspaceRole
from core.pricing import PLAN_CORE, PLAN_INDIVIDUAL, PLAN_TEAM, normalize_plan
from permissions.models import WorkspaceMember
from workspaces.models import Workspace, WorkspaceCreditConsumption


CORE_MONTHLY_CREDITS = 5
INDIVIDUAL_MONTHLY_CREDITS = 50
TEAM_SEAT_MONTHLY_CREDITS = 80
TEAM_USER_SOFT_THROTTLE_RATIO = Decimal("0.40")


class CreditExhaustedError(RuntimeError):
    pass


class TeamSoftThrottleError(RuntimeError):
    pass


def get_workspace_plan(workspace: Workspace) -> str:
    owner = getattr(workspace, "owner", None)
    return normalize_plan(getattr(owner, "current_plan", PLAN_CORE))


def get_invited_billable_seat_count(workspace: Workspace) -> int:
    return WorkspaceMember.objects.filter(
        workspace=workspace,
        role=WorkspaceRole.MEMBER,
    ).count()


def get_monthly_pool_credits(workspace: Workspace, plan: str | None = None) -> int:
    normalized = normalize_plan(plan or get_workspace_plan(workspace))
    if normalized == PLAN_CORE:
        return CORE_MONTHLY_CREDITS
    if normalized == PLAN_INDIVIDUAL:
        return INDIVIDUAL_MONTHLY_CREDITS
    if normalized == PLAN_TEAM:
        # Team pool always includes admin's base seat.
        return (get_invited_billable_seat_count(workspace) + 1) * TEAM_SEAT_MONTHLY_CREDITS
    # Enterprise falls back to currently configured workspace monthly capacity.
    return max(int(workspace.ai_credits_monthly or INDIVIDUAL_MONTHLY_CREDITS), 1)


def _next_billing_anchor(workspace: Workspace, now):
    owner = getattr(workspace, "owner", None)
    owner_cycle_end = getattr(owner, "plan_expires_at", None)
    if owner_cycle_end and owner_cycle_end > now:
        return owner_cycle_end

    reset_at = workspace.ai_credits_reset_at
    if reset_at and reset_at > now:
        return reset_at

    return now + timedelta(days=30)


def _roll_forward_reset_at(reset_at, now):
    target = reset_at
    while target <= now:
        target += timedelta(days=30)
    return target


def ensure_workspace_credit_state(workspace: Workspace, *, now=None, force_reset=False) -> Workspace:
    now = now or timezone.now()
    monthly_pool = get_monthly_pool_credits(workspace)

    fields_to_update = []
    if workspace.ai_credits_monthly != monthly_pool:
        workspace.ai_credits_monthly = monthly_pool
        fields_to_update.append("ai_credits_monthly")

    if workspace.ai_credits_reset_at is None:
        workspace.ai_credits_reset_at = _next_billing_anchor(workspace, now)
        fields_to_update.append("ai_credits_reset_at")

    if workspace.ai_credits_remaining is None:
        workspace.ai_credits_remaining = monthly_pool
        fields_to_update.append("ai_credits_remaining")

    should_reset = force_reset or (
        workspace.ai_credits_reset_at is not None and now >= workspace.ai_credits_reset_at
    )
    if should_reset:
        workspace.ai_credits_monthly = monthly_pool
        workspace.ai_credits_remaining = monthly_pool
        workspace.ai_credits_overage_used_monthly = 0
        workspace.ai_credits_reset_at = _roll_forward_reset_at(
            workspace.ai_credits_reset_at or (now + timedelta(days=30)),
            now,
        )
        for field in (
            "ai_credits_monthly",
            "ai_credits_remaining",
            "ai_credits_overage_used_monthly",
            "ai_credits_reset_at",
        ):
            if field not in fields_to_update:
                fields_to_update.append(field)

    if fields_to_update:
        workspace.save(update_fields=fields_to_update)

    return workspace


def get_available_non_overage_credits(workspace: Workspace) -> int:
    return max(int(workspace.ai_credits_remaining or 0), 0) + max(
        int(workspace.ai_credits_purchased_pack_remaining or 0),
        0,
    )


def _enforce_team_soft_throttle(workspace: Workspace, user_id, now):
    if get_workspace_plan(workspace) != PLAN_TEAM:
        return

    window_start = now - timedelta(days=7)
    consumed = (
        WorkspaceCreditConsumption.objects.filter(
            workspace=workspace,
            user_id=user_id,
            consumed_at__gte=window_start,
        ).aggregate(total=Sum("credits_used"))["total"]
        or 0
    )

    team_pool = max(int(workspace.ai_credits_monthly or 0), 1)
    max_allowed = Decimal(team_pool) * TEAM_USER_SOFT_THROTTLE_RATIO
    if Decimal(consumed + 1) > max_allowed:
        raise TeamSoftThrottleError(
            "You have used 40% of the team pool. Contact your admin to override."
        )


def claim_ai_credit(*, workspace_id, user_id, evaluation_run_id=None, now=None):
    now = now or timezone.now()

    with transaction.atomic():
        workspace = (
            Workspace.all_objects.select_related("owner")
            .select_for_update()
            .get(id=workspace_id)
        )
        workspace = ensure_workspace_credit_state(workspace, now=now)

        _enforce_team_soft_throttle(workspace, user_id, now)

        source = None
        if int(workspace.ai_credits_remaining or 0) > 0:
            workspace.ai_credits_remaining = int(workspace.ai_credits_remaining or 0) - 1
            source = WorkspaceCreditConsumption.Source.MONTHLY_POOL
            workspace.save(update_fields=["ai_credits_remaining", "updated_at"])
        elif int(workspace.ai_credits_purchased_pack_remaining or 0) > 0:
            workspace.ai_credits_purchased_pack_remaining = (
                int(workspace.ai_credits_purchased_pack_remaining or 0) - 1
            )
            source = WorkspaceCreditConsumption.Source.PURCHASED_PACK
            workspace.save(update_fields=["ai_credits_purchased_pack_remaining", "updated_at"])
        elif workspace.overage_enabled:
            workspace.ai_credits_overage_used_monthly = int(
                workspace.ai_credits_overage_used_monthly or 0
            ) + 1
            source = WorkspaceCreditConsumption.Source.OVERAGE
            workspace.save(update_fields=["ai_credits_overage_used_monthly", "updated_at"])
        else:
            raise CreditExhaustedError("AI credits exhausted for this workspace.")

        WorkspaceCreditConsumption.objects.create(
            workspace=workspace,
            user_id=user_id,
            evaluation_run_id=evaluation_run_id,
            source=source,
            credits_used=1,
        )

        return {
            "source": source,
            "credits_remaining": get_available_non_overage_credits(workspace),
            "workspace_plan": get_workspace_plan(workspace).lower(),
        }
