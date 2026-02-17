from rest_framework import serializers
from .models import Invitation


class WorkspaceInvitationCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.strip().lower()


class InvitationTokenSerializer(serializers.Serializer):
    token = serializers.CharField()

    def validate_token(self, value):
        token = value.strip()
        if not token:
            raise serializers.ValidationError("Token is required.")
        return token


class WorkspaceInvitationSerializer(serializers.ModelSerializer):
    inviter_name = serializers.SerializerMethodField()

    class Meta:
        model = Invitation
        fields = ["token", "email", "role", "status", "inviter_name", "created_at", "expires_at"]

    def get_inviter_name(self, obj):
        if obj.invited_by and obj.invited_by.full_name:
            return obj.invited_by.full_name
        return obj.invited_by.email if obj.invited_by else "Workspace admin"
