from django.db.models import Q
from .models import WorkspaceMember
from core.constants import CanvasRole, WorkspaceRole, WorkspaceVisibility
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
        Q(workspace__members__user=user, workspace__members__role=WorkspaceRole.ADMIN)
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
