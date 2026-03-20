from django.contrib import admin

from .models import PaymentTransaction, WebhookEventLog


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'plan_name',
        'requested_seats',
        'amount',
        'status',
        'razorpay_subscription_id',
        'created_at',
    )
    list_select_related = ('user',)
    raw_id_fields = ('user',)
    search_fields = (
        'id',
        'user__email',
        'user__username',
        'plan_name',
        'razorpay_subscription_id',
        'razorpay_payment_id',
    )
    list_filter = ('plan_name', 'status', 'created_at')
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'
    readonly_fields = ('id', 'created_at', 'updated_at')


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
    search_fields = ("id", "razorpay_event_id", "event_type", "subscription_id", "last_error")
    list_filter = ("event_type", "status", "created_at")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    readonly_fields = ("id", "created_at", "updated_at")
