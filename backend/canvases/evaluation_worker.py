import logging
import os
import time

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_hub.settings')
os.environ.setdefault('DJANGO_ENV', 'production')
django.setup()

from canvases.evaluation_queue import get_evaluation_queue  # noqa: E402
from canvases.evaluation_service import run_evaluation_job  # noqa: E402
from workspaces.models import EvaluationRun  # noqa: E402

logger = logging.getLogger(__name__)


def process_message(body):
    run_id = body.get('runId')
    canvas_state = body.get('canvasState') or {}

    if not run_id:
        logger.warning('worker received job without runId; acknowledging')
        return

    run = EvaluationRun.objects.select_related('workspace__owner', 'user').filter(id=run_id).first()
    if run is None:
        logger.info('worker received missing run run_id=%s; acknowledging', run_id)
        return

    if run.status in (EvaluationRun.Status.COMPLETED, EvaluationRun.Status.FAILED):
        logger.info('worker received terminal run run_id=%s status=%s; acknowledging', run_id, run.status)
        return

    run_evaluation_job(run, canvas_state or run.canvas_state or {})


def process_next_job(queue=None):
    queue = queue or get_evaluation_queue()
    job = queue.dequeue()
    if job is None:
        return False

    run_id = job.payload.get('runId')
    logger.info(
        'worker picked up job run_id=%s transport=%s attempt=%s',
        run_id,
        queue.backend_name,
        job.attempt_count,
    )

    try:
        process_message(job.payload)
    except Exception as exc:
        queue.fail(job, exc)
        logger.exception(
            'worker failed job run_id=%s transport=%s attempt=%s',
            run_id,
            queue.backend_name,
            job.attempt_count,
        )
    else:
        queue.ack(job)
        logger.info('worker completed job run_id=%s transport=%s', run_id, queue.backend_name)

    return True


def run_worker_loop():
    queue = get_evaluation_queue()
    logger.info('starting evaluation worker transport=%s', queue.backend_name)

    while True:
        try:
            processed = process_next_job(queue=queue)
            if not processed and queue.idle_sleep_seconds:
                time.sleep(queue.idle_sleep_seconds)
        except Exception:
            logger.exception('worker loop error transport=%s', queue.backend_name)
            time.sleep(2)


def main():
    run_worker_loop()


if __name__ == '__main__':
    main()
