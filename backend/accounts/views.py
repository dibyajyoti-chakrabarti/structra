from rest_framework import generics, permissions
from .serializers import UserRegistrationSerializer
from django.contrib.auth import get_user_model
from rest_framework.permissions import AllowAny
from .serializers import UserSerializer
from .models import EmailOTP
import requests
import os
import hashlib
import secrets
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

User = get_user_model()

OTP_TTL_MINUTES = 10
OTP_RESEND_COOLDOWN_SECONDS = 60
OTP_MAX_ATTEMPTS = 5

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


def _normalize_email(email):
    return (email or '').strip().lower()


def _hash_otp(otp):
    raw = f"{otp}:{settings.SECRET_KEY}"
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


def _generate_otp():
    return f"{secrets.randbelow(10**6):06d}"


def _issue_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
        'user': {
            'email': user.email,
            'full_name': user.full_name,
            'is_new': user.is_new,
        }
    }


class EmailOTPRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = _normalize_email(request.data.get('email'))
        purpose = (request.data.get('purpose') or '').strip().lower()

        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
        if purpose not in {EmailOTP.PURPOSE_LOGIN, EmailOTP.PURPOSE_SIGNUP}:
            return Response({'error': 'Invalid purpose'}, status=status.HTTP_400_BAD_REQUEST)

        user_exists = User.objects.filter(email=email).exists()
        if purpose == EmailOTP.PURPOSE_LOGIN and not user_exists:
            return Response({'error': 'No account found with this email'}, status=status.HTTP_404_NOT_FOUND)
        if purpose == EmailOTP.PURPOSE_SIGNUP and user_exists:
            return Response({'error': 'Account already exists. Please login instead.'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        latest_active = EmailOTP.objects.filter(
            email=email,
            purpose=purpose,
            is_used=False,
            expires_at__gt=now
        ).order_by('-created_at').first()

        if latest_active:
            elapsed = int((now - latest_active.created_at).total_seconds())
            if elapsed < OTP_RESEND_COOLDOWN_SECONDS:
                return Response(
                    {
                        'error': 'Please wait before requesting another OTP',
                        'retry_after_seconds': OTP_RESEND_COOLDOWN_SECONDS - elapsed
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

        EmailOTP.objects.filter(
            email=email,
            purpose=purpose,
            is_used=False
        ).update(is_used=True)

        otp = _generate_otp()
        expires_at = now + timedelta(minutes=OTP_TTL_MINUTES)

        EmailOTP.objects.create(
            email=email,
            purpose=purpose,
            otp_hash=_hash_otp(otp),
            expires_at=expires_at,
        )

        subject = "Your Structra verification code"
        message = (
            f"Your verification code is: {otp}\n\n"
            f"This code expires in {OTP_TTL_MINUTES} minutes.\n"
            "If you did not request this, please ignore this email."
        )

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
        except Exception:
            return Response(
                {'error': 'Failed to send OTP email. Check email configuration.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(
            {'message': 'OTP sent successfully', 'expires_in_minutes': OTP_TTL_MINUTES},
            status=status.HTTP_200_OK
        )


class EmailOTPVerifyView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = _normalize_email(request.data.get('email'))
        otp = (request.data.get('otp') or '').strip()
        purpose = (request.data.get('purpose') or '').strip().lower()
        full_name = (request.data.get('full_name') or '').strip()

        if not email or not otp:
            return Response({'error': 'Email and OTP are required'}, status=status.HTTP_400_BAD_REQUEST)
        if purpose not in {EmailOTP.PURPOSE_LOGIN, EmailOTP.PURPOSE_SIGNUP}:
            return Response({'error': 'Invalid purpose'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        otp_record = EmailOTP.objects.filter(
            email=email,
            purpose=purpose,
            is_used=False,
            expires_at__gt=now
        ).order_by('-created_at').first()

        if not otp_record:
            return Response({'error': 'OTP not found or expired'}, status=status.HTTP_400_BAD_REQUEST)

        if otp_record.attempts >= OTP_MAX_ATTEMPTS:
            otp_record.is_used = True
            otp_record.save(update_fields=['is_used'])
            return Response({'error': 'Maximum attempts exceeded. Request a new OTP.'}, status=status.HTTP_400_BAD_REQUEST)

        if otp_record.otp_hash != _hash_otp(otp):
            otp_record.attempts += 1
            if otp_record.attempts >= OTP_MAX_ATTEMPTS:
                otp_record.is_used = True
                otp_record.save(update_fields=['attempts', 'is_used'])
            else:
                otp_record.save(update_fields=['attempts'])
            return Response({'error': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)

        otp_record.is_used = True
        otp_record.save(update_fields=['is_used'])

        if purpose == EmailOTP.PURPOSE_LOGIN:
            user = User.objects.filter(email=email).first()
            if not user:
                return Response({'error': 'No account found with this email'}, status=status.HTTP_404_NOT_FOUND)
        else:
            if not full_name:
                return Response({'error': 'Full name is required for signup verification'}, status=status.HTTP_400_BAD_REQUEST)
            if User.objects.filter(email=email).exists():
                return Response({'error': 'Account already exists. Please login instead.'}, status=status.HTTP_400_BAD_REQUEST)
            user = User.objects.create_user(
                email=email,
                password=None,
                full_name=full_name
            )

        return Response(_issue_tokens_for_user(user), status=status.HTTP_200_OK)
