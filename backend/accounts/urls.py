from django.urls import path

from .views import AvatarUploadUrlView, DeleteAccountView, UserProfileView

urlpatterns = [
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('profile/avatar-upload-url/', AvatarUploadUrlView.as_view(), name='avatar-upload-url'),
    path('account/delete/', DeleteAccountView.as_view(), name='account-delete'),
]
