from .models import WorkspaceMember
from core.constants import WorkspaceRole
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


def user_has_system_access(system, user, allowed_roles=None):
    query = CanvasPermission.objects.filter(system=system, user=user)
    if allowed_roles:
        query = query.filter(role__in=allowed_roles)
    return query.exists()
