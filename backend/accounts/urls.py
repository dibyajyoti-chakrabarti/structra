from django.urls import path

from .views import DeleteAccountView, UserProfileView

urlpatterns = [
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('account/delete/', DeleteAccountView.as_view(), name='account-delete'),
]
