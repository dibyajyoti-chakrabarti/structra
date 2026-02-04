from django.db import models
from django.conf import settings
from core.constants import WorkspaceVisibility
from core.utils import generate_alphanumeric_id

class Workspace(models.Model):
    id = models.CharField(max_length=8, primary_key=True, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    visibility = models.CharField(
        max_length=20,
        choices=WorkspaceVisibility.CHOICES,
        default=WorkspaceVisibility.PRIVATE
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='owned_workspaces'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = generate_alphanumeric_id()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'workspaces'
        ordering = ['-created_at']
        constraints = [
        models.UniqueConstraint(
            fields=['owner', 'name'],
            name='unique_workspace_per_owner'
        )
    ]