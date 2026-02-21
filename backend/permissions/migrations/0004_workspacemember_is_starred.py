from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("permissions", "0003_workspacemember_role"),
    ]

    operations = [
        migrations.AddField(
            model_name="workspacemember",
            name="is_starred",
            field=models.BooleanField(default=False),
        ),
    ]
