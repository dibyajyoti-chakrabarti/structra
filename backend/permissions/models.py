from django.db import models
from django.conf import settings
from workspaces.models import Workspace
from canvases.models import Canvas
from core.constants import CanvasRole

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
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'workspace_members'
        unique_together = ('workspace', 'user')
        indexes = [
            models.Index(fields=['workspace', 'user']),
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