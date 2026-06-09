from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workspaces', '0008_workspace_insight_tokens_and_evaluationrun_tokens'),
    ]

    operations = [
        migrations.RenameField(
            model_name='evaluationrun',
            old_name='gemini_error',
            new_name='ai_error',
        ),
        migrations.AddField(
            model_name='evaluationrun',
            name='cloud_analysis',
            field=models.TextField(blank=True, default=''),
        ),
    ]
