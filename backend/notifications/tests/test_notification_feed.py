from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from audit.services import record_workspace_event
from core.constants import WorkspaceRole
from notifications.models import AuditNotificationState
from permissions.models import WorkspaceMember
from workspaces.models import Workspace


User = get_user_model()


class NotificationFeedAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="feed-admin@example.com",
            username="feedadmin",
            password="password123",
            full_name="Feed Admin",
        )
        self.workspace = Workspace.objects.create(name="Feed Workspace", owner=self.admin)
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.admin,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )
        self.member = User.objects.create_user(
            email="feed-member@example.com",
            username="feedmember",
            password="password123",
            full_name="Feed Member",
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.member,
            role=WorkspaceRole.MEMBER,
            joined_at=timezone.now(),
        )
        self.log_one = record_workspace_event(
            workspace=self.workspace,
            actor=self.admin,
            action="Workspace Updated",
            category="workspace",
            target_name=self.workspace.name,
        )
        self.log_two = record_workspace_event(
            workspace=self.workspace,
            actor=self.admin,
            action="Member Removed",
            category="user",
            target_name=self.member.email,
        )
        self.feed_url = reverse("admin-notification-feed")

    def test_admin_can_view_notification_feed(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.feed_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unread_count"], 2)
        self.assertEqual(len(response.data["items"]), 2)

    def test_non_admin_cannot_view_notification_feed(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.get(self.feed_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unread_count"], 0)
        self.assertEqual(response.data["items"], [])

    def test_admin_can_mark_a_single_notification_as_read(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            reverse("admin-notification-mark-read", kwargs={"audit_log_id": self.log_one.id}),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            AuditNotificationState.objects.filter(user=self.admin, audit_log=self.log_one).exists()
        )

    def test_admin_can_mark_all_notifications_as_read(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(reverse("admin-notification-mark-all-read"), format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            AuditNotificationState.objects.filter(user=self.admin).count(),
            2,
        )

    def test_unread_count_decreases_after_marking_as_read(self):
        self.client.force_authenticate(user=self.admin)
        self.client.post(
            reverse("admin-notification-mark-read", kwargs={"audit_log_id": self.log_one.id}),
            format="json",
        )

        response = self.client.get(self.feed_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unread_count"], 1)
