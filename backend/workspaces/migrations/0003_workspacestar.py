from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("workspaces", "0002_workspace_hybrid_search_indexes"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="WorkspaceStar",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="workspace_stars",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "workspace",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="stars",
                        to="workspaces.workspace",
                    ),
                ),
            ],
            options={
                "db_table": "workspace_stars",
                "unique_together": {("workspace", "user")},
            },
        ),
        migrations.AddIndex(
            model_name="workspacestar",
            index=models.Index(fields=["user", "created_at"], name="workspace_s_user_id_833830_idx"),
        ),
        migrations.AddIndex(
            model_name="workspacestar",
            index=models.Index(fields=["workspace", "user"], name="workspace_s_workspa_96cce4_idx"),
        ),
    ]
