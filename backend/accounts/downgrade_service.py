from __future__ import annotations

from datetime import timedelta

from django.utils import timezone
from rest_framework.exceptions import ValidationError

from canvases.models import Canvas
from core.constants import WorkspaceRole
from core.pricing import PLAN_CORE, PLAN_INDIVIDUAL, normalize_plan
from permissions.models import WorkspaceMember
from workspaces.models import Workspace

ARCHIVE_RECOVERY_WINDOW_DAYS = 30
CORE_SYSTEM_LIMIT = 3


def _archive_workspace(workspace, *, reason, now):
    workspace.archived_at = now
    workspace.archive_recover_until = now + timedelta(days=ARCHIVE_RECOVERY_WINDOW_DAYS)
    workspace.archive_reason = reason
    workspace.save(update_fields=["archived_at", "archive_recover_until", "archive_reason", "updated_at"])

    Canvas.objects.filter(workspace=workspace).update(
        archived_at=now,
        archive_recover_until=now + timedelta(days=ARCHIVE_RECOVERY_WINDOW_DAYS),
        archive_reason=reason,
    )


def _archive_system(system, *, reason, now):
    system.archived_at = now
    system.archive_recover_until = now + timedelta(days=ARCHIVE_RECOVERY_WINDOW_DAYS)
    system.archive_reason = reason
    system.save(update_fields=["archived_at", "archive_recover_until", "archive_reason", "updated_at"])


def validate_voluntary_downgrade_or_400(*, user, target_plan):
    normalized_target = normalize_plan(target_plan)
    if normalized_target not in {PLAN_INDIVIDUAL, PLAN_CORE}:
        return

    active_workspaces = Workspace.objects.filter(owner=user).order_by("-updated_at")

    if normalized_target == PLAN_INDIVIDUAL:
        violating = []
        for workspace in active_workspaces:
            invited_count = WorkspaceMember.objects.filter(
                workspace=workspace,
                role=WorkspaceRole.MEMBER,
            ).count()
            if invited_count > 3:
                violating.append({
                    "workspace_id": workspace.id,
                    "invited_members": invited_count,
                })

        if violating:
            raise ValidationError(
                {
                    "error": "Downgrade to Individual blocked. Reduce invited members to at most 3 per workspace.",
                    "violations": violating,
                }
            )

    if normalized_target == PLAN_CORE:
        if active_workspaces.count() != 1:
            raise ValidationError(
                {
                    "error": "Downgrade to Core blocked. You must keep exactly one active workspace.",
                    "active_workspace_count": active_workspaces.count(),
                }
            )

        workspace = active_workspaces.first()
        invited_count = WorkspaceMember.objects.filter(
            workspace=workspace,
            role=WorkspaceRole.MEMBER,
        ).count()
        if invited_count > 0:
            raise ValidationError(
                {
                    "error": "Downgrade to Core blocked. Remove all invited members first.",
                    "workspace_id": workspace.id,
                    "invited_members": invited_count,
                }
            )


def enforce_expired_plan_constraints(*, user):
    now = timezone.now()

    active_workspaces = list(Workspace.objects.filter(owner=user).order_by("-updated_at"))
    if not active_workspaces:
        if user.current_plan != user.CurrentPlan.CORE:
            user.current_plan = user.CurrentPlan.CORE
            user.save(update_fields=["current_plan"])
        return {"archived_workspaces": 0, "archived_systems": 0, "vacated_memberships": 0}

    keep_workspace = active_workspaces[0]
    archived_workspace_count = 0
    archived_system_count = 0

    for workspace in active_workspaces[1:]:
        _archive_workspace(
            workspace,
            reason="plan_expiry_core_enforcement",
            now=now,
        )
        archived_workspace_count += 1

    vacated_memberships = WorkspaceMember.objects.filter(
        workspace=keep_workspace,
        role=WorkspaceRole.MEMBER,
    ).update(left_at=now)

    systems_to_archive = list(
        Canvas.objects.filter(workspace=keep_workspace)
        .order_by("-updated_at")[CORE_SYSTEM_LIMIT:]
    )
    for system in systems_to_archive:
        _archive_system(
            system,
            reason="plan_expiry_core_enforcement",
            now=now,
        )
        archived_system_count += 1

    if user.current_plan != user.CurrentPlan.CORE:
        user.current_plan = user.CurrentPlan.CORE
        user.save(update_fields=["current_plan"])

    return {
        "archived_workspaces": archived_workspace_count,
        "archived_systems": archived_system_count,
        "vacated_memberships": vacated_memberships,
    }
