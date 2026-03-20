from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "workspace", "system", "scope", "category", "action", "status", "actor")
    list_select_related = ("workspace", "system", "actor")
    raw_id_fields = ("workspace", "system", "actor")
    list_filter = ("scope", "status", "category", "created_at")
    search_fields = (
        "id",
        "action",
        "target_name",
        "target_id",
        "message",
        "workspace__id",
        "workspace__name",
        "system__id",
        "system__name",
        "actor__email",
        "actor__full_name",
    )
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    readonly_fields = ("id", "created_at")
