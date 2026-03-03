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


def send_password_reset_email(
    recipient_email: str,
    reset_link: str,
    ttl_minutes: int,
) -> None:
    subject = "Reset your Structra password"
    text_message = (
        "We received a request to reset your Structra password.\n\n"
        f"Open this link to set a new password:\n{reset_link}\n\n"
        f"This link expires in {ttl_minutes} minutes.\n"
        "If you did not request this, you can ignore this email."
    )

    html_message = render_to_string(
        "accounts/emails/password_reset.html",
        {
            "reset_link": reset_link,
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
