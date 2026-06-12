import boto3
import secrets

def handler(event, context):
    if event['request']['challengeName'] != 'CUSTOM_CHALLENGE':
        return event

    otp = f"{secrets.randbelow(10**6):06d}"

    ses = boto3.client('ses', region_name='ap-south-1')
    email = event['request']['userAttributes']['email']
    ses.send_email(
        Source='support@structra.cloud',
        Destination={'ToAddresses': [email]},
        Message={
            'Subject': {'Data': 'Your Structra login code'},
            'Body': {
                'Text': {
                    'Data': (
                        f'Your Structra login code is: {otp}\n\n'
                        'This code expires in 10 minutes.\n'
                        'If you did not request this, ignore this email.'
                    )
                }
            },
        },
    )

    event['response']['publicChallengeParameters'] = {'email': email}
    event['response']['privateChallengeParameters'] = {'otp': otp}
    event['response']['challengeMetadata'] = 'OTP_CHALLENGE'
    return event
