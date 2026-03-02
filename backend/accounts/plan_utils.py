from django.utils import timezone


def enforce_plan_expiry(user):
    if not user or not getattr(user, 'plan_expires_at', None):
        return user

    now = timezone.now()
    if now <= user.plan_expires_at:
        return user

    if user.current_plan == user.CurrentPlan.CORE:
        return user

    user.current_plan = user.CurrentPlan.CORE
    user.save(update_fields=['current_plan'])
    return user


def get_active_razorpay_subscription_id(user):
    if not user:
        return None

    from payments.models import PaymentTransaction

    transaction = (
        PaymentTransaction.objects.filter(
            user=user,
            status=PaymentTransaction.Status.ACTIVE,
            razorpay_subscription_id__isnull=False,
        )
        .exclude(razorpay_subscription_id='')
        .order_by('-updated_at', '-created_at')
        .only('razorpay_subscription_id')
        .first()
    )
    return transaction.razorpay_subscription_id if transaction else None
