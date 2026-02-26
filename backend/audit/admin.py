from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "workspace", "scope", "category", "action", "status", "actor")
    list_filter = ("scope", "status", "category", "created_at")
    search_fields = ("action", "target_name", "message", "actor__email", "actor__full_name")
