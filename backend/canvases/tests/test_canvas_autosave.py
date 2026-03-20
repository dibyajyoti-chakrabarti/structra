import uuid

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from canvases.models import Canvas
from core.constants import CanvasRole, WorkspaceRole
from permissions.models import CanvasPermission, WorkspaceMember
from workspaces.models import Workspace


User = get_user_model()


class CanvasAutosaveAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="autosave-admin@example.com",
            username="autosaveadmin",
            password="password123",
            full_name="Autosave Admin",
        )
        self.workspace = Workspace.objects.create(name="Autosave Workspace", owner=self.admin)
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.admin,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )
        self.editor = User.objects.create_user(
            email="autosave-editor@example.com",
            username="autosaveeditor",
            password="password123",
            full_name="Autosave Editor",
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.editor,
            role=WorkspaceRole.MEMBER,
            joined_at=timezone.now(),
        )
        self.viewer = User.objects.create_user(
            email="autosave-viewer@example.com",
            username="autosaveviewer",
            password="password123",
            full_name="Autosave Viewer",
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.viewer,
            role=WorkspaceRole.MEMBER,
            joined_at=timezone.now(),
        )
        self.canvas = Canvas.objects.create(
            name="Autosave Canvas",
            workspace=self.workspace,
            visibility="private",
            last_modified_by=self.admin,
        )
        CanvasPermission.objects.create(system=self.canvas, user=self.editor, role=CanvasRole.EDITOR)
        CanvasPermission.objects.create(system=self.canvas, user=self.viewer, role=CanvasRole.VIEWER)
        self.autosave_url = reverse("system-canvas-autosave", kwargs={"id": self.canvas.id})

    def _canvas_state(self):
        node_id = str(uuid.uuid4())
        return {
            "nodes": [
                {
                    "id": node_id,
                    "type": "CLIENT",
                    "label": "Client",
                    "position": {"x": 1, "y": 2},
                    "metadata": {},
                }
            ],
            "edges": [],
            "viewport": {"zoom": 1, "pan": {"x": 0, "y": 0}},
        }

    def test_editor_can_autosave_canvas_state(self):
        self.client.force_authenticate(user=self.editor)

        response = self.client.put(
            self.autosave_url,
            {"canvasState": self._canvas_state()},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.canvas.refresh_from_db()
        self.assertEqual(self.canvas.canvas_state["nodes"][0]["label"], "Client")

    def test_viewer_cannot_autosave_canvas_state(self):
        self.client.force_authenticate(user=self.viewer)

        response = self.client.put(
            self.autosave_url,
            {"canvasState": self._canvas_state()},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_autosave_with_invalid_canvas_state_shape_returns_400(self):
        self.client.force_authenticate(user=self.editor)

        response = self.client.put(
            self.autosave_url,
            {"canvasState": {"nodes": "invalid"}},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_autosave_updates_last_modified_by_to_the_requesting_user(self):
        self.client.force_authenticate(user=self.editor)

        response = self.client.put(
            self.autosave_url,
            {"canvasState": self._canvas_state()},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.canvas.refresh_from_db()
        self.assertEqual(self.canvas.last_modified_by, self.editor)
