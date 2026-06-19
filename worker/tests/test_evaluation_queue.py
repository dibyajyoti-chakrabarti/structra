"""
Worker-side queue and job processing tests.

Run from the worker/ directory with PYTHONPATH set to the backend source:
    PYTHONPATH=/path/to/backend DJANGO_ENV=local python -m pytest tests/
"""
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone

from systems.models import Canvas, EvaluationQueueJob
from core.constants import WorkspaceRole
from evaluation_queue import LocalQueue
from evaluation_worker import process_next_job
from permissions.models import WorkspaceMember
from workspaces.models import EvaluationRun, Workspace

User = get_user_model()


class EvaluationQueueFixtureMixin:
    def create_fixture(self):
        self.user = User.objects.create_user(
            email='queue-owner@example.com',
            username='queueowner',
            password='password123',
            full_name='Queue Owner',
            current_plan='INDIVIDUAL',
        )
        self.workspace = Workspace.objects.create(name='Queue Workspace', owner=self.user)
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.user,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )
        self.system = Canvas.objects.create(
            name='Queue System',
            workspace=self.workspace,
            visibility='private',
            last_modified_by=self.user,
        )

    def create_run(self):
        return EvaluationRun.objects.create(
            workspace=self.workspace,
            system_id=self.system.id,
            user=self.user,
            workspace_tier='individual',
            canvas_state={'nodes': [], 'edges': []},
            status=EvaluationRun.Status.PENDING,
        )

    def payload_for_run(self, run):
        return {
            'runId': str(run.id),
            'workspaceId': self.workspace.id,
            'systemId': self.system.id,
            'canvasState': run.canvas_state,
        }


@override_settings(USE_SQS=False)
class LocalQueueWorkerTests(EvaluationQueueFixtureMixin, TestCase):
    def setUp(self):
        self.create_fixture()
        self.queue = LocalQueue()

    @patch('evaluation_worker.run_evaluation_job')
    def test_worker_processes_local_queue_job(self, run_job_mock):
        run = self.create_run()
        self.queue.enqueue(self.payload_for_run(run))

        processed = process_next_job(queue=self.queue)

        self.assertTrue(processed)
        run_job_mock.assert_called_once()
        job = EvaluationQueueJob.objects.get(run=run)
        self.assertEqual(job.status, EvaluationQueueJob.Status.COMPLETED)
        self.assertEqual(job.attempt_count, 1)

    @patch('evaluation_worker.run_evaluation_job', side_effect=RuntimeError('transient worker crash'))
    def test_worker_requeues_local_job_after_non_terminal_failure(self, _run_job_mock):
        run = self.create_run()
        self.queue.enqueue(self.payload_for_run(run))

        processed = process_next_job(queue=self.queue)

        self.assertTrue(processed)
        job = EvaluationQueueJob.objects.get(run=run)
        self.assertEqual(job.status, EvaluationQueueJob.Status.QUEUED)
        self.assertEqual(job.attempt_count, 1)
        self.assertIn('transient worker crash', job.last_error)

    @patch('evaluation_worker.run_evaluation_job')
    def test_worker_marks_local_job_failed_after_terminal_run_failure(self, run_job_mock):
        run = self.create_run()
        self.queue.enqueue(self.payload_for_run(run))

        def fail_and_mark_terminal(run_instance, _canvas_state):
            EvaluationRun.objects.filter(pk=run_instance.pk).update(
                status=EvaluationRun.Status.FAILED,
                error_message='evaluation failed',
            )
            raise RuntimeError('evaluation failed')

        run_job_mock.side_effect = fail_and_mark_terminal

        processed = process_next_job(queue=self.queue)

        self.assertTrue(processed)
        job = EvaluationQueueJob.objects.get(run=run)
        self.assertEqual(job.status, EvaluationQueueJob.Status.FAILED)
        self.assertEqual(job.attempt_count, 1)
        self.assertIn('evaluation failed', job.last_error)
