from django.db.models import Q
from .models import WorkspaceMember
from core.constants import CanvasRole, WorkspaceRole, WorkspaceVisibility
from core.pricing import (
    PLAN_CORE,
    can_workspace_plan_invite_members,
    get_member_limit_for_workspace_plan,
    get_system_limit_for_workspace_plan,
    normalize_plan,
)
from .models import CanvasPermission


def get_workspace_membership(workspace, user):
    return WorkspaceMember.objects.filter(workspace=workspace, user=user).first()


def user_is_workspace_member(workspace, user):
    return WorkspaceMember.objects.filter(workspace=workspace, user=user).exists()


def user_is_workspace_admin(workspace, user):
    return WorkspaceMember.objects.filter(
        workspace=workspace,
        user=user,
        role=WorkspaceRole.ADMIN,
    ).exists()


def get_workspace_admin_plan(workspace):
    owner = getattr(workspace, "owner", None)
    return normalize_plan(getattr(owner, "current_plan", PLAN_CORE))


def check_workspace_entitlement(*, user_id, workspace_id, feature):
    membership = (
        WorkspaceMember.objects.filter(workspace_id=workspace_id, user_id=user_id)
        .values(
            "role",
            "workspace__owner__current_plan",
            "workspace__visibility",
        )
        .first()
    )
    if not membership:
        return {
            "allowed": False,
            "reason": "User is not a member of this workspace.",
            "plan": PLAN_CORE,
            "role": None,
        }

    workspace_plan = normalize_plan(membership["workspace__owner__current_plan"])
    role = membership["role"]

    if role == WorkspaceRole.ADMIN:
        if feature == "invite_member":
            return {
                "allowed": can_workspace_plan_invite_members(workspace_plan),
                "reason": "Core workspaces cannot invite members."
                if not can_workspace_plan_invite_members(workspace_plan)
                else None,
                "plan": workspace_plan,
                "role": role,
                "member_limit": get_member_limit_for_workspace_plan(workspace_plan),
            }
        if feature == "create_system":
            return {
                "allowed": True,
                "reason": None,
                "plan": workspace_plan,
                "role": role,
                "system_limit": get_system_limit_for_workspace_plan(workspace_plan),
            }

    if feature == "read_workspace":
        return {
            "allowed": True,
            "reason": None,
            "plan": workspace_plan,
            "role": role,
        }

    return {
        "allowed": False,
        "reason": "Action allowed only for workspace admins.",
        "plan": workspace_plan,
        "role": role,
    }


def get_system_permission(system, user):
    return CanvasPermission.objects.filter(system=system, user=user).first()


def user_has_system_read_access(system, user):
    if not user or user.is_anonymous:
        return system.visibility == WorkspaceVisibility.PUBLIC

    if system.visibility == WorkspaceVisibility.PUBLIC:
        return True

    if user_is_workspace_admin(system.workspace, user):
        return True

    return CanvasPermission.objects.filter(system=system, user=user).exists()


def system_read_access_q(user):
    if not user or user.is_anonymous:
        return Q(visibility=WorkspaceVisibility.PUBLIC)

    return (
        Q(visibility=WorkspaceVisibility.PUBLIC) |
        Q(permissions__user=user) |
        Q(
            workspace__members__user=user,
            workspace__members__role=WorkspaceRole.ADMIN,
            workspace__members__left_at__isnull=True,
        )
    )


def user_has_system_access(system, user, allowed_roles=None):
    if allowed_roles:
        if user_is_workspace_admin(system.workspace, user):
            return True
        return CanvasPermission.objects.filter(
            system=system,
            user=user,
            role__in=allowed_roles,
        ).exists()

    return user_has_system_read_access(system, user)


def resolve_canvas_role(system, user):
    if not user or user.is_anonymous:
        return None

    if user_is_workspace_admin(system.workspace, user):
        return CanvasRole.EDITOR

    direct_permission = CanvasPermission.objects.filter(
        system=system,
        user=user,
    ).values_list("role", flat=True).first()
    if direct_permission:
        return direct_permission

    if system.visibility == WorkspaceVisibility.PUBLIC:
        return CanvasRole.VIEWER

    return None
