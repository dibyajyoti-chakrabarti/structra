import json
import logging
import os
import time

import boto3
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_hub.settings')
os.environ.setdefault('DJANGO_ENV', 'production')
django.setup()

from django.conf import settings  # noqa: E402
from canvases.evaluation_service import run_evaluation_job  # noqa: E402
from workspaces.models import EvaluationRun  # noqa: E402

logger = logging.getLogger(__name__)


def process_message(body):
    run_id = body.get('runId')
    canvas_state = body.get('canvasState') or {}

    if not run_id:
        logger.warning('message missing runId; acknowledging message')
        return

    run = EvaluationRun.objects.select_related('workspace__owner', 'user').filter(id=run_id).first()
    if run is None:
        logger.info('run not found run_id=%s; acknowledging message', run_id)
        return

    if run.status in (EvaluationRun.Status.COMPLETED, EvaluationRun.Status.FAILED):
        logger.info('run already terminal run_id=%s status=%s; acknowledging message', run_id, run.status)
        return

    run_evaluation_job(run, canvas_state)


def main():
    queue_url = settings.SQS_QUEUE_URL
    if not queue_url:
        raise RuntimeError('SQS_QUEUE_URL is required for sqs_worker.')

    sqs = boto3.client('sqs', region_name=settings.AWS_REGION)
    logger.info('starting sqs worker queue_url=%s region=%s', queue_url, settings.AWS_REGION)

    while True:
        try:
            response = sqs.receive_message(
                QueueUrl=queue_url,
                MaxNumberOfMessages=1,
                WaitTimeSeconds=20,
                AttributeNames=['ApproximateReceiveCount'],
            )
            messages = response.get('Messages', [])
            if not messages:
                continue

            message = messages[0]
            body = json.loads(message.get('Body', '{}'))
            receipt_handle = message['ReceiptHandle']

            logger.info('message received run_id=%s', body.get('runId'))

            try:
                process_message(body)
                sqs.delete_message(QueueUrl=queue_url, ReceiptHandle=receipt_handle)
                logger.info('message deleted run_id=%s', body.get('runId'))
            except Exception:
                logger.exception('failed processing message run_id=%s', body.get('runId'))
        except Exception:
            logger.exception('worker loop error')
            time.sleep(2)


if __name__ == '__main__':
    main()
