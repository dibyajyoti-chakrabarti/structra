from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

from .username_utils import normalize_username_input


class EmailOrUsernameBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, identifier=None, **kwargs):
        credential = (identifier or username or '').strip()
        if not credential or password is None:
            return None

        User = get_user_model()

        if '@' in credential:
            user = User.objects.filter(email__iexact=credential.lower()).first()
        else:
            normalized_username = normalize_username_input(credential)
            user = User.objects.filter(username__iexact=normalized_username).first()

        if user and user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
