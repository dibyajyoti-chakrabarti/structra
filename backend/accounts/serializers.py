from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from .plan_utils import enforce_plan_expiry, get_active_razorpay_subscription_id
from .username_utils import normalize_username_input, username_validator

User = get_user_model()

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('user_id', 'full_name', 'email', 'username', 'current_plan', 'password')
        read_only_fields = ('current_plan', 'plan_expires_at', 'created_at')

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
    razorpay_subscription_id = serializers.SerializerMethodField()

    def get_razorpay_subscription_id(self, obj):
        return get_active_razorpay_subscription_id(obj)

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
            'current_plan',
            'plan_expires_at',
            'razorpay_subscription_id',
            'user_role',
            'org_name',
            'org_loc',
            'is_new',
            'created_at',
        )
        read_only_fields = (
            'user_id',
            'email',
            'current_plan',
            'plan_expires_at',
            'created_at',
        )


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

        user = enforce_plan_expiry(user)
        active_subscription_id = get_active_razorpay_subscription_id(user)

        refresh = RefreshToken.for_user(user)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'email': user.email,
                'username': user.username,
                'full_name': user.full_name,
                'current_plan': user.current_plan,
                'plan_expires_at': user.plan_expires_at,
                'razorpay_subscription_id': active_subscription_id,
                'is_new': user.is_new,
            },
        }


class ExpiryEnforcingTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        refresh = self.token_class(attrs['refresh'])
        user_id = refresh.get('user_id') or refresh.get('user')
        if user_id:
            user = User.objects.filter(user_id=user_id).first()
            if user:
                enforce_plan_expiry(user)

        return data
