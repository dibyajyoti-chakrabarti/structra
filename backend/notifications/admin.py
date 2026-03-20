from django.contrib import admin

from .models import AuditNotificationState, Invitation, Notification


@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "email",
        "workspace",
        "user",
        "invited_by",
        "role",
        "status",
        "expires_at",
        "created_at",
    )
    list_select_related = ("workspace", "user", "invited_by")
    raw_id_fields = ("workspace", "user", "invited_by")
    search_fields = (
        "id",
        "email",
        "workspace__id",
        "workspace__name",
        "user__email",
        "invited_by__email",
        "token",
    )
    list_filter = ("status", "role", "created_at", "expires_at")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    readonly_fields = ("id", "token", "created_at")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "type",
        "workspace",
        "system",
        "triggered_by",
        "is_read",
        "is_dismissed",
        "created_at",
        "expires_at",
    )
    list_select_related = ("user", "workspace", "system", "triggered_by")
    raw_id_fields = ("user", "workspace", "system", "triggered_by")
    search_fields = (
        "id",
        "user__email",
        "user__username",
        "workspace__id",
        "workspace__name",
        "system__id",
        "system__name",
        "triggered_by__email",
        "message",
    )
    list_filter = ("type", "is_read", "is_dismissed", "created_at", "expires_at")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    readonly_fields = ("id", "created_at")


@admin.register(AuditNotificationState)
class AuditNotificationStateAdmin(admin.ModelAdmin):
    list_display = ("user", "audit_log", "read_at")
    list_select_related = ("user", "audit_log")
    raw_id_fields = ("user", "audit_log")
    search_fields = (
        "user__email",
        "user__username",
        "audit_log__id",
        "audit_log__action",
        "audit_log__workspace__name",
    )
    list_filter = ("read_at",)
    ordering = ("-read_at",)
    date_hierarchy = "read_at"
    readonly_fields = ("read_at",)
