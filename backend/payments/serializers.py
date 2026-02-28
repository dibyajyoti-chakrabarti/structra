from rest_framework import serializers

from .constants import PLAN_PRICES


class CreateOrderRequestSerializer(serializers.Serializer):
    plan_name = serializers.CharField()

    def validate_plan_name(self, value):
        normalized = (value or '').strip().upper()
        if normalized not in PLAN_PRICES:
            raise serializers.ValidationError('Invalid plan selected')
        return normalized


class CreateOrderResponseSerializer(serializers.Serializer):
    razorpay_order_id = serializers.CharField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    currency = serializers.CharField()


class VerifyOrderRequestSerializer(serializers.Serializer):
    razorpay_order_id = serializers.CharField()
    razorpay_payment_id = serializers.CharField()
    razorpay_signature = serializers.CharField()
