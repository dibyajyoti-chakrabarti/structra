from django.urls import path
from .views import (
    ExpiryEnforcingTokenRefreshView,
    RegisterView,
    UserProfileView,
    GoogleLoginView,
    GitHubLoginView,
    EmailOTPRequestView,
    EmailOTPVerifyView,
    IdentifierTokenObtainPairView,
    PasswordResetRequestView,
    PasswordResetValidateView,
    PasswordResetConfirmView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', IdentifierTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', ExpiryEnforcingTokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('google/', GoogleLoginView.as_view(), name='google_login'),
    path('github/', GitHubLoginView.as_view(), name='github_login'),
    path('email-otp/request/', EmailOTPRequestView.as_view(), name='email_otp_request'),
    path('email-otp/verify/', EmailOTPVerifyView.as_view(), name='email_otp_verify'),
    path('password-reset/request/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password-reset/validate/', PasswordResetValidateView.as_view(), name='password_reset_validate'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
]
