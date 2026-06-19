"""
Service-level token refund tests that exercise run_evaluation_job directly.

Run from the worker/ directory with PYTHONPATH set to the backend source:
    PYTHONPATH=/path/to/backend DJANGO_ENV=local python -m pytest tests/
"""
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from systems.models import Canvas
from core.constants import WorkspaceRole
from evaluation_service import run_evaluation_job
from permissions.models import WorkspaceMember
from workspaces.models import EvaluationRun, Workspace
from workspaces.services.insight_token_service import (
    consume_insight_token_on_confirmation,
    ensure_workspace_insight_token_state,
)

User = get_user_model()


class ServiceLevelTokenRefundTests(TestCase):
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

    @patch('evaluation_service.close_old_connections', return_value=None)
    @patch('evaluation_service.call_bedrock_for_prompt', return_value=(None, True))
    @patch('evaluation_service._semantic_enrich_canvas_state', side_effect=lambda cs, _tier: cs)
    @patch('evaluation_service.evaluate_canvas_state')
    def test_ai_no_response_refunds_token(self, evaluate_mock, _enrich_mock, _bedrock_mock, _close_connections_mock):
        ensure_workspace_insight_token_state(self.workspace, now=timezone.now(), force_reset=True)
        self.workspace.insight_tokens_remaining = 2
        self.workspace.save(update_fields=['insight_tokens_remaining'])
        token_state = consume_insight_token_on_confirmation(workspace_id=self.workspace.id)

        run = EvaluationRun.objects.create(
            workspace=self.workspace,
            system_id=self.system.id,
            user=self.user,
            workspace_tier='individual',
            canvas_state={'nodes': [], 'edges': []},
            status=EvaluationRun.Status.PENDING,
            insight_token_consumed=True,
            insight_tokens_remaining=token_state['insightTokensRemaining'],
            credits_remaining=4,
        )
        evaluate_mock.return_value = {
            'results': [{'id': 'F-01', 'passed': False, 'ruleTier': 'basic', 'confidence': 'high', 'reason': 'x'}],
            'summary': {'failed': 1, 'passed': 0, 'applicable': 1},
            'score': 0,
            'prompt': 'prompt',
        }

        run_evaluation_job(run, run.canvas_state)

        self.workspace.refresh_from_db()
        self.assertEqual(self.workspace.insight_tokens_remaining, 2)
        run.refresh_from_db()
        self.assertEqual(run.status, EvaluationRun.Status.COMPLETED)
        self.assertTrue(run.ai_error)
        self.assertFalse(run.insight_token_consumed)

    @patch('evaluation_service.close_old_connections', return_value=None)
    @patch('evaluation_service._semantic_enrich_canvas_state', side_effect=lambda cs, _tier: cs)
    @patch('evaluation_service.evaluate_canvas_state', side_effect=RuntimeError('invalid report'))
    def test_corrupted_run_refunds_token(self, _evaluate_mock, _enrich_mock, _close_connections_mock):
        ensure_workspace_insight_token_state(self.workspace, now=timezone.now(), force_reset=True)
        self.workspace.insight_tokens_remaining = 2
        self.workspace.save(update_fields=['insight_tokens_remaining'])
        token_state = consume_insight_token_on_confirmation(workspace_id=self.workspace.id)

        run = EvaluationRun.objects.create(
            workspace=self.workspace,
            system_id=self.system.id,
            user=self.user,
            workspace_tier='individual',
            canvas_state={'nodes': [], 'edges': []},
            status=EvaluationRun.Status.PENDING,
            insight_token_consumed=True,
            insight_tokens_remaining=token_state['insightTokensRemaining'],
            credits_remaining=4,
        )

        with self.assertRaises(RuntimeError):
            run_evaluation_job(run, run.canvas_state)

        self.workspace.refresh_from_db()
        self.assertEqual(self.workspace.insight_tokens_remaining, 2)
        run.refresh_from_db()
        self.assertEqual(run.status, EvaluationRun.Status.FAILED)
        self.assertFalse(run.insight_token_consumed)
