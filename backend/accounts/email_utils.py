from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string


def send_otp_email(recipient_email: str, otp: str, ttl_minutes: int) -> None:
    subject = "Your Structra verification code"
    text_message = (
        f"Your verification code is: {otp}\n\n"
        f"This code expires in {ttl_minutes} minutes.\n"
        "If you did not request this, please ignore this email."
    )

    html_message = render_to_string(
        "accounts/emails/otp_verification.html",
        {
            "otp": otp,
            "ttl_minutes": ttl_minutes,
        },
    )

    message = EmailMultiAlternatives(
        subject=subject,
        body=text_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[recipient_email],
    )
    message.attach_alternative(html_message, "text/html")

    message.send(fail_silently=False)
