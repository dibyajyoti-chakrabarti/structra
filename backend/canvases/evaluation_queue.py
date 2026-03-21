import json
import logging
from dataclasses import dataclass
from datetime import timedelta

import boto3
from django.conf import settings
from django.db import connection, transaction
from django.db.models import Q
from django.utils import timezone

from canvases.models import EvaluationQueueJob
from workspaces.models import EvaluationRun

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class QueuedEvaluationJob:
    backend: str
    payload: dict
    attempt_count: int = 0
    receipt_handle: str | None = None
    queue_record_id: str | None = None


class BaseEvaluationQueue:
    backend_name = 'unknown'
    idle_sleep_seconds = 0

    def enqueue(self, payload):
        raise NotImplementedError

    def dequeue(self):
        raise NotImplementedError

    def ack(self, job):
        raise NotImplementedError

    def fail(self, job, exc):
        raise NotImplementedError


class SQSQueue(BaseEvaluationQueue):
    backend_name = 'sqs'

    def __init__(self):
        if not settings.SQS_QUEUE_URL:
            raise RuntimeError('SQS_QUEUE_URL is required when USE_SQS=true.')
        self.queue_url = settings.SQS_QUEUE_URL
        self.client = boto3.client('sqs', region_name=settings.AWS_REGION)

    def enqueue(self, payload):
        run_id = payload.get('runId')
        if not run_id:
            logger.error('failed to queue evaluation job without runId transport=sqs')
            return False
        try:
            self.client.send_message(
                QueueUrl=self.queue_url,
                MessageBody=json.dumps(payload),
            )
            logger.info('queued evaluation job run_id=%s transport=sqs', run_id)
            return True
        except Exception:
            logger.exception('failed to queue evaluation job run_id=%s transport=sqs', run_id)
            return False

    def dequeue(self):
        response = self.client.receive_message(
            QueueUrl=self.queue_url,
            MaxNumberOfMessages=1,
            WaitTimeSeconds=20,
            AttributeNames=['ApproximateReceiveCount'],
        )
        messages = response.get('Messages', [])
        if not messages:
            return None

        message = messages[0]
        payload = json.loads(message.get('Body', '{}'))
        attributes = message.get('Attributes') or {}
        attempt_count = int(attributes.get('ApproximateReceiveCount', '1') or 1)
        return QueuedEvaluationJob(
            backend=self.backend_name,
            payload=payload,
            attempt_count=attempt_count,
            receipt_handle=message['ReceiptHandle'],
        )

    def ack(self, job):
        self.client.delete_message(QueueUrl=self.queue_url, ReceiptHandle=job.receipt_handle)

    def fail(self, job, exc):
        run_status = _get_run_status(job.payload.get('runId'))
        if run_status in TERMINAL_RUN_STATUSES:
            self.ack(job)
            logger.info(
                'recorded terminal failure for job run_id=%s transport=sqs status=%s',
                job.payload.get('runId'),
                run_status,
            )
            return

        logger.warning(
            'processing failed for job run_id=%s transport=sqs attempt=%s; retry will use SQS visibility timeout: %s',
            job.payload.get('runId'),
            job.attempt_count,
            exc,
        )


class LocalQueue(BaseEvaluationQueue):
    backend_name = 'local'
    idle_sleep_seconds = settings.EVALUATION_LOCAL_QUEUE_POLL_INTERVAL_SECONDS

    def enqueue(self, payload):
        run_id = payload.get('runId')
        if not run_id:
            logger.error('failed to queue evaluation job without runId transport=local')
            return False
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

    def dequeue(self):
        now = timezone.now()
        stale_lock_cutoff = now - timedelta(seconds=settings.EVALUATION_LOCAL_QUEUE_LOCK_TIMEOUT_SECONDS)
        with transaction.atomic():
            queryset = (
                EvaluationQueueJob.objects
                .filter(
                    Q(
                        status=EvaluationQueueJob.Status.QUEUED,
                        available_at__lte=now,
                    )
                    | Q(
                        status=EvaluationQueueJob.Status.PROCESSING,
                        locked_at__lte=stale_lock_cutoff,
                    )
                )
                .order_by('available_at', 'created_at')
            )

            if connection.features.has_select_for_update:
                if connection.features.has_select_for_update_skip_locked:
                    queryset = queryset.select_for_update(skip_locked=True)
                else:
                    queryset = queryset.select_for_update()

            queue_record = queryset.first()
            if queue_record is None:
                return None

            queue_record.status = EvaluationQueueJob.Status.PROCESSING
            queue_record.locked_at = now
            queue_record.attempt_count += 1
            queue_record.save(update_fields=['status', 'locked_at', 'attempt_count', 'updated_at'])

        return QueuedEvaluationJob(
            backend=self.backend_name,
            payload=queue_record.payload or {},
            attempt_count=queue_record.attempt_count,
            queue_record_id=str(queue_record.id),
        )

    def ack(self, job):
        EvaluationQueueJob.objects.filter(id=job.queue_record_id).update(
            status=EvaluationQueueJob.Status.COMPLETED,
            locked_at=None,
            completed_at=timezone.now(),
            last_error='',
        )

    def fail(self, job, exc):
        now = timezone.now()
        next_status = EvaluationQueueJob.Status.QUEUED
        available_at = now + timedelta(seconds=settings.EVALUATION_LOCAL_QUEUE_RETRY_DELAY_SECONDS)

        run_status = _get_run_status(job.payload.get('runId'))
        if run_status in TERMINAL_RUN_STATUSES or job.attempt_count >= settings.EVALUATION_LOCAL_QUEUE_MAX_ATTEMPTS:
            next_status = EvaluationQueueJob.Status.FAILED
            available_at = now

        EvaluationQueueJob.objects.filter(id=job.queue_record_id).update(
            status=next_status,
            locked_at=None,
            available_at=available_at,
            last_error=str(exc),
        )

        if next_status == EvaluationQueueJob.Status.FAILED:
            logger.info(
                'marked local queue job failed run_id=%s attempt=%s status=%s',
                job.payload.get('runId'),
                job.attempt_count,
                run_status or 'unknown',
            )
            return

        logger.warning(
            'requeued local evaluation job run_id=%s attempt=%s available_at=%s error=%s',
            job.payload.get('runId'),
            job.attempt_count,
            available_at.isoformat(),
            exc,
        )


TERMINAL_RUN_STATUSES = {
    EvaluationRun.Status.COMPLETED,
    EvaluationRun.Status.FAILED,
}


def _get_run_status(run_id):
    if not run_id:
        return None
    return EvaluationRun.objects.filter(id=run_id).values_list('status', flat=True).first()


def get_evaluation_queue():
    if settings.USE_SQS:
        return SQSQueue()
    return LocalQueue()
