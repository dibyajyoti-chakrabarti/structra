from django.contrib import admin

from .models import PaymentTransaction


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'plan_name',
        'amount',
        'status',
        'razorpay_order_id',
        'created_at',
    )
    search_fields = ('user__email', 'user__username', 'plan_name', 'razorpay_order_id')
    list_filter = ('plan_name', 'status')
