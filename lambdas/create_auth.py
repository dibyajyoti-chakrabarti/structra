import os
import secrets
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.zoho.in')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USER = os.environ.get('SMTP_USER', 'support@structra.cloud')
SMTP_PASS = os.environ.get('SMTP_PASS', '')

HTML_TEMPLATE = """\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Your Structra login code</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(30,64,175,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 100%);padding:28px 40px;text-align:center;">
              <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">
                    <img src="https://structra-assets-042843883108.s3.ap-south-1.amazonaws.com/logo/structra-logo.png"
                         alt="" width="36" height="36"
                         style="display:block;border:0;outline:none;text-decoration:none;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;font-family:'Segoe UI',Arial,sans-serif;">Structra</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">Your login code</h1>
              <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.6;">
                Use the code below to sign in to your Structra account. It expires in <strong style="color:#0f172a;">10&nbsp;minutes</strong>.
              </p>

              <!-- OTP box -->
              <div style="background:#f0f7ff;border:2px solid #bfdbfe;border-radius:12px;padding:28px 0;text-align:center;margin-bottom:28px;">
                <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#1d4ed8;font-family:'Courier New',monospace;">{otp}</span>
              </div>

              <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                &copy; 2025 Structra &mdash; <a href="https://structra.cloud" style="color:#3b82f6;text-decoration:none;">structra.cloud</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

PLAIN_TEMPLATE = """\
Your Structra login code: {otp}

This code expires in 10 minutes.
If you did not request this, ignore this email.

structra.cloud
"""


def handler(event, context):
    if event['request']['challengeName'] != 'CUSTOM_CHALLENGE':
        return event

    otp = f"{secrets.randbelow(10**6):06d}"
    email = event['request']['userAttributes']['email']

    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'Your Structra login code'
    msg['From'] = f'Structra <{SMTP_USER}>'
    msg['To'] = email

    msg.attach(MIMEText(PLAIN_TEMPLATE.format(otp=otp), 'plain'))
    msg.attach(MIMEText(HTML_TEMPLATE.format(otp=otp), 'html'))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as smtp:
        smtp.starttls()
        smtp.login(SMTP_USER, SMTP_PASS)
        smtp.sendmail(SMTP_USER, [email], msg.as_string())

    event['response']['publicChallengeParameters'] = {'email': email}
    event['response']['privateChallengeParameters'] = {'otp': otp}
    event['response']['challengeMetadata'] = 'OTP_CHALLENGE'
    return event
