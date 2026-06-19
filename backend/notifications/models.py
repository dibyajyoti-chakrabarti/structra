from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from audit.models import AuditLog
from workspaces.models import Workspace
from systems.models import Canvas
from core.constants import InvitationStatus, NotificationType, WorkspaceRole
import secrets

class Invitation(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='invitations_received'
    )
    email = models.EmailField()
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='invitations'
    )
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='invitations_sent'
    )
    token = models.CharField(max_length=64, unique=True, editable=False)
    status = models.CharField(
        max_length=20,
        choices=InvitationStatus.CHOICES,
        default=InvitationStatus.PENDING
    )
    role = models.CharField(
        max_length=10,
        choices=WorkspaceRole.choices,
        default=WorkspaceRole.MEMBER,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def save(self, *args, **kwargs):
        if not self.token:
            token = secrets.token_urlsafe(32)
            while Invitation.objects.filter(token=token).exists():
                token = secrets.token_urlsafe(32)
            self.token = token
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=48)
        super().save(*args, **kwargs)

    class Meta:
        db_table = 'invitations'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['token']),
            models.Index(fields=['workspace']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['workspace', 'email'],
                condition=models.Q(status=InvitationStatus.PENDING),
                name='unique_pending_invite'
            )
        ]

    def __str__(self):
        return f"Invite to {self.email} for {self.workspace.name}"


class Notification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    type = models.CharField(
        max_length=50,
        choices=NotificationType.CHOICES
    )
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )
    system = models.ForeignKey(
        Canvas,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )
    triggered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='triggered_notifications'
    )
    message = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    is_dismissed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=30)
        super().save(*args, **kwargs)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_dismissed', 'created_at']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"{self.type} for {self.user.email}"


class AuditNotificationState(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="audit_notification_states",
    )
    audit_log = models.ForeignKey(
        AuditLog,
        on_delete=models.CASCADE,
        related_name="read_states",
    )
    read_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "audit_notification_states"
        unique_together = ("user", "audit_log")
        indexes = [
            models.Index(fields=["user", "read_at"]),
            models.Index(fields=["user", "audit_log"]),
        ]

    def __str__(self):
        return f"{self.user.email} read {self.audit_log_id}"
