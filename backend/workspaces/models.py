from django.db import models
from django.conf import settings
import uuid
from core.constants import WorkspaceVisibility
from core.utils import generate_alphanumeric_id


class ActiveWorkspaceQuerySet(models.QuerySet):
    def active(self):
        return self.filter(archived_at__isnull=True)


class ActiveWorkspaceManager(models.Manager):
    def get_queryset(self):
        return ActiveWorkspaceQuerySet(self.model, using=self._db).active()


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
    ai_credits_purchased_pack_remaining = models.IntegerField(default=0)
    ai_credits_overage_used_monthly = models.IntegerField(default=0)
    overage_enabled = models.BooleanField(default=False)
    daily_insight_tokens = models.IntegerField(default=3)
    insight_tokens_remaining = models.IntegerField(default=3)
    last_token_reset_date = models.DateField(null=True, blank=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    archive_recover_until = models.DateTimeField(null=True, blank=True)
    archive_reason = models.CharField(max_length=100, blank=True, default="")

    objects = ActiveWorkspaceManager()
    all_objects = models.Manager()

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        previous_visibility = None
        if not is_new:
            previous_visibility = (
                Workspace.all_objects.filter(pk=self.pk)
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
            from systems.models import Canvas

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
    insight_token_consumed = models.BooleanField(default=False)
    insight_tokens_remaining = models.IntegerField(null=True, blank=True)
    ai_error = models.BooleanField(default=False)
    cloud_analysis = models.TextField(blank=True, default='')
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
            models.Index(fields=["workspace", "created_at"], name="evalrun_workspace_created_idx"),
        ]


class WorkspaceCreditConsumption(models.Model):
    class Source(models.TextChoices):
        MONTHLY_POOL = "MONTHLY_POOL", "Monthly Pool"
        PURCHASED_PACK = "PURCHASED_PACK", "Purchased Pack"
        OVERAGE = "OVERAGE", "Overage"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="credit_consumptions",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="workspace_credit_consumptions",
    )
    evaluation_run = models.ForeignKey(
        "workspaces.EvaluationRun",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="credit_consumptions",
    )
    source = models.CharField(max_length=20, choices=Source.choices)
    credits_used = models.PositiveIntegerField(default=1)
    consumed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "workspace_credit_consumptions"
        indexes = [
            models.Index(fields=["workspace", "-consumed_at"], name="workspace_c_workspa_15d3d8_idx"),
            models.Index(fields=["workspace", "consumed_at"], name="workspace_c_workspa_087f39_idx"),
            models.Index(fields=["workspace", "user", "-consumed_at"], name="workspace_c_workspa_98baf7_idx"),
            models.Index(fields=["source", "-consumed_at"], name="workspace_c_source_550f76_idx"),
        ]
