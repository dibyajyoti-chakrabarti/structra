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


class SystemPermissionAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="system-perm-admin@example.com",
            username="systempermadmin",
            password="password123",
            full_name="System Perm Admin",
        )
        self.workspace = Workspace.objects.create(name="System Permission Workspace", owner=self.admin)
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.admin,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )
        self.member = User.objects.create_user(
            email="system-perm-member@example.com",
            username="systempermmember",
            password="password123",
            full_name="System Perm Member",
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.member,
            role=WorkspaceRole.MEMBER,
            joined_at=timezone.now(),
        )
        self.non_member = User.objects.create_user(
            email="system-perm-nonmember@example.com",
            username="systempermnonmember",
            password="password123",
            full_name="System Perm Non Member",
        )
        self.canvas = Canvas.objects.create(
            name="Permission Canvas",
            workspace=self.workspace,
            visibility="private",
            last_modified_by=self.admin,
        )
        self.list_url = reverse(
            "workspace-system-permissions",
            kwargs={"workspace_id": self.workspace.id},
        )
        self.grant_url = reverse(
            "system-permission-grant",
            kwargs={"workspace_id": self.workspace.id, "system_id": self.canvas.id},
        )

    def test_admin_can_list_all_system_permissions_for_a_workspace(self):
        CanvasPermission.objects.create(system=self.canvas, user=self.member, role=CanvasRole.VIEWER)
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["system_id"], self.canvas.id)
        self.assertEqual(response.data[0]["permissions"][0]["user_id"], str(self.member.user_id))

    def test_non_admin_cannot_list_system_permissions(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_grant_a_workspace_member_access_to_a_canvas_with_a_specific_role(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.grant_url,
            {"user_id": str(self.member.user_id), "role": CanvasRole.EDITOR},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        permission = CanvasPermission.objects.get(system=self.canvas, user=self.member)
        self.assertEqual(permission.role, CanvasRole.EDITOR)

    def test_admin_cannot_grant_access_to_a_non_member(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.grant_url,
            {"user_id": str(self.non_member.user_id), "role": CanvasRole.VIEWER},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_can_revoke_canvas_access_from_a_user(self):
        CanvasPermission.objects.create(system=self.canvas, user=self.member, role=CanvasRole.VIEWER)
        self.client.force_authenticate(user=self.admin)

        response = self.client.delete(
            reverse(
                "system-permission-revoke",
                kwargs={
                    "workspace_id": self.workspace.id,
                    "system_id": self.canvas.id,
                    "user_id": self.member.user_id,
                },
            )
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(CanvasPermission.objects.filter(system=self.canvas, user=self.member).exists())

    def test_granting_permission_to_a_user_who_already_has_one_updates_the_role_upsert(self):
        CanvasPermission.objects.create(system=self.canvas, user=self.member, role=CanvasRole.VIEWER)
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.grant_url,
            {"user_id": str(self.member.user_id), "role": CanvasRole.COMMENTER},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        permission = CanvasPermission.objects.get(system=self.canvas, user=self.member)
        self.assertEqual(permission.role, CanvasRole.COMMENTER)
