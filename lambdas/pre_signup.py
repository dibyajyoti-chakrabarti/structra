import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event, context):
    # Auto-confirm native sign-ups — OTP sign-in itself proves email ownership
    if event.get('triggerSource') in ('PreSignUp_SignUp', 'PreSignUp_AdminCreateUser'):
        event['response']['autoConfirmUser'] = True
        event['response']['autoVerifyEmail'] = True
        return event

    # Only act on federated (external) provider sign-ups
    if event.get('triggerSource') != 'PreSignUp_ExternalProvider':
        return event

    email = event['request']['userAttributes'].get('email', '')
    if not email:
        return event

    client = boto3.client('cognito-idp')
    user_pool_id = event['userPoolId']

    # Parse "ProviderName_ProviderUserId" from event['userName']
    parts = event['userName'].split('_', 1)
    if len(parts) != 2:
        logger.warning(f"Unexpected userName format: {event['userName']}")
        return event

    provider_name, provider_user_id = parts

    logger.info(f"PreSignUp_ExternalProvider: provider={provider_name}, email={email}")

    try:
        response = client.list_users(
            UserPoolId=user_pool_id,
            Filter=f'email = "{email}"',
        )
        existing_users = response.get('Users', [])
    except Exception as e:
        logger.error(f"Failed to list users: {e}")
        return event

    if not existing_users:
        logger.info(f"No existing user for {email}, allowing new sign-up")
        return event

    # Pick a destination user — prefer a non-federated (Cognito-native) user
    destination = next(
        (u for u in existing_users if u['UserStatus'] != 'EXTERNAL_PROVIDER'),
        existing_users[0],
    )
    dest_username = destination['Username']

    # Don't link to yourself
    if dest_username == event['userName']:
        return event

    logger.info(f"Linking {provider_name}/{provider_user_id} -> existing user '{dest_username}'")

    try:
        client.admin_link_provider_for_user(
            UserPoolId=user_pool_id,
            DestinationUser={
                'ProviderName': 'Cognito',
                'ProviderAttributeValue': dest_username,
            },
            SourceUser={
                'ProviderName': provider_name,
                'ProviderAttributeName': 'Cognito_Subject',
                'ProviderAttributeValue': provider_user_id,
            },
        )
        logger.info("Account linked successfully — raising AccountLinked to trigger client retry")
    except client.exceptions.AliasExistsException:
        logger.info("Provider already linked")
    except Exception as e:
        logger.error(f"admin_link_provider_for_user failed: {e}")
        return event

    # Raising an exception here tells Cognito to abort this sign-up.
    # The provider is already linked, so the next sign-in attempt succeeds.
    raise Exception("AccountLinked")
