from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from .services.plan import get_active_razorpay_subscription_id
from .services.username import normalize_username_input, username_validator

User = get_user_model()


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
            'purchased_team_seats',
            'razorpay_subscription_id',
            'user_role',
            'org_name',
            'org_loc',
            'is_new',
            'created_at',
            'avatar_url',
        )
        read_only_fields = (
            'user_id',
            'email',
            'current_plan',
            'plan_expires_at',
            'purchased_team_seats',
            'created_at',
        )
