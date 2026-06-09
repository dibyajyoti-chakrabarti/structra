from django.contrib import admin

from .models import (
    EvaluationLog,
    EvaluationRun,
    Workspace,
    WorkspaceCreditConsumption,
    WorkspaceStar,
)


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "owner",
        "visibility",
        "archived_at",
        "ai_credits_remaining",
        "insight_tokens_remaining",
        "overage_enabled",
        "created_at",
    )
    list_select_related = ("owner",)
    raw_id_fields = ("owner",)
    search_fields = ("id", "name", "owner__email", "owner__username")
    list_filter = ("visibility", "overage_enabled", "archived_at", "created_at")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    readonly_fields = ("id", "created_at", "updated_at")

    def get_queryset(self, request):
        return Workspace.all_objects.select_related("owner")


@admin.register(WorkspaceStar)
class WorkspaceStarAdmin(admin.ModelAdmin):
    list_display = ("workspace", "user", "created_at")
    list_select_related = ("workspace", "user")
    raw_id_fields = ("workspace", "user")
    search_fields = ("workspace__id", "workspace__name", "user__email", "user__username")
    list_filter = ("created_at",)
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    readonly_fields = ("created_at",)


@admin.register(EvaluationLog)
class EvaluationLogAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "workspace",
        "system_id",
        "user",
        "workspace_tier",
        "score",
        "rules_evaluated",
        "rules_passed",
        "credit_consumed",
        "evaluated_at",
    )
    list_select_related = ("workspace", "user")
    raw_id_fields = ("workspace", "user")
    search_fields = (
        "id",
        "workspace__id",
        "workspace__name",
        "system_id",
        "user__email",
        "user__username",
    )
    list_filter = ("workspace_tier", "credit_consumed", "evaluated_at")
    ordering = ("-evaluated_at",)
    date_hierarchy = "evaluated_at"
    readonly_fields = ("id", "evaluated_at")


@admin.register(EvaluationRun)
class EvaluationRunAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "workspace",
        "system_id",
        "user",
        "status",
        "score",
        "credits_exhausted",
        "insight_token_consumed",
        "ai_error",
        "created_at",
        "completed_at",
    )
    list_select_related = ("workspace", "user")
    raw_id_fields = ("workspace", "user")
    search_fields = (
        "id",
        "workspace__id",
        "workspace__name",
        "system_id",
        "user__email",
        "user__username",
        "error_message",
    )
    list_filter = (
        "status",
        "workspace_tier",
        "credits_exhausted",
        "insight_token_consumed",
        "ai_error",
        "created_at",
    )
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    readonly_fields = ("id", "created_at", "started_at", "completed_at")


@admin.register(WorkspaceCreditConsumption)
class WorkspaceCreditConsumptionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "workspace",
        "user",
        "evaluation_run",
        "source",
        "credits_used",
        "consumed_at",
    )
    list_select_related = ("workspace", "user", "evaluation_run")
    raw_id_fields = ("workspace", "user", "evaluation_run")
    search_fields = (
        "id",
        "workspace__id",
        "workspace__name",
        "user__email",
        "user__username",
        "evaluation_run__id",
    )
    list_filter = ("source", "consumed_at")
    ordering = ("-consumed_at",)
    date_hierarchy = "consumed_at"
    readonly_fields = ("id", "consumed_at")
