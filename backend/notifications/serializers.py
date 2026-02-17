from rest_framework import serializers


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
