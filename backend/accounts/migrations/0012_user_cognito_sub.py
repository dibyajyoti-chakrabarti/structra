from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0011_user_purchased_team_seats'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='cognito_sub',
            field=models.CharField(blank=True, db_index=True, max_length=128, null=True, unique=True),
        ),
    ]
