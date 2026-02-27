from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken
from .username_utils import normalize_username_input, username_validator

User = get_user_model()

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('user_id', 'full_name', 'email', 'username', 'password')

    def validate_username(self, value):
        normalized = normalize_username_input(value)
        if not normalized:
            raise serializers.ValidationError('Username is required.')
        try:
            username_validator(normalized)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages[0])

        existing = User.objects.filter(username__iexact=normalized)
        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)
        if existing.exists():
            raise serializers.ValidationError('Username is already taken.')
        return normalized

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password'],
            full_name=validated_data.get('full_name', '')
        )
        return user

class UserSerializer(serializers.ModelSerializer):
    def validate_username(self, value):
        normalized = normalize_username_input(value)
        if not normalized:
            raise serializers.ValidationError('Username is required.')
        try:
            username_validator(normalized)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages[0])

        existing = User.objects.filter(username__iexact=normalized)
        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)
        if existing.exists():
            raise serializers.ValidationError('Username is already taken.')
        return normalized

    class Meta:
        model = User
        fields = (
            'user_id',
            'full_name',
            'email',
            'username',
            'user_role',
            'org_name',
            'org_loc',
            'is_new',
            'created_at',
        )
        read_only_fields = ('user_id', 'email', 'created_at')


class IdentifierTokenObtainPairSerializer(serializers.Serializer):
    identifier = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        identifier = (attrs.get('identifier') or '').strip()
        password = attrs.get('password')

        user = authenticate(
            request=self.context.get('request'),
            identifier=identifier,
            password=password,
        )
        if not user:
            raise AuthenticationFailed('No active account found with the given credentials')

        refresh = RefreshToken.for_user(user)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'email': user.email,
                'username': user.username,
                'full_name': user.full_name,
                'is_new': user.is_new,
            },
        }
