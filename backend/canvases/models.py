from django.conf import settings
from django.db import models
from django.utils import timezone
import uuid

from core.constants import WorkspaceVisibility
from core.utils import generate_alphanumeric_id
from workspaces.models import Workspace


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
    class ActiveCanvasManager(models.Manager):
        def get_queryset(self):
            return super().get_queryset().filter(archived_at__isnull=True)

    id = models.CharField(max_length=8, primary_key=True, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    visibility = models.CharField(
        max_length=20,
        choices=WorkspaceVisibility.CHOICES,
        default=WorkspaceVisibility.PRIVATE,
    )
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='systems'
    )
    canvas_state = models.JSONField(default=default_canvas_state, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    archive_recover_until = models.DateTimeField(null=True, blank=True)
    archive_reason = models.CharField(max_length=100, blank=True, default="")
    last_modified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='modified_canvases'
    )

    objects = ActiveCanvasManager()
    all_objects = models.Manager()

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
        indexes = [
            models.Index(fields=["workspace", "archived_at"], name="systems_workspace_archived_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['workspace', 'name'],
                name='unique_canvas_per_workspace'
            )
        ]


class CanvasComment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    system = models.ForeignKey(
        Canvas,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="canvas_comments",
    )
    body = models.TextField()
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="replies",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "system_comments"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["system", "created_at"]),
            models.Index(fields=["parent"]),
        ]

    def __str__(self):
        return f"Comment by {self.author_id} on {self.system_id}"


class EvaluationQueueJob(models.Model):
    class Status(models.TextChoices):
        QUEUED = 'queued', 'Queued'
        PROCESSING = 'processing', 'Processing'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    run = models.OneToOneField(
        'workspaces.EvaluationRun',
        on_delete=models.CASCADE,
        related_name='queue_job',
    )
    payload = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.QUEUED)
    attempt_count = models.PositiveIntegerField(default=0)
    available_at = models.DateTimeField(default=timezone.now)
    locked_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'evaluation_queue_jobs'
        indexes = [
            models.Index(fields=['status', 'available_at'], name='evalqueue_status_available_idx'),
            models.Index(fields=['created_at'], name='evalqueue_created_idx'),
        ]

    def __str__(self):
        return f"Evaluation queue job for run {self.run_id}"
