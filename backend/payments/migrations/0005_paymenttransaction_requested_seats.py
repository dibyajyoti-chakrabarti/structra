from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0003_webhookeventlog"),
    ]

    operations = [
        migrations.AddField(
            model_name="paymenttransaction",
            name="requested_seats",
            field=models.IntegerField(default=1),
        ),
    ]
