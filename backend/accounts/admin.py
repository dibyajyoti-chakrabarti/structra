from django.contrib import admin
from .models import User, EmailOTP


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = (
        'user_id',
        'email',
        'username',
        'full_name',
        'current_plan',
        'purchased_team_seats',
        'is_active',
        'is_staff',
        'is_new',
        'created_at',
    )
    list_select_related = ()
    search_fields = ('email', 'username', 'full_name')
    list_filter = ('current_plan', 'is_active', 'is_staff', 'is_new', 'created_at')
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'
    readonly_fields = ('user_id', 'created_at', 'last_login')


@admin.register(EmailOTP)
class EmailOTPAdmin(admin.ModelAdmin):
    list_display = ('id', 'email', 'purpose', 'attempts', 'is_used', 'created_at', 'expires_at')
    search_fields = ('id', 'email')
    list_filter = ('purpose', 'is_used', 'created_at')
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'
    readonly_fields = ('id', 'created_at')
