from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    actor_email = serializers.SerializerMethodField()
    actor_id = serializers.SerializerMethodField()
    system_name = serializers.CharField(source="system.name", read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "scope",
            "category",
            "action",
            "target_name",
            "target_id",
            "message",
            "status",
            "actor_name",
            "actor_email",
            "actor_id",
            "system_id",
            "system_name",
            "created_at",
            "metadata",
        ]

    def get_actor_name(self, obj):
        if obj.actor:
            return obj.actor.full_name or obj.actor.email
        return obj.metadata.get("actor_name") or obj.metadata.get("invited_email") or "System"

    def get_actor_email(self, obj):
        if obj.actor:
            return obj.actor.email
        return obj.metadata.get("actor_email") or obj.metadata.get("invited_email")

    def get_actor_id(self, obj):
        if obj.actor:
            return str(obj.actor_id)
        return None
