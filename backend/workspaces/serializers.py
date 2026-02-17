from rest_framework import serializers
from .models import Workspace

class WorkspaceSerializer(serializers.ModelSerializer):
    owner_name = serializers.ReadOnlyField(source='owner.full_name')
    member_count = serializers.SerializerMethodField()
    system_count = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = ['id', 'name', 'description', 'visibility', 'owner', 'owner_name', 'member_count', 'system_count','created_at', 'updated_at']
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']
    
    def get_member_count(self, obj):
        # Counts entries in the workspace_members table for this workspace
        return obj.members.count()
    
    def get_system_count(self, obj):
        # Assuming the related_name in Canvas model is 'systems'
        return obj.systems.count()
