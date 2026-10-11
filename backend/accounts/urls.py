from django.urls import path

from .otp_views import OTPRequestView, OTPVerifyView
from .token_views import LogoutView, TokenRefreshView
from .views import AvatarUploadUrlView, DeleteAccountView, UserProfileView

urlpatterns = [
    path('otp/request/', OTPRequestView.as_view(), name='otp-request'),
    path('otp/verify/', OTPVerifyView.as_view(), name='otp-verify'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('profile/avatar-upload-url/', AvatarUploadUrlView.as_view(), name='avatar-upload-url'),
    path('account/delete/', DeleteAccountView.as_view(), name='account-delete'),
]
