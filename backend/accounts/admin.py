from django.contrib import admin
from .models import User, UserIdentity


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




@admin.register(UserIdentity)
class UserIdentityAdmin(admin.ModelAdmin):
    list_display = ('user', 'provider', 'subject', 'email', 'created_at')
    list_filter = ('provider',)
    search_fields = ('user__email', 'subject', 'email')
    raw_id_fields = ('user',)
    readonly_fields = ('created_at',)
