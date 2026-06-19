import django.db.models.deletion
import django.utils.timezone
import uuid

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workspaces', '0008_workspace_insight_tokens_and_evaluationrun_tokens'),
        ('canvases', '0007_canvas_archival'),
    ]

    operations = [
        migrations.CreateModel(
            name='EvaluationQueueJob',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('payload', models.JSONField(blank=True, default=dict)),
                ('status', models.CharField(choices=[('queued', 'Queued'), ('processing', 'Processing'), ('completed', 'Completed'), ('failed', 'Failed')], default='queued', max_length=20)),
                ('attempt_count', models.PositiveIntegerField(default=0)),
                ('available_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('locked_at', models.DateTimeField(blank=True, null=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('last_error', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('run', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='queue_job', to='workspaces.evaluationrun')),
            ],
            options={
                'db_table': 'evaluation_queue_jobs',
            },
        ),
        migrations.AddIndex(
            model_name='evaluationqueuejob',
            index=models.Index(fields=['status', 'available_at'], name='evalqueue_status_available_idx'),
        ),
        migrations.AddIndex(
            model_name='evaluationqueuejob',
            index=models.Index(fields=['created_at'], name='evalqueue_created_idx'),
        ),
    ]
