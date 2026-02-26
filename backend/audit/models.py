import uuid

from django.conf import settings
from django.db import models


class AuditScope(models.TextChoices):
    WORKSPACE = "workspace", "Workspace"
    SYSTEM = "system", "System"


class AuditStatus(models.TextChoices):
    SUCCESS = "success", "Success"
    WARNING = "warning", "Warning"
    ERROR = "error", "Error"


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "workspaces.Workspace",
        on_delete=models.CASCADE,
        related_name="audit_logs",
    )
    system = models.ForeignKey(
        "canvases.Canvas",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    scope = models.CharField(
        max_length=20,
        choices=AuditScope.choices,
        default=AuditScope.WORKSPACE,
    )
    category = models.CharField(max_length=50, default="general")
    action = models.CharField(max_length=120)
    target_name = models.CharField(max_length=255, blank=True)
    target_id = models.CharField(max_length=64, blank=True)
    message = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=AuditStatus.choices,
        default=AuditStatus.SUCCESS,
    )
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["workspace", "scope", "created_at"]),
            models.Index(fields=["workspace", "system", "created_at"]),
            models.Index(fields=["workspace", "status", "created_at"]),
            models.Index(fields=["workspace", "category", "created_at"]),
            models.Index(fields=["workspace", "actor", "created_at"]),
        ]

    def __str__(self):
        return f"{self.action} ({self.scope})"
