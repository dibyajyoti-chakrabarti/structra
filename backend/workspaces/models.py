from django.db import models
from django.conf import settings
import uuid
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
    ai_credits_remaining = models.IntegerField(default=5)
    ai_credits_reset_at = models.DateTimeField(null=True, blank=True)
    ai_credits_monthly = models.IntegerField(default=5)

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


class WorkspaceStar(models.Model):
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='stars',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='workspace_stars',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'workspace_stars'
        unique_together = ('workspace', 'user')
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['workspace', 'user']),
        ]


class EvaluationLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='evaluation_logs',
    )
    system_id = models.CharField(max_length=8)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='evaluation_logs',
    )
    evaluated_at = models.DateTimeField(auto_now_add=True)
    workspace_tier = models.CharField(max_length=20)
    score = models.IntegerField()
    rules_evaluated = models.IntegerField()
    rules_passed = models.IntegerField()
    credit_consumed = models.BooleanField(default=True)

    class Meta:
        db_table = 'evaluation_log'
        indexes = [
            models.Index(fields=['workspace', '-evaluated_at']),
            models.Index(fields=['user', '-evaluated_at']),
        ]


class EvaluationRun(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        RUNNING = 'running', 'Running'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='evaluation_runs',
    )
    system_id = models.CharField(max_length=8)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='evaluation_runs',
    )
    workspace_tier = models.CharField(max_length=20, default='core')
    canvas_state = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    score = models.IntegerField(null=True, blank=True)
    summary = models.JSONField(default=dict, blank=True)
    results = models.JSONField(default=list, blank=True)
    suggestions = models.TextField(null=True, blank=True)
    credits_exhausted = models.BooleanField(default=False)
    credits_remaining = models.IntegerField(null=True, blank=True)
    gemini_error = models.BooleanField(default=False)
    error_message = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'evaluation_runs'
        indexes = [
            models.Index(fields=['workspace', '-created_at']),
            models.Index(fields=['workspace', 'status']),
            models.Index(fields=['user', '-created_at']),
        ]
