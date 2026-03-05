from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from canvases.models import Canvas
from core.constants import WorkspaceRole
from permissions.models import WorkspaceMember
from workspaces.models import EvaluationRun, Workspace

User = get_user_model()


class EvaluationHourlyLimitTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="eval-owner@example.com",
            username="evalowner",
            password="password123",
            full_name="Eval Owner",
            current_plan="TEAM",
        )
        self.workspace = Workspace.objects.create(name="Eval Workspace", owner=self.user)
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.user,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )
        self.system = Canvas.objects.create(
            name="System",
            workspace=self.workspace,
            visibility="private",
            last_modified_by=self.user,
        )
        self.url = reverse("system-evaluate")
        self.client.force_authenticate(user=self.user)

    def test_blocks_after_ten_runs_in_last_hour(self):
        now = timezone.now()
        EvaluationRun.objects.bulk_create(
            [
                EvaluationRun(
                    workspace=self.workspace,
                    system_id=self.system.id,
                    user=self.user,
                    workspace_tier="team",
                    status=EvaluationRun.Status.COMPLETED,
                    created_at=now - timedelta(minutes=5),
                )
                for _ in range(10)
            ]
        )

        response = self.client.post(
            self.url,
            {
                "workspaceId": self.workspace.id,
                "systemId": self.system.id,
                "canvasState": {"nodes": [], "edges": []},
            },
            format="json",
        )

        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.data.get("error"), "rate_limit")
        self.assertIn("retryAfterSeconds", response.data)
