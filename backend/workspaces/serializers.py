from rest_framework import serializers
from .models import Workspace, WorkspaceStar
from permissions.models import WorkspaceMember
from core.constants import WorkspaceRole
from core.pricing import (
    PLAN_CORE,
    PLAN_TEAM,
    get_member_limit_for_workspace_plan,
    get_workspace_monthly_cost_estimate,
    normalize_plan,
)
from payments.seat_utils import get_billable_seat_snapshot
from workspaces.services.insight_token_service import (
    get_daily_insight_tokens,
    get_workspace_seat_count,
    get_workspace_tier,
)

class WorkspaceSerializer(serializers.ModelSerializer):
    owner_name = serializers.ReadOnlyField(source='owner.full_name')
    member_count = serializers.SerializerMethodField()
    system_count = serializers.SerializerMethodField()
    current_user_role = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()
    is_starred = serializers.SerializerMethodField()
    effective_plan = serializers.SerializerMethodField()
    member_limit = serializers.SerializerMethodField()
    seat_count = serializers.SerializerMethodField()
    purchased_seat_count = serializers.SerializerMethodField()
    billing_estimate_inr = serializers.SerializerMethodField()
    active_evaluation_count = serializers.SerializerMethodField()
    total_evaluation_count = serializers.SerializerMethodField()
    tier = serializers.SerializerMethodField()
    seatCount = serializers.SerializerMethodField()
    dailyInsightTokens = serializers.SerializerMethodField()
    insightTokensRemaining = serializers.SerializerMethodField()
    lastTokenResetDate = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = [
            'id',
            'name',
            'description',
            'visibility',
            'owner',
            'owner_name',
            'member_count',
            'system_count',
            'current_user_role',
            'is_admin',
            'is_starred',
            'effective_plan',
            'member_limit',
            'seat_count',
            'purchased_seat_count',
            'billing_estimate_inr',
            'active_evaluation_count',
            'total_evaluation_count',
            'tier',
            'seatCount',
            'dailyInsightTokens',
            'insightTokensRemaining',
            'lastTokenResetDate',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']
    
    def get_member_count(self, obj):
        return WorkspaceMember.objects.filter(workspace=obj).count()
    
    def get_system_count(self, obj):
        # Assuming the related_name in Canvas model is 'systems'
        return obj.systems.count()

    def _get_membership(self, obj):
        request = self.context.get('request')
        if not request or not request.user or request.user.is_anonymous:
            return None
        return WorkspaceMember.objects.filter(workspace=obj, user=request.user).first()

    def _get_starred_workspace_ids(self):
        cached_workspace_ids = self.context.get("_starred_workspace_ids")
        if cached_workspace_ids is not None:
            return cached_workspace_ids

        request = self.context.get("request")
        if not request or not request.user or request.user.is_anonymous:
            starred_workspace_ids = set()
        else:
            starred_workspace_ids = set(
                WorkspaceStar.objects.filter(user=request.user).values_list("workspace_id", flat=True)
            )
        self.context["_starred_workspace_ids"] = starred_workspace_ids
        return starred_workspace_ids

    def get_current_user_role(self, obj):
        membership = self._get_membership(obj)
        return membership.role if membership else None

    def get_is_admin(self, obj):
        membership = self._get_membership(obj)
        return bool(membership and membership.role == WorkspaceRole.ADMIN)

    def get_is_starred(self, obj):
        return obj.id in self._get_starred_workspace_ids()

    def _get_effective_plan(self, obj):
        owner = getattr(obj, "owner", None)
        return normalize_plan(getattr(owner, "current_plan", PLAN_CORE))

    def get_effective_plan(self, obj):
        return self._get_effective_plan(obj)

    def get_member_limit(self, obj):
        return get_member_limit_for_workspace_plan(self._get_effective_plan(obj))

    def get_seat_count(self, obj):
        snapshot = get_billable_seat_snapshot(obj)
        return snapshot["total_occupied"]

    def get_purchased_seat_count(self, obj):
        plan = self._get_effective_plan(obj)
        if plan != PLAN_TEAM:
            return None
        return max(int(getattr(obj.owner, "purchased_team_seats", 1) or 1), 1)

    def get_billing_estimate_inr(self, obj):
        plan = self._get_effective_plan(obj)
        if plan == PLAN_TEAM:
            purchased_team_seats = max(int(getattr(obj.owner, "purchased_team_seats", 1) or 1), 1)
            amount = get_workspace_monthly_cost_estimate(plan, purchased_team_seats - 1)
            return f"{amount:.2f}" if amount is not None else None
        snapshot = get_billable_seat_snapshot(obj)
        invited_member_count = snapshot["billable_invited_seats"]
        amount = get_workspace_monthly_cost_estimate(plan, invited_member_count)
        if amount is None:
            return None
        return f"{amount:.2f}"

    def get_active_evaluation_count(self, obj):
        return obj.evaluation_runs.filter(status__in=['pending', 'running']).count()

    def get_total_evaluation_count(self, obj):
        return obj.evaluation_runs.count()

    def get_tier(self, obj):
        return get_workspace_tier(obj)

    def get_seatCount(self, obj):
        return get_workspace_seat_count(obj)

    def get_dailyInsightTokens(self, obj):
        return int(obj.daily_insight_tokens or get_daily_insight_tokens(obj))

    def get_insightTokensRemaining(self, obj):
        default_allocation = get_daily_insight_tokens(obj)
        return int(obj.insight_tokens_remaining if obj.insight_tokens_remaining is not None else default_allocation)

    def get_lastTokenResetDate(self, obj):
        return obj.last_token_reset_date


class PublicWorkspaceSerializer(serializers.ModelSerializer):
    owner_name = serializers.ReadOnlyField(source="owner.full_name")
    search_score = serializers.SerializerMethodField()
    is_starred = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = [
            "id",
            "name",
            "description",
            "visibility",
            "owner_name",
            "created_at",
            "updated_at",
            "search_score",
            "is_starred",
        ]
        read_only_fields = fields

    def get_search_score(self, obj):
        score = getattr(obj, "score", None)
        if score is None:
            return None
        return round(float(score), 6)

    def get_is_starred(self, obj):
        request = self.context.get("request")
        if not request or not request.user or request.user.is_anonymous:
            return False

        cached_workspace_ids = self.context.get("_public_starred_workspace_ids")
        if cached_workspace_ids is None:
            cached_workspace_ids = set(
                WorkspaceStar.objects.filter(user=request.user).values_list("workspace_id", flat=True)
            )
            self.context["_public_starred_workspace_ids"] = cached_workspace_ids
        return obj.id in cached_workspace_ids


class WorkspaceDetailSerializer(WorkspaceSerializer):
    is_member = serializers.SerializerMethodField()
    workspace_role = serializers.SerializerMethodField()
    team_members = serializers.SerializerMethodField()

    class Meta(WorkspaceSerializer.Meta):
        fields = WorkspaceSerializer.Meta.fields + [
            "is_member",
            "workspace_role",
            "team_members",
        ]

    def get_is_member(self, obj):
        membership = self._get_membership(obj)
        return bool(membership)

    def get_workspace_role(self, obj):
        membership = self._get_membership(obj)
        return membership.role if membership else None

    def get_team_members(self, obj):
        members = (
            WorkspaceMember.objects.filter(workspace=obj)
            .select_related("user")
            .order_by("added_at")
        )
        return [
            {
                "full_name": member.user.full_name,
                "role": member.role,
            }
            for member in members
        ]
