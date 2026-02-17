from .models import WorkspaceMember
from core.constants import WorkspaceRole


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
