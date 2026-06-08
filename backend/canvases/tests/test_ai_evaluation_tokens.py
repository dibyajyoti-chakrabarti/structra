from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from canvases.models import Canvas
from core.constants import WorkspaceRole
from permissions.models import WorkspaceMember
from workspaces.models import EvaluationRun, Workspace
from workspaces.services.insight_token_service import (
    ensure_workspace_insight_token_state,
)

User = get_user_model()


class AIEvaluationTokenFlowTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='ai-token-owner@example.com',
            username='aitokenowner',
            password='password123',
            full_name='AI Owner',
            current_plan='INDIVIDUAL',
        )
        self.workspace = Workspace.objects.create(name='AI Token Workspace', owner=self.user)
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.user,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )
        self.system = Canvas.objects.create(
            name='AI System',
            workspace=self.workspace,
            visibility='private',
            last_modified_by=self.user,
        )
        self.url = reverse('system-ai-evaluate')
        self.client.force_authenticate(user=self.user)

    def _payload(self):
        return {
            'workspaceId': self.workspace.id,
            'systemId': self.system.id,
            'canvasState': {'nodes': [], 'edges': []},
        }

    def test_rate_limit_blocks_after_ten_ai_evaluations_in_last_hour(self):
        now = timezone.now()
        EvaluationRun.objects.bulk_create(
            [
                EvaluationRun(
                    workspace=self.workspace,
                    system_id=self.system.id,
                    user=self.user,
                    workspace_tier='individual',
                    status=EvaluationRun.Status.COMPLETED,
                    created_at=now,
                )
                for _ in range(10)
            ]
        )

        response = self.client.post(self.url, self._payload(), format='json')

        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.data.get('error'), 'rate_limit')
        self.assertIn('retryAfterSeconds', response.data)

    @patch('canvases.evaluation_views._dispatch_evaluation_job', return_value=True)
    def test_evaluation_confirm_consumes_one_token_immediately(self, _dispatch_mock):
        ensure_workspace_insight_token_state(self.workspace, now=timezone.now(), force_reset=True)
        self.workspace.insight_tokens_remaining = 2
        self.workspace.save(update_fields=['insight_tokens_remaining'])

        response = self.client.post(self.url, self._payload(), format='json')

        self.assertEqual(response.status_code, 202)
        self.workspace.refresh_from_db()
        self.assertEqual(self.workspace.insight_tokens_remaining, 1)

        run = EvaluationRun.objects.latest('created_at')
        self.assertTrue(run.insight_token_consumed)
        self.assertEqual(run.insight_tokens_remaining, 1)

    def test_no_tokens_returns_no_tokens_error(self):
        ensure_workspace_insight_token_state(self.workspace, now=timezone.now(), force_reset=True)
        self.workspace.insight_tokens_remaining = 0
        self.workspace.last_token_reset_date = timezone.localdate()
        self.workspace.save(update_fields=['insight_tokens_remaining', 'last_token_reset_date'])

        response = self.client.post(self.url, self._payload(), format='json')

        self.assertEqual(response.status_code, 402)
        self.assertEqual(response.data.get('error'), 'NO_TOKENS')
        self.assertEqual(EvaluationRun.objects.count(), 0)

    @patch('canvases.evaluation_views._dispatch_evaluation_job', return_value=False)
    def test_queue_failure_refunds_token(self, _dispatch_mock):
        ensure_workspace_insight_token_state(self.workspace, now=timezone.now(), force_reset=True)
        self.workspace.insight_tokens_remaining = 2
        self.workspace.save(update_fields=['insight_tokens_remaining'])

        response = self.client.post(self.url, self._payload(), format='json')

        self.assertEqual(response.status_code, 503)
        self.workspace.refresh_from_db()
        self.assertEqual(self.workspace.insight_tokens_remaining, 2)

        run = EvaluationRun.objects.latest('created_at')
        self.assertFalse(run.insight_token_consumed)
        self.assertEqual(run.insight_tokens_remaining, 2)
