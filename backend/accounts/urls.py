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
]
