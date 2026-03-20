from django.contrib import admin

from .models import CanvasPermission, WorkspaceMember


@admin.register(WorkspaceMember)
class WorkspaceMemberAdmin(admin.ModelAdmin):
    list_display = (
        "workspace",
        "user",
        "role",
        "is_starred",
        "joined_at",
        "left_at",
        "added_at",
    )
    list_select_related = ("workspace", "user")
    raw_id_fields = ("workspace", "user")
    search_fields = (
        "workspace__id",
        "workspace__name",
        "user__email",
        "user__username",
        "user__full_name",
    )
    list_filter = ("role", "is_starred", "left_at", "added_at")
    ordering = ("-added_at",)
    date_hierarchy = "added_at"
    readonly_fields = ("added_at",)

    def get_queryset(self, request):
        return WorkspaceMember.all_objects.select_related("workspace", "user")


@admin.register(CanvasPermission)
class CanvasPermissionAdmin(admin.ModelAdmin):
    list_display = ("system", "user", "role", "granted_at")
    list_select_related = ("system", "user")
    raw_id_fields = ("system", "user")
    search_fields = (
        "system__id",
        "system__name",
        "system__workspace__name",
        "user__email",
        "user__username",
    )
    list_filter = ("role", "granted_at")
    ordering = ("-granted_at",)
    date_hierarchy = "granted_at"
    readonly_fields = ("granted_at",)
