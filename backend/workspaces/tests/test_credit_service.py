from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from core.constants import WorkspaceRole
from permissions.models import WorkspaceMember
from workspaces.credit_service import (
    TeamSoftThrottleError,
    claim_ai_credit,
    ensure_workspace_credit_state,
)
from workspaces.models import Workspace, WorkspaceCreditConsumption

User = get_user_model()


class CreditServiceTests(TestCase):
    def _make_workspace(self, plan):
        owner = User.objects.create_user(
            email=f"{plan.lower()}-owner@example.com",
            username=f"{plan.lower()}owner",
            password="password123",
            full_name="Owner",
            current_plan=plan,
        )
        workspace = Workspace.objects.create(name=f"{plan} Workspace", owner=owner)
        WorkspaceMember.objects.create(
            workspace=workspace,
            user=owner,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )
        return owner, workspace

    def test_team_monthly_pool_includes_admin_base_seat(self):
        owner, workspace = self._make_workspace("TEAM")

        ensure_workspace_credit_state(workspace, now=timezone.now(), force_reset=True)
        workspace.refresh_from_db()
        self.assertEqual(workspace.ai_credits_monthly, 80)
        self.assertEqual(workspace.ai_credits_remaining, 80)

        member = User.objects.create_user(
            email="team-member@example.com",
            username="teammember",
            password="password123",
            full_name="Member",
        )
        WorkspaceMember.objects.create(
            workspace=workspace,
            user=member,
            role=WorkspaceRole.MEMBER,
            joined_at=timezone.now(),
        )

        ensure_workspace_credit_state(workspace, now=timezone.now(), force_reset=True)
        workspace.refresh_from_db()
        self.assertEqual(workspace.ai_credits_monthly, 160)
        self.assertEqual(workspace.ai_credits_remaining, 160)

    def test_claim_drain_order_monthly_then_pack_then_overage(self):
        owner, workspace = self._make_workspace("CORE")
        now = timezone.now()

        workspace.ai_credits_monthly = 5
        workspace.ai_credits_remaining = 1
        workspace.ai_credits_purchased_pack_remaining = 1
        workspace.overage_enabled = True
        workspace.ai_credits_reset_at = now + timedelta(days=3)
        workspace.save(
            update_fields=[
                "ai_credits_monthly",
                "ai_credits_remaining",
                "ai_credits_purchased_pack_remaining",
                "overage_enabled",
                "ai_credits_reset_at",
            ]
        )

        first = claim_ai_credit(workspace_id=workspace.id, user_id=owner.user_id, now=now)
        second = claim_ai_credit(workspace_id=workspace.id, user_id=owner.user_id, now=now)
        third = claim_ai_credit(workspace_id=workspace.id, user_id=owner.user_id, now=now)

        self.assertEqual(first["source"], WorkspaceCreditConsumption.Source.MONTHLY_POOL)
        self.assertEqual(second["source"], WorkspaceCreditConsumption.Source.PURCHASED_PACK)
        self.assertEqual(third["source"], WorkspaceCreditConsumption.Source.OVERAGE)

        workspace.refresh_from_db()
        self.assertEqual(workspace.ai_credits_remaining, 0)
        self.assertEqual(workspace.ai_credits_purchased_pack_remaining, 0)
        self.assertEqual(workspace.ai_credits_overage_used_monthly, 1)

    def test_team_soft_throttle_blocks_over_40_percent_of_pool(self):
        owner, workspace = self._make_workspace("TEAM")
        now = timezone.now()

        workspace.ai_credits_monthly = 80
        workspace.ai_credits_remaining = 80
        workspace.ai_credits_reset_at = now + timedelta(days=7)
        workspace.save(update_fields=["ai_credits_monthly", "ai_credits_remaining", "ai_credits_reset_at"])

        WorkspaceCreditConsumption.objects.bulk_create(
            [
                WorkspaceCreditConsumption(
                    workspace=workspace,
                    user=owner,
                    source=WorkspaceCreditConsumption.Source.MONTHLY_POOL,
                    credits_used=1,
                )
                for _ in range(32)
            ]
        )

        with self.assertRaises(TeamSoftThrottleError):
            claim_ai_credit(workspace_id=workspace.id, user_id=owner.user_id, now=now)
