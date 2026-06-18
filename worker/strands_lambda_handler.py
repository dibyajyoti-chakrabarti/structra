import json
import logging
import os

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'worker_hub.settings')
os.environ.setdefault('DJANGO_ENV', 'production')
django.setup()

from django.db import close_old_connections  # noqa: E402

from evaluation_service import run_evaluation_job  # noqa: E402
from workspaces.models import EvaluationRun  # noqa: E402

logger = logging.getLogger(__name__)


def handler(event, context):
    for record in event['Records']:
        _process_record(record)


def _process_record(record):
    try:
        body = json.loads(record['body'])
    except (json.JSONDecodeError, KeyError) as exc:
        logger.error('Failed to parse SQS record body: %s', exc)
        return

    run_id = body.get('runId')
    if not run_id:
        logger.warning('SQS message missing runId, acknowledging without processing')
        return

    close_old_connections()

    try:
        run = EvaluationRun.objects.select_related('workspace__owner', 'user').get(pk=run_id)
    except EvaluationRun.DoesNotExist:
        logger.warning('EvaluationRun not found run_id=%s, acknowledging', run_id)
        return

    if run.status in (EvaluationRun.Status.COMPLETED, EvaluationRun.Status.FAILED):
        logger.info('run already terminal run_id=%s status=%s', run_id, run.status)
        return

    canvas_state = body.get('canvasState') or run.canvas_state or {}

    # run_evaluation_job handles status transitions, DB writes, Bedrock calls,
    # error handling, and re-raises on failure so SQS retries.
    run_evaluation_job(run, canvas_state)
