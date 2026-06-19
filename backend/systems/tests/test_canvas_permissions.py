from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from systems.models import Canvas
from core.constants import CanvasRole, WorkspaceRole, WorkspaceVisibility
from permissions.models import CanvasPermission, WorkspaceMember
from workspaces.models import Workspace


User = get_user_model()


class CanvasPermissionAccessTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="permissions-admin@example.com",
            username="permissionsadmin",
            password="password123",
            full_name="Permissions Admin",
        )
        self.public_workspace = Workspace.objects.create(
            name="Public Workspace",
            owner=self.admin,
            visibility=WorkspaceVisibility.PUBLIC,
        )
        WorkspaceMember.objects.create(
            workspace=self.public_workspace,
            user=self.admin,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )
        self.private_workspace = Workspace.objects.create(
            name="Private Workspace",
            owner=self.admin,
        )
        WorkspaceMember.objects.create(
            workspace=self.private_workspace,
            user=self.admin,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )
        self.member = User.objects.create_user(
            email="permissions-member@example.com",
            username="permissionsmember",
            password="password123",
            full_name="Permissions Member",
        )
        WorkspaceMember.objects.create(
            workspace=self.private_workspace,
            user=self.member,
            role=WorkspaceRole.MEMBER,
            joined_at=timezone.now(),
        )
        self.outsider = User.objects.create_user(
            email="permissions-outsider@example.com",
            username="permissionsoutsider",
            password="password123",
            full_name="Permissions Outsider",
        )
        self.public_canvas = Canvas.objects.create(
            name="Public Canvas",
            workspace=self.public_workspace,
            visibility=WorkspaceVisibility.PUBLIC,
            last_modified_by=self.admin,
        )
        self.private_canvas = Canvas.objects.create(
            name="Private Canvas",
            workspace=self.private_workspace,
            visibility=WorkspaceVisibility.PRIVATE,
            last_modified_by=self.admin,
        )

    def test_canvas_visibility_public_means_anyone_can_read_it(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.get(
            reverse(
                "canvas-detail",
                kwargs={"workspace_id": self.public_workspace.id, "id": self.public_canvas.id},
            )
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_canvas_visibility_private_means_only_members_with_explicit_permission_can_read_it(self):
        self.client.force_authenticate(user=self.member)
        denied_response = self.client.get(
            reverse(
                "canvas-detail",
                kwargs={"workspace_id": self.private_workspace.id, "id": self.private_canvas.id},
            )
        )
        CanvasPermission.objects.create(
            system=self.private_canvas,
            user=self.member,
            role=CanvasRole.VIEWER,
        )
        allowed_response = self.client.get(
            reverse(
                "canvas-detail",
                kwargs={"workspace_id": self.private_workspace.id, "id": self.private_canvas.id},
            )
        )

        self.assertEqual(denied_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(allowed_response.status_code, status.HTTP_200_OK)
