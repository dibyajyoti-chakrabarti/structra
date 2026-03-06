from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0004_rename_payment_webh_event_t_6f57ab_idx_pay_wh_event_type_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="paymenttransaction",
            name="requested_seats",
            field=models.IntegerField(default=1),
        ),
    ]
