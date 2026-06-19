from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from systems.models import Canvas
from core.constants import CanvasRole, WorkspaceRole
from permissions.models import CanvasPermission, WorkspaceMember
from workspaces.models import Workspace


User = get_user_model()


class WorkspaceMemberAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="members-admin@example.com",
            username="membersadmin",
            password="password123",
            full_name="Members Admin",
        )
        self.workspace = Workspace.objects.create(name="Members Workspace", owner=self.admin)
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.admin,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )
        self.member = User.objects.create_user(
            email="members-user@example.com",
            username="membersuser",
            password="password123",
            full_name="Members User",
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.member,
            role=WorkspaceRole.MEMBER,
            joined_at=timezone.now(),
        )
        self.other_admin = User.objects.create_user(
            email="members-other-admin@example.com",
            username="membersotheradmin",
            password="password123",
            full_name="Members Other Admin",
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.other_admin,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )
        self.outsider = User.objects.create_user(
            email="members-outsider@example.com",
            username="membersoutsider",
            password="password123",
            full_name="Members Outsider",
        )
        self.canvas = Canvas.objects.create(
            name="Members Canvas",
            workspace=self.workspace,
            visibility="private",
            last_modified_by=self.admin,
        )
        CanvasPermission.objects.create(
            system=self.canvas,
            user=self.member,
            role=CanvasRole.EDITOR,
        )
        self.list_url = reverse("workspace-members", kwargs={"workspace_id": self.workspace.id})

    def test_admin_can_list_workspace_members(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)

    def test_non_member_cannot_list_workspace_members(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_remove_a_member(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.delete(
            reverse(
                "workspace-member-delete",
                kwargs={"workspace_id": self.workspace.id, "user_id": self.member.user_id},
            )
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        membership = WorkspaceMember.all_objects.get(workspace=self.workspace, user=self.member)
        self.assertIsNotNone(membership.left_at)

    def test_admin_cannot_remove_another_admin(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.delete(
            reverse(
                "workspace-member-delete",
                kwargs={"workspace_id": self.workspace.id, "user_id": self.other_admin.user_id},
            )
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_removing_a_member_also_removes_their_canvas_permissions_in_that_workspace(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.delete(
            reverse(
                "workspace-member-delete",
                kwargs={"workspace_id": self.workspace.id, "user_id": self.member.user_id},
            )
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(
            CanvasPermission.objects.filter(system=self.canvas, user=self.member).exists()
        )

    def test_non_admin_cannot_remove_a_member(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.delete(
            reverse(
                "workspace-member-delete",
                kwargs={"workspace_id": self.workspace.id, "user_id": self.other_admin.user_id},
            )
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
