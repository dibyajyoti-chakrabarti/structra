from django.contrib import admin

from .models import Canvas, CanvasComment


@admin.register(Canvas)
class CanvasAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "workspace",
        "visibility",
        "last_modified_by",
        "archived_at",
        "updated_at",
        "created_at",
    )
    list_select_related = ("workspace", "last_modified_by")
    raw_id_fields = ("workspace", "last_modified_by")
    search_fields = (
        "id",
        "name",
        "workspace__id",
        "workspace__name",
        "last_modified_by__email",
        "last_modified_by__username",
    )
    list_filter = ("visibility", "archived_at", "created_at", "updated_at")
    ordering = ("-updated_at",)
    date_hierarchy = "updated_at"
    readonly_fields = ("id", "created_at", "updated_at")

    def get_queryset(self, request):
        return Canvas.all_objects.select_related("workspace", "last_modified_by")


@admin.register(CanvasComment)
class CanvasCommentAdmin(admin.ModelAdmin):
    list_display = ("id", "system", "author", "parent", "created_at", "updated_at")
    list_select_related = ("system", "author", "parent")
    raw_id_fields = ("system", "author", "parent")
    search_fields = (
        "id",
        "system__id",
        "system__name",
        "author__email",
        "author__username",
        "body",
    )
    list_filter = ("created_at", "updated_at")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    readonly_fields = ("id", "created_at", "updated_at")
