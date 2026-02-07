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
from django.conf import settings

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

class GitHubLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        code = request.data.get('code')
        if not code:
            return Response({'error': 'Code is required'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Exchange Code for Access Token
        token_url = "https://github.com/login/oauth/access_token"
        token_data = {
            'client_id': os.getenv('GITHUB_CLIENT_ID'), # Ensure these are in your .env
            'client_secret': os.getenv('GITHUB_CLIENT_SECRET'),
            'code': code,
        }
        token_headers = {'Accept': 'application/json'}
        token_response = requests.post(token_url, data=token_data, headers=token_headers)

        if not token_response.ok:
            return Response({'error': 'Failed to get access token from GitHub'}, status=status.HTTP_400_BAD_REQUEST)

        access_token = token_response.json().get('access_token')
        if not access_token:
            return Response({'error': 'Invalid code or access token'}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Fetch User Data from GitHub
        user_url = "https://api.github.com/user"
        user_headers = {'Authorization': f'token {access_token}'}
        user_response = requests.get(user_url, headers=user_headers)
        
        if not user_response.ok:
            return Response({'error': 'Failed to fetch user data'}, status=status.HTTP_400_BAD_REQUEST)

        github_user = user_response.json()
        email = github_user.get('email')
        name = github_user.get('name') or github_user.get('login')

        # 3. Handle Missing Email (GitHub emails can be private)
        if not email:
            emails_url = "https://api.github.com/user/emails"
            emails_response = requests.get(emails_url, headers=user_headers)
            if emails_response.ok:
                for entry in emails_response.json():
                    if entry.get('primary') and entry.get('verified'):
                        email = entry.get('email')
                        break
        
        if not email:
            return Response({'error': 'Email not provided by GitHub'}, status=status.HTTP_400_BAD_REQUEST)

        # 4. Get or Create User
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'full_name': name,
                'is_new': True
            }
        )

        # 5. Generate Tokens
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