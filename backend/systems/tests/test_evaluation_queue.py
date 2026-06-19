from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from systems.models import Canvas, EvaluationQueueJob
from core.constants import WorkspaceRole
from permissions.models import WorkspaceMember
from workspaces.models import EvaluationRun, Workspace

User = get_user_model()


@override_settings(USE_SQS=False)
class LocalQueueApiTests(APITestCase):
    """Verify the backend API correctly enqueues a local queue job."""

    def setUp(self):
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
        self.client.force_authenticate(user=self.user)
        self.url = reverse('system-ai-evaluate')

    def test_api_enqueues_local_queue_job_and_returns_accepted(self):
        response = self.client.post(
            self.url,
            {
                'workspaceId': self.workspace.id,
                'systemId': self.system.id,
                'canvasState': {'nodes': [], 'edges': []},
            },
            format='json',
        )

        self.assertEqual(response.status_code, 202)
        run = EvaluationRun.objects.latest('created_at')
        job = EvaluationQueueJob.objects.get(run=run)
        self.assertEqual(run.status, EvaluationRun.Status.PENDING)
        self.assertEqual(job.status, EvaluationQueueJob.Status.QUEUED)
