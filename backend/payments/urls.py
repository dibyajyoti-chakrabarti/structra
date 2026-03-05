from django.urls import path

from .views import (
    CancelSubscriptionView,
    CheckoutSubscriptionView,
    CreateSubscriptionView,
    RazorpayWebhookView,
    VoluntaryDowngradeView,
    VerifySubscriptionView,
)


urlpatterns = [
    path('checkout/', CheckoutSubscriptionView.as_view(), name='payments-checkout'),
    path('orders/create/', CreateSubscriptionView.as_view(), name='payments-order-create'),
    path('orders/verify/', VerifySubscriptionView.as_view(), name='payments-order-verify'),
    path('subscriptions/cancel/', CancelSubscriptionView.as_view(), name='payments-subscription-cancel'),
    path('subscriptions/downgrade/', VoluntaryDowngradeView.as_view(), name='payments-subscription-downgrade'),
    path('webhook/', RazorpayWebhookView.as_view(), name='payments-webhook'),
]
