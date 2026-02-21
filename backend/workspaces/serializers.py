from rest_framework import serializers
from .models import Workspace
from permissions.models import WorkspaceMember
from core.constants import WorkspaceRole

class WorkspaceSerializer(serializers.ModelSerializer):
    owner_name = serializers.ReadOnlyField(source='owner.full_name')
    member_count = serializers.SerializerMethodField()
    system_count = serializers.SerializerMethodField()
    current_user_role = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()

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

    def get_current_user_role(self, obj):
        membership = self._get_membership(obj)
        return membership.role if membership else None

    def get_is_admin(self, obj):
        membership = self._get_membership(obj)
        return bool(membership and membership.role == WorkspaceRole.ADMIN)


class PublicWorkspaceSerializer(serializers.ModelSerializer):
    owner_name = serializers.ReadOnlyField(source="owner.full_name")
    search_score = serializers.SerializerMethodField()

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
        ]
        read_only_fields = fields

    def get_search_score(self, obj):
        score = getattr(obj, "score", None)
        if score is None:
            return None
        return round(float(score), 6)


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
