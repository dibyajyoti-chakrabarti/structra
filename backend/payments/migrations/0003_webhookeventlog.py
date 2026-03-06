import uuid

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0002_subscription_migration"),
    ]

    operations = [
        migrations.CreateModel(
            name="WebhookEventLog",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("razorpay_event_id", models.CharField(max_length=255, unique=True)),
                ("event_type", models.CharField(max_length=120)),
                ("subscription_id", models.CharField(blank=True, max_length=255, null=True)),
                (
                    "status",
                    models.CharField(
                        choices=[("processing", "Processing"), ("succeeded", "Succeeded"), ("failed", "Failed")],
                        default="processing",
                        max_length=20,
                    ),
                ),
                ("processed_at", models.DateTimeField(blank=True, null=True)),
                ("last_error", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "payment_webhook_event_logs",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="webhookeventlog",
            index=models.Index(fields=["event_type", "created_at"], name="pay_wh_event_type_idx"),
        ),
        migrations.AddIndex(
            model_name="webhookeventlog",
            index=models.Index(fields=["status", "created_at"], name="pay_wh_status_idx"),
        ),
    ]
