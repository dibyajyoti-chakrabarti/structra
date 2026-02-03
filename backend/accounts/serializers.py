from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('user_id', 'full_name', 'email', 'password')

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data.get('full_name', '')
        )
        return user

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        # Added 'created_at' to fields
        fields = ('user_id', 'full_name', 'email', 'user_role', 'org_name', 'org_loc', 'is_new', 'created_at')
        read_only_fields = ('user_id', 'email', 'created_at')