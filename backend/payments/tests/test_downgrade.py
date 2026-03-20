from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from core.constants import WorkspaceRole
from permissions.models import WorkspaceMember
from workspaces.models import Workspace


User = get_user_model()


class VoluntaryDowngradeAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="downgrade-owner@example.com",
            username="downgradeowner",
            password="password123",
            full_name="Downgrade Owner",
            current_plan="TEAM",
        )
        self.workspace = Workspace.objects.create(name="Downgrade Workspace", owner=self.user)
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.user,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )
        self.url = reverse("payments-subscription-downgrade")
        self.client.force_authenticate(user=self.user)

    def test_downgrade_to_individual_blocked_if_any_workspace_has_more_than_three_members(self):
        for index in range(4):
            member = User.objects.create_user(
                email=f"downgrade-member-{index}@example.com",
                username=f"downgrademember{index}",
                password="password123",
                full_name=f"Downgrade Member {index}",
            )
            WorkspaceMember.objects.create(
                workspace=self.workspace,
                user=member,
                role=WorkspaceRole.MEMBER,
                joined_at=timezone.now(),
            )

        response = self.client.post(self.url, {"target_plan": "INDIVIDUAL"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["error"],
            "Downgrade to Individual blocked. Reduce invited members to at most 3 per workspace.",
        )
        self.assertEqual(len(response.data["violations"]), 1)

    def test_downgrade_to_core_blocked_if_user_has_more_than_one_workspace(self):
        second_workspace = Workspace.objects.create(name="Second Workspace", owner=self.user)
        WorkspaceMember.objects.create(
            workspace=second_workspace,
            user=self.user,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )

        response = self.client.post(self.url, {"target_plan": "CORE"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["error"],
            "Downgrade to Core blocked. You must keep exactly one active workspace.",
        )
        self.assertEqual(int(response.data["active_workspace_count"]), 2)

    def test_downgrade_to_core_blocked_if_workspace_has_any_invited_members(self):
        member = User.objects.create_user(
            email="downgrade-core-member@example.com",
            username="downgradecoremember",
            password="password123",
            full_name="Downgrade Core Member",
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=member,
            role=WorkspaceRole.MEMBER,
            joined_at=timezone.now(),
        )

        response = self.client.post(self.url, {"target_plan": "CORE"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["error"],
            "Downgrade to Core blocked. Remove all invited members first.",
        )
        self.assertEqual(response.data["workspace_id"], self.workspace.id)
        self.assertEqual(int(response.data["invited_members"]), 1)
