import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def handler(event, context):
    if event.get('triggerSource') != 'PostConfirmation_ConfirmSignUp':
        return event

    email = event['request']['userAttributes'].get('email', '')
    if not email:
        return event

    user_pool_id = event['userPoolId']
    native_username = event['userName']

    client = boto3.client('cognito-idp')
    try:
        users = client.list_users(
            UserPoolId=user_pool_id,
            Filter=f'email = "{email}"',
        ).get('Users', [])
    except Exception as e:
        logger.error(f"list_users failed: {e}")
        return event

    for u in users:
        if u['UserStatus'] != 'EXTERNAL_PROVIDER':
            continue
        parts = u['Username'].split('_', 1)
        if len(parts) != 2:
            continue
        provider_name, provider_user_id = parts
        logger.info(f"Linking {provider_name}/{provider_user_id} -> {native_username}")
        try:
            client.admin_link_provider_for_user(
                UserPoolId=user_pool_id,
                DestinationUser={
                    'ProviderName': 'Cognito',
                    'ProviderAttributeValue': native_username,
                },
                SourceUser={
                    'ProviderName': provider_name,
                    'ProviderAttributeName': 'Cognito_Subject',
                    'ProviderAttributeValue': provider_user_id,
                },
            )
            logger.info(f"Linked {provider_name}/{provider_user_id} to native user {native_username}")
        except client.exceptions.AliasExistsException:
            logger.info(f"{provider_name}/{provider_user_id} already linked")
        except Exception as e:
            logger.error(f"admin_link_provider_for_user failed: {e}")

    return event
