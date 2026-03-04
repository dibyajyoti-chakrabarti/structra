from rest_framework import serializers
from .models import Workspace, WorkspaceStar
from permissions.models import WorkspaceMember
from core.constants import WorkspaceRole
from core.pricing import (
    PLAN_CORE,
    get_member_limit_for_workspace_plan,
    get_workspace_monthly_cost_estimate,
    normalize_plan,
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
    billing_estimate_inr = serializers.SerializerMethodField()
    active_evaluation_count = serializers.SerializerMethodField()
    total_evaluation_count = serializers.SerializerMethodField()

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
            'billing_estimate_inr',
            'active_evaluation_count',
            'total_evaluation_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']
    
    def get_member_count(self, obj):
        # Counts entries in the workspace_members table for this workspace
        return obj.members.count()
    
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
        member_count = obj.members.count()
        return max(member_count, 1)

    def get_billing_estimate_inr(self, obj):
        plan = self._get_effective_plan(obj)
        member_count = obj.members.count()
        invited_member_count = max(member_count - 1, 0)
        amount = get_workspace_monthly_cost_estimate(plan, invited_member_count)
        if amount is None:
            return None
        return f"{amount:.2f}"

    def get_active_evaluation_count(self, obj):
        return obj.evaluation_runs.filter(status__in=['pending', 'running']).count()

    def get_total_evaluation_count(self, obj):
        return obj.evaluation_runs.count()


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
