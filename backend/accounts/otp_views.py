"""Email one time code login."""
import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from rest_framework import status
from rest_framework.response import Response

from .auth_common import PublicAuthView, session_response, too_many
from .services import otp, throttle

logger = logging.getLogger(__name__)
User = get_user_model()

INVALID_CODE = {'detail': 'Invalid or expired code.'}


class OTPRequestView(PublicAuthView):
    def post(self, request):
        email = otp.normalize_email(request.data.get('email'))
        if not email:
            return Response({'detail': 'Enter a valid email address.'}, status=status.HTTP_400_BAD_REQUEST)

        ip_id = throttle.ip_key(throttle.client_ip(request))
        email_id = throttle.email_key(email)
        wait = max(
            throttle.retry_after(throttle.OTP_REQUEST, email_id, settings.AUTH_OTP_REQUESTS_PER_EMAIL_PER_HOUR),
            throttle.retry_after(throttle.OTP_REQUEST, ip_id, settings.AUTH_OTP_REQUESTS_PER_IP_PER_HOUR),
        )
        if wait:
            return too_many(wait)
        throttle.record(throttle.OTP_REQUEST, email_id)
        throttle.record(throttle.OTP_REQUEST, ip_id)

        row, code = otp.create_code(email)
        try:
            otp.send_code_email(email, code)
        except Exception:
            logger.exception('Failed to send login code email')
            row.delete()
            return Response(
                {'detail': 'We could not send the email. Try again shortly.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        # Same answer whether or not an account exists for this address.
        return Response({'detail': 'Check your email for a login code.'})


class OTPVerifyView(PublicAuthView):
    def post(self, request):
        email = otp.normalize_email(request.data.get('email'))
        code = request.data.get('code')
        if not email or not otp.is_well_formed_code(code):
            return Response(INVALID_CODE, status=status.HTTP_400_BAD_REQUEST)

        ip_id = throttle.ip_key(throttle.client_ip(request))
        email_id = throttle.email_key(email)
        wait = max(
            throttle.retry_after(throttle.OTP_FAILURE, email_id, settings.AUTH_OTP_FAILURES_PER_EMAIL_PER_HOUR),
            throttle.retry_after(throttle.OTP_FAILURE, ip_id, settings.AUTH_OTP_FAILURES_PER_IP_PER_HOUR),
        )
        if wait:
            return too_many(wait)

        if not otp.verify_code(email, code):
            throttle.record(throttle.OTP_FAILURE, email_id)
            throttle.record(throttle.OTP_FAILURE, ip_id)
            return Response(INVALID_CODE, status=status.HTTP_400_BAD_REQUEST)

        # Proving control of the inbox is the email verification, so an existing
        # account with this address is simply signed in.
        user = User.objects.filter(email__iexact=email).first()
        if user is None:
            full_name = request.data.get('full_name')
            full_name = full_name.strip()[:255] if isinstance(full_name, str) else ''
            try:
                with transaction.atomic():
                    user = User.objects.create_user(email=email, full_name=full_name)
            except IntegrityError:
                user = User.objects.filter(email__iexact=email).first()
        if user is None or not user.is_active:
            return Response({'detail': 'This account is disabled.'}, status=status.HTTP_403_FORBIDDEN)
        return session_response(user)
