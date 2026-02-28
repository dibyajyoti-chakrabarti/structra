from django.urls import path

from .views import CreateOrderView, RazorpayWebhookView, VerifyOrderView


urlpatterns = [
    path('orders/create/', CreateOrderView.as_view(), name='payments-order-create'),
    path('orders/verify/', VerifyOrderView.as_view(), name='payments-order-verify'),
    path('webhook/', RazorpayWebhookView.as_view(), name='payments-webhook'),
]
