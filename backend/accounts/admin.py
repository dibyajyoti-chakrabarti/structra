from django.contrib import admin
from .models import User, EmailOTP

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'full_name', 'is_active', 'is_staff', 'is_new', 'created_at')
    search_fields = ('email', 'full_name')
    list_filter = ('is_active', 'is_staff', 'is_new')


@admin.register(EmailOTP)
class EmailOTPAdmin(admin.ModelAdmin):
    list_display = ('email', 'purpose', 'attempts', 'is_used', 'created_at', 'expires_at')
    search_fields = ('email',)
    list_filter = ('purpose', 'is_used')
