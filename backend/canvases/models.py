from django.db import models
from django.conf import settings
from workspaces.models import Workspace
from core.utils import generate_alphanumeric_id


def default_canvas_state():
    return {
        "nodes": [],
        "edges": [],
        "viewport": {
            "zoom": 1,
            "pan": {"x": 0, "y": 0},
        },
    }

class Canvas(models.Model):
    id = models.CharField(max_length=8, primary_key=True, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='systems'
    )
    canvas_state = models.JSONField(default=default_canvas_state, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_modified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='modified_canvases'
    )

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = generate_alphanumeric_id()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.workspace.name})"

    class Meta:
        db_table = 'systems'
        ordering = ['-updated_at']
        verbose_name_plural = 'Systems'
        constraints = [
            models.UniqueConstraint(
                fields=['workspace', 'name'],
                name='unique_canvas_per_workspace'
            )
        ]
