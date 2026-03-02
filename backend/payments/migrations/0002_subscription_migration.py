from django.db import migrations, models


def forwards_status_success_to_active(apps, schema_editor):
    PaymentTransaction = apps.get_model('payments', 'PaymentTransaction')
    PaymentTransaction.objects.filter(status='success').update(status='active')


def backwards_status_active_to_success(apps, schema_editor):
    PaymentTransaction = apps.get_model('payments', 'PaymentTransaction')
    PaymentTransaction.objects.filter(status='active').update(status='success')


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0001_initial'),
    ]

    operations = [
        migrations.RenameField(
            model_name='paymenttransaction',
            old_name='razorpay_order_id',
            new_name='razorpay_subscription_id',
        ),
        migrations.RunPython(
            forwards_status_success_to_active,
            backwards_status_active_to_success,
        ),
        migrations.AlterField(
            model_name='paymenttransaction',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('active', 'Active'),
                    ('failed', 'Failed'),
                    ('cancelled', 'Cancelled'),
                ],
                default='pending',
                max_length=20,
            ),
        ),
    ]
