import uuid

from django.conf import settings
from django.db import models


class PaymentTransaction(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACTIVE = 'active', 'Active'
        FAILED = 'failed', 'Failed'
        CANCELLED = 'cancelled', 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payment_transactions',
    )
    plan_name = models.CharField(max_length=50, db_index=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    razorpay_subscription_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    razorpay_payment_id = models.CharField(max_length=255, null=True, blank=True)
    razorpay_signature = models.CharField(max_length=512, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payment_transactions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f'{self.user_id}:{self.plan_name}:{self.status}'


class WebhookEventLog(models.Model):
    class Status(models.TextChoices):
        PROCESSING = "processing", "Processing"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    razorpay_event_id = models.CharField(max_length=255, unique=True)
    event_type = models.CharField(max_length=120)
    subscription_id = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PROCESSING,
    )
    processed_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payment_webhook_event_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["event_type", "created_at"],
                name="pay_wh_event_type_idx",
            ),
            models.Index(
                fields=["status", "created_at"],
                name="pay_wh_status_idx",
            ),
        ]

    def __str__(self):
        return f"{self.razorpay_event_id}:{self.event_type}:{self.status}"
