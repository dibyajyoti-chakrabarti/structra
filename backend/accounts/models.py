from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.contrib.postgres.indexes import GinIndex
import uuid
from .services.username import (
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
    class CurrentPlan(models.TextChoices):
        CORE = 'CORE', 'Core'
        INDIVIDUAL = 'INDIVIDUAL', 'Individual'
        TEAM = 'TEAM', 'Team'
        ENTERPRISE = 'ENTERPRISE', 'Enterprise'

    class PricingPlan(models.TextChoices):
        CORE = 'core', 'Core'
        INDIVIDUAL = 'individual', 'Individual'
        TEAM = 'team', 'Team'
        ENTERPRISE = 'enterprise', 'Enterprise'

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
    current_plan = models.CharField(
        max_length=20,
        choices=CurrentPlan.choices,
        default=CurrentPlan.CORE,
    )
    plan_expires_at = models.DateTimeField(null=True, blank=True)
    purchased_team_seats = models.IntegerField(default=1)
    avatar_url = models.URLField(max_length=500, blank=True, null=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email

    class Meta:
        indexes = [
            GinIndex(
                fields=['username'],
                name='acct_usr_un_trgm_gin_idx',
                opclasses=['gin_trgm_ops'],
            ),
            GinIndex(
                fields=['full_name'],
                name='acct_usr_fn_trgm_gin_idx',
                opclasses=['gin_trgm_ops'],
            ),
        ]


class UserIdentity(models.Model):
    """A social login (Google or GitHub account) linked to a Structra user."""

    class Provider(models.TextChoices):
        GOOGLE = 'google', 'Google'
        GITHUB = 'github', 'GitHub'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='identities')
    provider = models.CharField(max_length=20, choices=Provider.choices)
    # The provider's stable account id (Google "sub", GitHub numeric id), never the email.
    subject = models.CharField(max_length=255)
    # Verified email the provider reported when the identity was linked (audit only).
    email = models.EmailField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['provider', 'subject'], name='acct_identity_provider_subject_uniq'),
        ]

    def __str__(self):
        return f'{self.provider}:{self.subject}'


class EmailLoginCode(models.Model):
    """A one time email login code. Only a keyed hash of the code is stored."""

    email = models.EmailField(db_index=True)
    code_hash = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    consumed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=['email', '-created_at'], name='acct_code_email_created_idx')]


class AuthTicket(models.Model):
    """A short lived, single use code handed to the frontend after a social login.

    It is exchanged for tokens by the frontend, so tokens never travel in a URL.
    """

    code_hash = models.CharField(max_length=64, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='auth_tickets')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    consumed_at = models.DateTimeField(null=True, blank=True)


class RefreshToken(models.Model):
    """Server side record of an issued refresh token, so it can rotate and be revoked."""

    jti = models.CharField(max_length=64, primary_key=True)
    family = models.CharField(max_length=64, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='refresh_tokens')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True, blank=True)


class AuthAttempt(models.Model):
    """One event counted by the auth throttles (code requests, failed verifications)."""

    kind = models.CharField(max_length=32)
    key = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=['kind', 'key', 'created_at'], name='acct_attempt_lookup_idx')]
