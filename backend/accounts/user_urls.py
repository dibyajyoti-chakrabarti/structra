from django.urls import path

from .views import PublicUserProfileView, UsernameAvailabilityView, UserTrigramSearchView


urlpatterns = [
    path('search/', UserTrigramSearchView.as_view(), name='user-trigram-search'),
    path('username-available/', UsernameAvailabilityView.as_view(), name='username-available'),
    path('<str:username>/profile/', PublicUserProfileView.as_view(), name='user-public-profile'),
]
