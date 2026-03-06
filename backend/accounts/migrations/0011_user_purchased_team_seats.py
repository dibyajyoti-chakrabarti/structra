from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0010_remove_user_pricing"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="purchased_team_seats",
            field=models.IntegerField(default=1),
        ),
    ]
