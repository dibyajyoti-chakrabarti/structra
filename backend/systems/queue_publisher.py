import json
import logging

import boto3
from django.conf import settings
from django.utils import timezone

from systems.models import EvaluationQueueJob

logger = logging.getLogger(__name__)


def enqueue_evaluation_job(payload: dict) -> bool:
    if settings.USE_SQS:
        return _enqueue_sqs(payload)
    return _enqueue_local(payload)


def _enqueue_sqs(payload: dict) -> bool:
    run_id = payload.get('runId')
    try:
        client = boto3.client('sqs', region_name=settings.AWS_REGION)
        client.send_message(QueueUrl=settings.SQS_QUEUE_URL, MessageBody=json.dumps(payload))
        logger.info('queued evaluation job run_id=%s transport=sqs', run_id)
        return True
    except Exception:
        logger.exception('failed to queue evaluation job run_id=%s transport=sqs', run_id)
        return False


def _enqueue_local(payload: dict) -> bool:
    run_id = payload.get('runId')
    try:
        EvaluationQueueJob.objects.update_or_create(
            run_id=run_id,
            defaults={
                'payload': payload,
                'status': EvaluationQueueJob.Status.QUEUED,
                'attempt_count': 0,
                'available_at': timezone.now(),
                'locked_at': None,
                'completed_at': None,
                'last_error': '',
            },
        )
        logger.info('queued evaluation job run_id=%s transport=local', run_id)
        return True
    except Exception:
        logger.exception('failed to queue evaluation job run_id=%s transport=local', run_id)
        return False
