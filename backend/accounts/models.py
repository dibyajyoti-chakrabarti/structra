from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.contrib.postgres.indexes import GinIndex
import uuid
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
    cognito_sub = models.CharField(max_length=128, unique=True, null=True, blank=True, db_index=True)

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
