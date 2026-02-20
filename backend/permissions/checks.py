from django.db.models import Q
from .models import WorkspaceMember
from core.constants import WorkspaceRole, WorkspaceVisibility
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
    if system.visibility == WorkspaceVisibility.PUBLIC:
        return True

    if WorkspaceMember.objects.filter(workspace=system.workspace, user=user).exists():
        return True

    return CanvasPermission.objects.filter(system=system, user=user).exists()


def system_read_access_q(user):
    return (
        Q(visibility=WorkspaceVisibility.PUBLIC) |
        Q(permissions__user=user) |
        Q(workspace__members__user=user)
    )


def user_has_system_access(system, user, allowed_roles=None):
    if allowed_roles:
        return CanvasPermission.objects.filter(
            system=system,
            user=user,
            role__in=allowed_roles,
        ).exists()

    return user_has_system_read_access(system, user)
