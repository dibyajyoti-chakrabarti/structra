from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from canvases.models import Canvas
from core.constants import WorkspaceRole
from permissions.models import WorkspaceMember
from workspaces.models import Workspace

User = get_user_model()


class VoluntaryDowngradeTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="downgrade-owner@example.com",
            username="downgradeowner",
            password="password123",
            full_name="Downgrade Owner",
            current_plan="TEAM",
        )
        self.workspace = Workspace.objects.create(name="Downgrade WS", owner=self.user)
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.user,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )

        for idx in range(4):
            member = User.objects.create_user(
                email=f"member-{idx}@example.com",
                username=f"member{idx}",
                password="password123",
                full_name=f"Member {idx}",
            )
            WorkspaceMember.objects.create(
                workspace=self.workspace,
                user=member,
                role=WorkspaceRole.MEMBER,
                joined_at=timezone.now(),
            )

        self.url = reverse("payments-subscription-downgrade")
        self.client.force_authenticate(user=self.user)

    def test_voluntary_downgrade_to_individual_is_blocked_when_members_exceed_limit(self):
        response = self.client.post(self.url, {"target_plan": "INDIVIDUAL"}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("violations", response.data)
        self.assertEqual(
            WorkspaceMember.objects.filter(workspace=self.workspace, role=WorkspaceRole.MEMBER).count(),
            4,
        )
        self.workspace.refresh_from_db()
        self.assertIsNone(self.workspace.archived_at)


class ExpiryEnforcementCommandTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="expired-owner@example.com",
            username="expiredowner",
            password="password123",
            full_name="Expired Owner",
            current_plan="TEAM",
            plan_expires_at=timezone.now() - timedelta(days=20),
        )

        self.workspace_keep = Workspace.objects.create(name="Keep WS", owner=self.user)
        self.workspace_archive = Workspace.objects.create(name="Archive WS", owner=self.user)

        WorkspaceMember.objects.create(
            workspace=self.workspace_keep,
            user=self.user,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now() - timedelta(days=10),
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace_archive,
            user=self.user,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now() - timedelta(days=10),
        )

        invited = User.objects.create_user(
            email="invited@example.com",
            username="invitedmember",
            password="password123",
            full_name="Invited",
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace_keep,
            user=invited,
            role=WorkspaceRole.MEMBER,
            joined_at=timezone.now() - timedelta(days=5),
        )

        for idx in range(5):
            Canvas.objects.create(
                name=f"System {idx}",
                workspace=self.workspace_keep,
                visibility="private",
                last_modified_by=self.user,
            )

        Canvas.objects.create(
            name="Archive System",
            workspace=self.workspace_archive,
            visibility="private",
            last_modified_by=self.user,
        )

    def test_command_enforces_core_constraints_post_grace(self):
        call_command("enforce_expired_subscriptions")

        self.user.refresh_from_db()
        self.assertEqual(self.user.current_plan, User.CurrentPlan.CORE)

        archived_workspace = Workspace.all_objects.get(id=self.workspace_archive.id)
        self.assertIsNotNone(archived_workspace.archived_at)

        invited_membership = WorkspaceMember.all_objects.filter(
            workspace=self.workspace_keep,
            role=WorkspaceRole.MEMBER,
        ).first()
        self.assertIsNotNone(invited_membership)
        self.assertIsNotNone(invited_membership.left_at)

        active_system_count = Canvas.objects.filter(workspace=self.workspace_keep).count()
        self.assertEqual(active_system_count, 3)
