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
        is_new = self._state.adding
        previous_visibility = None
        if not is_new:
            previous_visibility = (
                Workspace.objects.filter(pk=self.pk)
                .values_list("visibility", flat=True)
                .first()
            )

        if not self.id:
            self.id = generate_alphanumeric_id()
        super().save(*args, **kwargs)

        if (
            not is_new
            and previous_visibility == WorkspaceVisibility.PUBLIC
            and self.visibility == WorkspaceVisibility.PRIVATE
        ):
            from canvases.models import Canvas

            Canvas.objects.filter(
                workspace=self,
                visibility=WorkspaceVisibility.PUBLIC,
            ).update(visibility=WorkspaceVisibility.PRIVATE)

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
