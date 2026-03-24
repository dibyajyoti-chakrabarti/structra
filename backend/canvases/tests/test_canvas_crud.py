import uuid

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from canvases.models import Canvas
from core.constants import CanvasRole, WorkspaceRole, WorkspaceVisibility
from permissions.models import CanvasPermission, WorkspaceMember
from workspaces.models import Workspace


User = get_user_model()


class CanvasCRUDAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="canvas-admin@example.com",
            username="canvasadmin",
            password="password123",
            full_name="Canvas Admin",
        )
        self.workspace = Workspace.objects.create(name="Canvas Workspace", owner=self.admin)
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.admin,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )
        self.member = User.objects.create_user(
            email="canvas-member@example.com",
            username="canvasmember",
            password="password123",
            full_name="Canvas Member",
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.member,
            role=WorkspaceRole.MEMBER,
            joined_at=timezone.now(),
        )
        self.viewer = User.objects.create_user(
            email="canvas-viewer@example.com",
            username="canvasviewer",
            password="password123",
            full_name="Canvas Viewer",
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.viewer,
            role=WorkspaceRole.MEMBER,
            joined_at=timezone.now(),
        )
        self.outsider = User.objects.create_user(
            email="canvas-outsider@example.com",
            username="canvasoutsider",
            password="password123",
            full_name="Canvas Outsider",
        )
        self.list_url = reverse("canvas-list-create", kwargs={"workspace_id": self.workspace.id})

    def _valid_canvas_state(self):
        node_id = str(uuid.uuid4())
        return {
            "nodes": [
                {
                    "id": node_id,
                    "type": "CLIENT",
                    "label": "Client",
                    "position": {"x": 0, "y": 0},
                    "metadata": {},
                }
            ],
            "edges": [],
            "viewport": {"zoom": 1, "pan": {"x": 0, "y": 0}},
        }

    def test_workspace_admin_can_create_a_canvas(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.list_url,
            {"name": "System One", "canvas_state": self._valid_canvas_state()},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Canvas.objects.filter(workspace=self.workspace, name="System One").exists())

    def test_canvas_creator_automatically_gets_editor_permission(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.list_url,
            {"name": "System Two", "canvas_state": self._valid_canvas_state()},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        canvas = Canvas.objects.get(name="System Two")
        permission = CanvasPermission.objects.get(system=canvas, user=self.admin)
        self.assertEqual(permission.role, CanvasRole.EDITOR)

    def test_non_admin_member_cannot_create_a_canvas(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.post(
            self.list_url,
            {"name": "Blocked Canvas", "canvas_state": self._valid_canvas_state()},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_core_plan_workspace_cannot_exceed_three_canvases(self):
        for index in range(3):
            Canvas.objects.create(
                name=f"System {index}",
                workspace=self.workspace,
                visibility=WorkspaceVisibility.PRIVATE,
                last_modified_by=self.admin,
            )
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.list_url,
            {"name": "System 4", "canvas_state": self._valid_canvas_state()},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_canvas_name_must_be_unique_per_workspace(self):
        Canvas.objects.create(
            name="Unique Canvas",
            workspace=self.workspace,
            visibility=WorkspaceVisibility.PRIVATE,
            last_modified_by=self.admin,
        )
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.list_url,
            {"name": "Unique Canvas", "canvas_state": self._valid_canvas_state()},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["name"][0],
            "A canvas with this name already exists in this workspace.",
        )

    def test_canvas_in_a_private_workspace_cannot_be_set_to_public_visibility(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.list_url,
            {
                "name": "Private Workspace Canvas",
                "visibility": WorkspaceVisibility.PUBLIC,
                "canvas_state": self._valid_canvas_state(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("visibility", response.data)

    def test_admin_can_retrieve_all_canvases_in_a_workspace(self):
        Canvas.objects.create(
            name="System A",
            workspace=self.workspace,
            visibility=WorkspaceVisibility.PRIVATE,
            last_modified_by=self.admin,
        )
        Canvas.objects.create(
            name="System B",
            workspace=self.workspace,
            visibility=WorkspaceVisibility.PRIVATE,
            last_modified_by=self.admin,
        )
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_member_with_explicit_permission_can_retrieve_that_canvas(self):
        canvas = Canvas.objects.create(
            name="Shared Canvas",
            workspace=self.workspace,
            visibility=WorkspaceVisibility.PRIVATE,
            last_modified_by=self.admin,
        )
        CanvasPermission.objects.create(system=canvas, user=self.member, role=CanvasRole.VIEWER)
        self.client.force_authenticate(user=self.member)

        response = self.client.get(
            reverse("canvas-detail", kwargs={"workspace_id": self.workspace.id, "id": canvas.id})
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], canvas.id)

    def test_member_without_permission_cannot_retrieve_a_private_canvas(self):
        canvas = Canvas.objects.create(
            name="Hidden Canvas",
            workspace=self.workspace,
            visibility=WorkspaceVisibility.PRIVATE,
            last_modified_by=self.admin,
        )
        self.client.force_authenticate(user=self.member)

        response = self.client.get(
            reverse("canvas-detail", kwargs={"workspace_id": self.workspace.id, "id": canvas.id})
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_can_update_canvas_name_and_visibility(self):
        public_workspace = Workspace.objects.create(
            name="Public Canvas Workspace",
            owner=self.admin,
            visibility=WorkspaceVisibility.PUBLIC,
        )
        WorkspaceMember.objects.create(
            workspace=public_workspace,
            user=self.admin,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )
        canvas = Canvas.objects.create(
            name="Editable Canvas",
            workspace=public_workspace,
            visibility=WorkspaceVisibility.PRIVATE,
            last_modified_by=self.admin,
        )
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            reverse("canvas-detail", kwargs={"workspace_id": public_workspace.id, "id": canvas.id}),
            {"name": "Edited Canvas", "visibility": WorkspaceVisibility.PUBLIC},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        canvas.refresh_from_db()
        self.assertEqual(canvas.name, "Edited Canvas")
        self.assertEqual(canvas.visibility, WorkspaceVisibility.PUBLIC)

    def test_editor_member_can_update_canvas_non_name_fields(self):
        canvas = Canvas.objects.create(
            name="Member Editable Canvas",
            workspace=self.workspace,
            visibility=WorkspaceVisibility.PRIVATE,
            last_modified_by=self.admin,
        )
        CanvasPermission.objects.create(system=canvas, user=self.member, role=CanvasRole.EDITOR)
        self.client.force_authenticate(user=self.member)

        response = self.client.patch(
            reverse("canvas-detail", kwargs={"workspace_id": self.workspace.id, "id": canvas.id}),
            {"description": "Updated by editor member"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        canvas.refresh_from_db()
        self.assertEqual(canvas.description, "Updated by editor member")

    def test_editor_member_cannot_rename_canvas(self):
        canvas = Canvas.objects.create(
            name="Rename Protected Canvas",
            workspace=self.workspace,
            visibility=WorkspaceVisibility.PRIVATE,
            last_modified_by=self.admin,
        )
        CanvasPermission.objects.create(system=canvas, user=self.member, role=CanvasRole.EDITOR)
        self.client.force_authenticate(user=self.member)

        response = self.client.patch(
            reverse("canvas-detail", kwargs={"workspace_id": self.workspace.id, "id": canvas.id}),
            {"name": "Member Renamed Canvas"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["detail"], "Only workspace admins can rename systems.")
        canvas.refresh_from_db()
        self.assertEqual(canvas.name, "Rename Protected Canvas")

    def test_viewer_member_cannot_update_canvas(self):
        canvas = Canvas.objects.create(
            name="Viewer Canvas",
            workspace=self.workspace,
            visibility=WorkspaceVisibility.PRIVATE,
            last_modified_by=self.admin,
        )
        CanvasPermission.objects.create(system=canvas, user=self.viewer, role=CanvasRole.VIEWER)
        self.client.force_authenticate(user=self.viewer)

        response = self.client.patch(
            reverse("canvas-detail", kwargs={"workspace_id": self.workspace.id, "id": canvas.id}),
            {"name": "Blocked Update"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_can_delete_canvas(self):
        canvas = Canvas.objects.create(
            name="Delete Canvas",
            workspace=self.workspace,
            visibility=WorkspaceVisibility.PRIVATE,
            last_modified_by=self.admin,
        )
        self.client.force_authenticate(user=self.admin)

        response = self.client.delete(
            reverse("canvas-detail", kwargs={"workspace_id": self.workspace.id, "id": canvas.id})
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Canvas.objects.filter(id=canvas.id).exists())

    def test_non_admin_cannot_delete_canvas(self):
        canvas = Canvas.objects.create(
            name="Protected Canvas",
            workspace=self.workspace,
            visibility=WorkspaceVisibility.PRIVATE,
            last_modified_by=self.admin,
        )
        self.client.force_authenticate(user=self.viewer)

        response = self.client.delete(
            reverse("canvas-detail", kwargs={"workspace_id": self.workspace.id, "id": canvas.id})
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
