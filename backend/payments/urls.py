from django.urls import path

from .views import (
    CancelSubscriptionView,
    CreateSubscriptionView,
    RazorpayWebhookView,
    VerifySubscriptionView,
)


urlpatterns = [
    path('orders/create/', CreateSubscriptionView.as_view(), name='payments-order-create'),
    path('orders/verify/', VerifySubscriptionView.as_view(), name='payments-order-verify'),
    path('subscriptions/cancel/', CancelSubscriptionView.as_view(), name='payments-subscription-cancel'),
    path('webhook/', RazorpayWebhookView.as_view(), name='payments-webhook'),
]
