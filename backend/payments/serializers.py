from rest_framework import serializers

from .constants import PLAN_PRICES
from core.pricing import PLAN_CORE, PLAN_INDIVIDUAL


class CreateSubscriptionRequestSerializer(serializers.Serializer):
    plan_name = serializers.CharField()

    def validate_plan_name(self, value):
        normalized = (value or '').strip().upper()
        if normalized not in PLAN_PRICES:
            raise serializers.ValidationError('Invalid plan selected')
        return normalized


class CreateSubscriptionResponseSerializer(serializers.Serializer):
    razorpay_subscription_id = serializers.CharField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    currency = serializers.CharField()


class VerifySubscriptionRequestSerializer(serializers.Serializer):
    razorpay_subscription_id = serializers.CharField()
    razorpay_payment_id = serializers.CharField()
    razorpay_signature = serializers.CharField()


class CancelSubscriptionRequestSerializer(serializers.Serializer):
    razorpay_subscription_id = serializers.CharField()


class VoluntaryDowngradeRequestSerializer(serializers.Serializer):
    target_plan = serializers.CharField()

    def validate_target_plan(self, value):
        normalized = (value or "").strip().upper()
        if normalized not in {PLAN_INDIVIDUAL, PLAN_CORE}:
            raise serializers.ValidationError("Invalid downgrade target.")
        return normalized
