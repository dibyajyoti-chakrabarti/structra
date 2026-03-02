from rest_framework_simplejwt.authentication import JWTAuthentication

from .plan_utils import enforce_plan_expiry


class ExpiryEnforcingJWTAuthentication(JWTAuthentication):
    """
    Enforce plan expiry exactly once in the DRF auth pipeline for bearer-token requests.
    """

    def authenticate(self, request):
        result = super().authenticate(request)
        if result is None:
            return None

        user, token = result
        enforce_plan_expiry(user)
        return (user, token)
