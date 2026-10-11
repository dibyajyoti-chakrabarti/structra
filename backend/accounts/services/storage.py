"""Avatar storage on Cloudflare R2, reached through boto3's S3 API.

The browser uploads straight to R2 with a short lived presigned PUT, so image
bytes never pass through the backend. Objects are served from R2_PUBLIC_URL.
"""
import logging
import secrets

import boto3
import botocore.session
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from django.conf import settings

logger = logging.getLogger(__name__)

MIME_TYPES = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
}
UPLOAD_URL_TTL_SECONDS = 300


class StorageNotConfigured(Exception):
    pass


def endpoint_url():
    if settings.R2_ENDPOINT_URL:
        return settings.R2_ENDPOINT_URL
    if settings.R2_ACCOUNT_ID:
        return f'https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com'
    return ''


def is_configured():
    return all([
        endpoint_url(),
        settings.R2_ACCESS_KEY_ID,
        settings.R2_SECRET_ACCESS_KEY,
        settings.R2_BUCKET_NAME,
        settings.R2_PUBLIC_URL,
    ])


def _client():
    if not is_configured():
        raise StorageNotConfigured()
    # Do not look at AWS_PROFILE: a leftover from the AWS era in a dev .env would raise
    # ProfileNotFound, and the keys below are explicit anyway.
    core_session = botocore.session.Session(session_vars={'profile': (None, None, None, None)})
    session = boto3.session.Session(botocore_session=core_session)
    return session.client(
        's3',
        endpoint_url=endpoint_url(),
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        # R2 ignores the region but boto3 needs one, and "auto" is what Cloudflare documents.
        region_name='auto',
        config=Config(signature_version='s3v4', s3={'addressing_style': 'path'}),
    )


def user_prefix(user_id):
    return f'users/{user_id}/'


def public_url(key):
    return f'{settings.R2_PUBLIC_URL}/{key}'


def avatar_url_prefix(user_id):
    """Every avatar URL a user may legitimately store starts with this."""
    return public_url(user_prefix(user_id))


def presign_avatar_upload(user_id, ext):
    """Return (upload_url, object_url, content_type) for a new avatar of this user.

    The key carries a random suffix so a replaced avatar gets a new URL and is
    never served stale from the public cache.
    """
    ext = (ext or '').lower().lstrip('.')
    if ext not in MIME_TYPES:
        ext = 'png'
    content_type = MIME_TYPES[ext]
    key = f'{user_prefix(user_id)}avatar-{secrets.token_hex(8)}.{ext}'
    upload_url = _client().generate_presigned_url(
        'put_object',
        Params={'Bucket': settings.R2_BUCKET_NAME, 'Key': key, 'ContentType': content_type},
        ExpiresIn=UPLOAD_URL_TTL_SECONDS,
    )
    return upload_url, public_url(key), content_type


def delete_user_objects(user_id):
    """Best effort removal of everything stored for a user. Never raises."""
    if not is_configured():
        return
    try:
        client = _client()
        prefix = user_prefix(user_id)
        listing = client.list_objects_v2(Bucket=settings.R2_BUCKET_NAME, Prefix=prefix)
        keys = [{'Key': item['Key']} for item in listing.get('Contents', [])]
        if keys:
            client.delete_objects(Bucket=settings.R2_BUCKET_NAME, Delete={'Objects': keys})
    except (BotoCoreError, ClientError):
        logger.exception('Could not delete stored objects for user %s', user_id)
