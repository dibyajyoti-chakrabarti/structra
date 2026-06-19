from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from audit.models import AuditLog, AuditScope
from audit.services import record_system_event, record_workspace_event
from systems.models import Canvas
from core.constants import CanvasRole, WorkspaceRole
from permissions.models import WorkspaceMember
from workspaces.models import Workspace


User = get_user_model()


class AuditLogAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="audit-admin@example.com",
            username="auditadmin",
            password="password123",
            full_name="Audit Admin",
            current_plan="INDIVIDUAL",
        )
        self.workspace = Workspace.objects.create(name="Audit Workspace", owner=self.admin)
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.admin,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )
        self.member = User.objects.create_user(
            email="audit-member@example.com",
            username="auditmember",
            password="password123",
            full_name="Audit Member",
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.member,
            role=WorkspaceRole.MEMBER,
            joined_at=timezone.now(),
        )
        self.outsider = User.objects.create_user(
            email="audit-outsider@example.com",
            username="auditoutsider",
            password="password123",
            full_name="Audit Outsider",
        )
        self.canvas = Canvas.objects.create(
            name="Audit Canvas",
            workspace=self.workspace,
            visibility="private",
            last_modified_by=self.admin,
        )
        self.logs_url = reverse("workspace-audit-logs", kwargs={"workspace_id": self.workspace.id})
        self.summary_url = reverse("workspace-audit-summary", kwargs={"workspace_id": self.workspace.id})

    def test_admin_can_retrieve_audit_log_list_for_their_workspace(self):
        record_workspace_event(
            workspace=self.workspace,
            actor=self.admin,
            action="Workspace Updated",
            category="workspace",
        )
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.logs_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_non_admin_cannot_retrieve_audit_logs(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.get(self.logs_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_audit_log_is_created_when_workspace_is_created(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            reverse("workspace-list"),
            {"name": "Workspace Created Through API"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_workspace = Workspace.objects.get(name="Workspace Created Through API")
        self.assertTrue(
            AuditLog.objects.filter(workspace=created_workspace, action="Workspace Created").exists()
        )

    def test_audit_log_is_created_when_a_member_is_removed(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.delete(
            reverse(
                "workspace-member-delete",
                kwargs={"workspace_id": self.workspace.id, "user_id": self.member.user_id},
            )
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            AuditLog.objects.filter(workspace=self.workspace, action="Member Removed").exists()
        )

    def test_audit_log_is_created_when_canvas_permission_is_granted(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            reverse(
                "system-permission-grant",
                kwargs={"workspace_id": self.workspace.id, "system_id": self.canvas.id},
            ),
            {"user_id": str(self.member.user_id), "role": CanvasRole.VIEWER},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            AuditLog.objects.filter(workspace=self.workspace, action="Permission Granted").exists()
        )

    def test_audit_log_is_created_when_canvas_permission_is_revoked(self):
        self.client.force_authenticate(user=self.admin)
        self.client.post(
            reverse(
                "system-permission-grant",
                kwargs={"workspace_id": self.workspace.id, "system_id": self.canvas.id},
            ),
            {"user_id": str(self.member.user_id), "role": CanvasRole.VIEWER},
            format="json",
        )

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
        self.assertTrue(
            AuditLog.objects.filter(workspace=self.workspace, action="Permission Revoked").exists()
        )

    def test_audit_log_summary_returns_correct_counts_for_last_thirty_days(self):
        recent_log = record_workspace_event(
            workspace=self.workspace,
            actor=self.admin,
            action="Recent Event",
            category="workspace",
        )
        old_log = record_workspace_event(
            workspace=self.workspace,
            actor=self.admin,
            action="Old Event",
            category="workspace",
        )
        AuditLog.objects.filter(id=recent_log.id).update(created_at=timezone.now() - timedelta(days=5))
        AuditLog.objects.filter(id=old_log.id).update(created_at=timezone.now() - timedelta(days=40))
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.summary_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_events_30d"], 1)
        self.assertEqual(response.data["active_users_30d"], 1)

    def test_audit_logs_can_be_filtered_by_scope_workspace_vs_system(self):
        workspace_log = record_workspace_event(
            workspace=self.workspace,
            actor=self.admin,
            action="Workspace Event",
            category="workspace",
        )
        record_system_event(
            workspace=self.workspace,
            system=self.canvas,
            actor=self.admin,
            action="System Event",
            category="system",
        )
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.logs_url, {"scope": AuditScope.WORKSPACE})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(str(response.data[0]["id"]), str(workspace_log.id))

    def test_audit_logs_can_be_filtered_by_category(self):
        record_workspace_event(
            workspace=self.workspace,
            actor=self.admin,
            action="Workspace Event",
            category="workspace",
        )
        record_workspace_event(
            workspace=self.workspace,
            actor=self.admin,
            action="Security Event",
            category="security",
        )
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.logs_url, {"category": "security"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["category"], "security")

    def test_audit_logs_can_be_searched_by_action_name(self):
        record_workspace_event(
            workspace=self.workspace,
            actor=self.admin,
            action="Workspace Archived",
            category="workspace",
        )
        record_workspace_event(
            workspace=self.workspace,
            actor=self.admin,
            action="Workspace Updated",
            category="workspace",
        )
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.logs_url, {"q": "Archived"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["action"], "Workspace Archived")
