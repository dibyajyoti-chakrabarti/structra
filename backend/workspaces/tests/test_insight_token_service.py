from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from core.constants import WorkspaceRole
from permissions.models import WorkspaceMember
from workspaces.models import Workspace
from workspaces.services.insight_token_service import (
    consume_insight_token_after_success,
    ensure_workspace_insight_token_state,
)

User = get_user_model()


class InsightTokenServiceTests(TestCase):
    def _make_workspace(self, plan):
        owner = User.objects.create_user(
            email=f'{plan.lower()}-insight-owner@example.com',
            username=f'{plan.lower()}insightowner',
            password='password123',
            full_name='Owner',
            current_plan=plan,
        )
        workspace = Workspace.objects.create(name=f'{plan} Insight Workspace', owner=owner)
        WorkspaceMember.objects.create(
            workspace=workspace,
            user=owner,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )
        return owner, workspace

    def test_core_daily_allocation_is_three(self):
        _, workspace = self._make_workspace('CORE')
        ensure_workspace_insight_token_state(workspace, now=timezone.now(), force_reset=True)
        workspace.refresh_from_db()

        self.assertEqual(workspace.daily_insight_tokens, 3)
        self.assertEqual(workspace.insight_tokens_remaining, 3)

    def test_individual_daily_allocation_is_fifteen(self):
        _, workspace = self._make_workspace('INDIVIDUAL')
        ensure_workspace_insight_token_state(workspace, now=timezone.now(), force_reset=True)
        workspace.refresh_from_db()

        self.assertEqual(workspace.daily_insight_tokens, 15)
        self.assertEqual(workspace.insight_tokens_remaining, 15)

    def test_team_daily_allocation_scales_with_seats(self):
        owner, workspace = self._make_workspace('TEAM')
        owner.purchased_team_seats = 3
        owner.save(update_fields=['purchased_team_seats'])

        ensure_workspace_insight_token_state(workspace, now=timezone.now(), force_reset=True)
        workspace.refresh_from_db()

        self.assertEqual(workspace.daily_insight_tokens, 75)
        self.assertEqual(workspace.insight_tokens_remaining, 75)

    def test_consume_token_decrements_remaining(self):
        _, workspace = self._make_workspace('CORE')
        ensure_workspace_insight_token_state(workspace, now=timezone.now(), force_reset=True)

        consume_insight_token_after_success(workspace_id=workspace.id, now=timezone.now())
        workspace.refresh_from_db()

        self.assertEqual(workspace.insight_tokens_remaining, 2)

    def test_core_tokens_are_shared_across_owner_workspaces(self):
        owner, workspace_a = self._make_workspace('CORE')
        workspace_b = Workspace.objects.create(name='CORE Insight Workspace B', owner=owner)
        WorkspaceMember.objects.create(
            workspace=workspace_b,
            user=owner,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )

        ensure_workspace_insight_token_state(workspace_a, now=timezone.now(), force_reset=True)
        consume_insight_token_after_success(workspace_id=workspace_a.id, now=timezone.now())

        workspace_a.refresh_from_db()
        workspace_b.refresh_from_db()

        self.assertEqual(workspace_a.insight_tokens_remaining, 2)
        self.assertEqual(workspace_b.insight_tokens_remaining, 2)

    def test_team_tokens_remain_workspace_scoped(self):
        owner, workspace_a = self._make_workspace('TEAM')
        workspace_b = Workspace.objects.create(name='TEAM Insight Workspace B', owner=owner)
        WorkspaceMember.objects.create(
            workspace=workspace_b,
            user=owner,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )

        ensure_workspace_insight_token_state(workspace_a, now=timezone.now(), force_reset=True)
        ensure_workspace_insight_token_state(workspace_b, now=timezone.now(), force_reset=True)
        consume_insight_token_after_success(workspace_id=workspace_a.id, now=timezone.now())

        workspace_a.refresh_from_db()
        workspace_b.refresh_from_db()

        self.assertEqual(workspace_a.insight_tokens_remaining, workspace_a.daily_insight_tokens - 1)
        self.assertEqual(workspace_b.insight_tokens_remaining, workspace_b.daily_insight_tokens)

    def test_plan_upgrade_resets_tokens_to_new_allocation(self):
        owner, workspace = self._make_workspace('CORE')
        ensure_workspace_insight_token_state(workspace, now=timezone.now(), force_reset=True)

        owner.current_plan = 'TEAM'
        owner.purchased_team_seats = 2
        owner.save(update_fields=['current_plan', 'purchased_team_seats'])

        ensure_workspace_insight_token_state(workspace, now=timezone.now(), force_reset=False)
        workspace.refresh_from_db()

        self.assertEqual(workspace.daily_insight_tokens, 50)
        self.assertEqual(workspace.insight_tokens_remaining, 50)
