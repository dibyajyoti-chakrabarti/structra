# Generated manually on 2026-03-06

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workspaces', '0007_workspace_credit_accounting_and_archival'),
    ]

    operations = [
        migrations.AddField(
            model_name='workspace',
            name='daily_insight_tokens',
            field=models.IntegerField(default=3),
        ),
        migrations.AddField(
            model_name='workspace',
            name='insight_tokens_remaining',
            field=models.IntegerField(default=3),
        ),
        migrations.AddField(
            model_name='workspace',
            name='last_token_reset_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='evaluationrun',
            name='insight_token_consumed',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='evaluationrun',
            name='insight_tokens_remaining',
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
