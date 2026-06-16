import os
import secrets
import smtplib
from email.mime.text import MIMEText

SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.zoho.in')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USER = os.environ.get('SMTP_USER', 'support@structra.cloud')
SMTP_PASS = os.environ.get('SMTP_PASS', '')


def handler(event, context):
    if event['request']['challengeName'] != 'CUSTOM_CHALLENGE':
        return event

    otp = f"{secrets.randbelow(10**6):06d}"
    email = event['request']['userAttributes']['email']

    msg = MIMEText(
        f'Your Structra login code is: {otp}\n\n'
        'This code expires in 10 minutes.\n'
        'If you did not request this, ignore this email.'
    )
    msg['Subject'] = 'Your Structra login code'
    msg['From'] = SMTP_USER
    msg['To'] = email

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as smtp:
        smtp.starttls()
        smtp.login(SMTP_USER, SMTP_PASS)
        smtp.sendmail(SMTP_USER, [email], msg.as_string())

    event['response']['publicChallengeParameters'] = {'email': email}
    event['response']['privateChallengeParameters'] = {'otp': otp}
    event['response']['challengeMetadata'] = 'OTP_CHALLENGE'
    return event
