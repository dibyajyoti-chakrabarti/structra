from rest_framework import serializers
from .models import Canvas

class CanvasSerializer(serializers.ModelSerializer):
    class Meta:
        model = Canvas
        fields = ['id', 'workspace', 'name', 'description', 'canvas_data', 'created_at', 'updated_at']
        # Add 'workspace' to read_only_fields
        read_only_fields = ['id', 'workspace', 'created_at', 'updated_at']