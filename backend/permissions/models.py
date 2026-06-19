from django.db import models
from django.conf import settings
from workspaces.models import Workspace
from systems.models import Canvas
from core.constants import CanvasRole, WorkspaceRole


class ActiveWorkspaceMemberManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(left_at__isnull=True)


class WorkspaceMember(models.Model):
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='members'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='workspace_memberships'
    )
    role = models.CharField(
        max_length=10,
        choices=WorkspaceRole.choices,
        default=WorkspaceRole.MEMBER,
    )
    is_starred = models.BooleanField(default=False)
    added_at = models.DateTimeField(auto_now_add=True)
    joined_at = models.DateTimeField(null=True, blank=True)
    left_at = models.DateTimeField(null=True, blank=True)

    objects = ActiveWorkspaceMemberManager()
    all_objects = models.Manager()

    class Meta:
        db_table = 'workspace_members'
        indexes = [
            models.Index(fields=['workspace', 'user']),
            models.Index(fields=['workspace', 'left_at'], name="workspace_m_workspa_07c817_idx"),
            models.Index(fields=['workspace', 'role', 'left_at'], name="workspace_m_workspa_4bde2a_idx"),
            models.Index(fields=['workspace', 'joined_at'], name="workspace_m_workspa_2a84d8_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "user"],
                condition=models.Q(left_at__isnull=True),
                name="uq_workspace_member_active_only",
            ),
        ]

    def __str__(self):
        return f"{self.user.email} in {self.workspace.name}"


class CanvasPermission(models.Model):
    system = models.ForeignKey(
        Canvas,
        on_delete=models.CASCADE,
        related_name='permissions'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='system_permissions'
    )
    role = models.CharField(
        max_length=20,
        choices=CanvasRole.CHOICES
    )
    granted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'system_permissions'
        unique_together = ('system', 'user')
        indexes = [
            models.Index(fields=['system', 'user']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.role} on {self.system.name}"
