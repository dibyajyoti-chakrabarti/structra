from django.utils import timezone
from datetime import timedelta


GRACE_PERIOD_DAYS = 14


def get_plan_access_state(user):
    if not user or not getattr(user, "plan_expires_at", None):
        return {"state": "active", "grace_ends_at": None}

    now = timezone.now()
    expires_at = user.plan_expires_at
    if now <= expires_at:
        return {"state": "active", "grace_ends_at": None}

    grace_ends_at = expires_at + timedelta(days=GRACE_PERIOD_DAYS)
    if now <= grace_ends_at:
        return {"state": "grace", "grace_ends_at": grace_ends_at}

    return {"state": "enforcement_due", "grace_ends_at": grace_ends_at}


def enforce_plan_expiry(user):
    if not user:
        return user

    access_state = get_plan_access_state(user)
    setattr(user, "_plan_access_state", access_state["state"])
    setattr(user, "_plan_grace_ends_at", access_state.get("grace_ends_at"))
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
            razorpay_subscription_id__startswith='sub_',
        )
        .exclude(razorpay_subscription_id='')
        .order_by('-updated_at', '-created_at')
        .only('razorpay_subscription_id')
        .first()
    )
    return transaction.razorpay_subscription_id if transaction else None
