import json
import logging

import boto3
from django.conf import settings

logger = logging.getLogger(__name__)

_sqs_client = None


def _get_sqs_client():
    global _sqs_client
    if _sqs_client is None:
        _sqs_client = boto3.client('sqs', region_name=settings.AWS_REGION)
    return _sqs_client


def publish_evaluation_job(run_id, workspace_id, system_id, canvas_state):
    message = {
        'runId': run_id,
        'workspaceId': workspace_id,
        'systemId': system_id,
        'canvasState': canvas_state,
    }

    try:
        client = _get_sqs_client()
        client.send_message(
            QueueUrl=settings.SQS_QUEUE_URL,
            MessageBody=json.dumps(message),
        )
        logger.info(
            'message published run_id=%s workspace_id=%s system_id=%s',
            run_id,
            workspace_id,
            system_id,
        )
        return True
    except Exception:
        logger.exception(
            'failed to publish message run_id=%s workspace_id=%s system_id=%s',
            run_id,
            workspace_id,
            system_id,
        )
        return False
