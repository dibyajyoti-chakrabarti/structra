from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0012_user_cognito_sub'),
    ]

    operations = [
        migrations.DeleteModel(
            name='EmailOTP',
        ),
    ]
