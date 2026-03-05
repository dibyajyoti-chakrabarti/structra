from django.contrib import admin

from .models import PaymentTransaction, WebhookEventLog


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'plan_name',
        'amount',
        'status',
        'razorpay_subscription_id',
        'created_at',
    )
    search_fields = ('user__email', 'user__username', 'plan_name', 'razorpay_subscription_id')
    list_filter = ('plan_name', 'status')


@admin.register(WebhookEventLog)
class WebhookEventLogAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "razorpay_event_id",
        "event_type",
        "subscription_id",
        "status",
        "processed_at",
        "created_at",
    )
    search_fields = ("razorpay_event_id", "event_type", "subscription_id")
    list_filter = ("event_type", "status")
