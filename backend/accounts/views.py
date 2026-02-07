from rest_framework import generics, permissions
from .serializers import UserRegistrationSerializer
from django.contrib.auth import get_user_model
from rest_framework.permissions import AllowAny
from .serializers import UserSerializer
import requests
import os
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = UserRegistrationSerializer

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

class GoogleLoginView(APIView):
    permission_classes = [AllowAny] # Ensure AllowAny is imported

    def post(self, request):
        access_token = request.data.get('access_token')
        if not access_token:
            return Response({'error': 'Access token is required'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Verify token with Google
        verify_url = "https://www.googleapis.com/oauth2/v3/userinfo"
        params = {'access_token': access_token}
        response = requests.get(verify_url, params=params)

        if not response.ok:
            return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)

        user_data = response.json()
        email = user_data.get('email')
        name = user_data.get('name', '')

        # Security Check: Verify the token belongs to your app (Optional but recommended)
        # You can call https://www.googleapis.com/oauth2/v3/tokeninfo and check 'aud' against os.getenv('GOOGLE_CLIENT_ID')

        if not email:
            return Response({'error': 'Email not provided by Google'}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Get or Create User
        # We use get_or_create to handle both Login and Signup flows
        user, created = User.objects.get_or_create(
            email=email, 
            defaults={
                'full_name': name,
                'is_new': True # Default for new users
            }
        )

        # 3. Generate JWT Tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'email': user.email,
                'full_name': user.full_name,
                'is_new': user.is_new
            }
        })