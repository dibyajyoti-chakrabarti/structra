from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.contrib.postgres.indexes import GinIndex
import uuid
from django.utils import timezone
from .username_utils import (
    generate_unique_username,
    normalize_username_input,
    username_validator,
)

class UserManager(BaseUserManager):
    def create_user(self, email, username=None, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)

        username = normalize_username_input(username or extra_fields.pop('username', None))
        if not username:
            username = generate_unique_username(email.split('@', 1)[0])

        username_validator(username)

        if self.model.objects.filter(username__iexact=username).exists():
            raise ValueError('Username is already taken')

        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, username, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    user_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=50, unique=True, validators=[username_validator])
    full_name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    
    # Profile Fields
    user_role = models.CharField(max_length=255, blank=True, null=True)
    org_name = models.CharField(max_length=255, blank=True, null=True)
    org_loc = models.CharField(max_length=255, blank=True, null=True)
    is_new = models.BooleanField(default=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email

    class Meta:
        indexes = [
            GinIndex(
                fields=['username'],
                name='accounts_user_username_trgm_gin_idx',
                opclasses=['gin_trgm_ops'],
            ),
            GinIndex(
                fields=['full_name'],
                name='accounts_user_full_name_trgm_gin_idx',
                opclasses=['gin_trgm_ops'],
            ),
        ]


class EmailOTP(models.Model):
    PURPOSE_LOGIN = 'login'
    PURPOSE_SIGNUP = 'signup'
    PURPOSE_CHOICES = [
        (PURPOSE_LOGIN, 'Login'),
        (PURPOSE_SIGNUP, 'Signup'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField()
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES)
    otp_hash = models.CharField(max_length=64)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'email_otps'
        indexes = [
            models.Index(fields=['email', 'purpose', 'is_used']),
            models.Index(fields=['expires_at']),
        ]

    def is_expired(self):
        return timezone.now() >= self.expires_at
