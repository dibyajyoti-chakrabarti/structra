from rest_framework import serializers
from core.constants import CanvasRole
from .models import CanvasPermission, WorkspaceMember


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source="user.user_id", read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = WorkspaceMember
        fields = ["user_id", "full_name", "email", "role", "added_at"]


class CanvasPermissionSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source="user.user_id", read_only=True)
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = CanvasPermission
        fields = ["user_id", "full_name", "email", "role", "granted_at"]


class CanvasPermissionGrantSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False, allow_blank=True)
    user_id = serializers.UUIDField(required=False)
    role = serializers.ChoiceField(choices=CanvasRole.CHOICES)

    def validate(self, attrs):
        has_email = bool(attrs.get("email"))
        has_user_id = bool(attrs.get("user_id"))
        if not has_email and not has_user_id:
            raise serializers.ValidationError("Provide either email or user_id.")
        return attrs
