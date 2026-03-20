from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from core.constants import InvitationStatus, WorkspaceRole
from notifications.models import Invitation
from permissions.models import WorkspaceMember
from workspaces.models import Workspace


User = get_user_model()


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class InvitationAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="invite-admin@example.com",
            username="inviteadmin",
            password="password123",
            full_name="Invite Admin",
            current_plan="INDIVIDUAL",
        )
        self.workspace = Workspace.objects.create(name="Invite Workspace", owner=self.admin)
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.admin,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )
        self.member = User.objects.create_user(
            email="invite-member@example.com",
            username="invitemember",
            password="password123",
            full_name="Invite Member",
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.member,
            role=WorkspaceRole.MEMBER,
            joined_at=timezone.now(),
        )
        self.invited_user = User.objects.create_user(
            email="pending-invite@example.com",
            username="pendinginvite",
            password="password123",
            full_name="Pending Invite User",
        )
        self.other_user = User.objects.create_user(
            email="wrong-user@example.com",
            username="wronguser",
            password="password123",
            full_name="Wrong User",
        )
        self.create_url = reverse(
            "workspace-invitations-create",
            kwargs={"workspace_id": self.workspace.id},
        )

    def _create_invitation(self, email=None, expires_at=None):
        return Invitation.objects.create(
            workspace=self.workspace,
            email=email or self.invited_user.email,
            invited_by=self.admin,
            role=WorkspaceRole.MEMBER,
            status=InvitationStatus.PENDING,
            expires_at=expires_at or timezone.now() + timedelta(hours=24),
        )

    def test_admin_can_send_invitation_to_a_new_email(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.create_url,
            {"email": "new-invite@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Invitation.objects.filter(workspace=self.workspace, email="new-invite@example.com").exists()
        )

    def test_admin_cannot_invite_an_existing_workspace_member(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.create_url,
            {"email": self.member.email},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_cannot_send_duplicate_pending_invitation_to_same_email(self):
        self.client.force_authenticate(user=self.admin)
        self.client.post(self.create_url, {"email": "repeat@example.com"}, format="json")

        response = self.client.post(self.create_url, {"email": "repeat@example.com"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            Invitation.objects.filter(workspace=self.workspace, email="repeat@example.com").count(),
            1,
        )

    def test_sending_invitation_to_existing_pending_invite_resends_the_email(self):
        self.client.force_authenticate(user=self.admin)

        first = self.client.post(self.create_url, {"email": "resend@example.com"}, format="json")
        second = self.client.post(self.create_url, {"email": "resend@example.com"}, format="json")

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 2)

    def test_invitation_email_is_sent_on_creation(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.create_url,
            {"email": "email-check@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(self.workspace.name, mail.outbox[0].subject)

    def test_invited_user_can_view_their_pending_invitations(self):
        invitation = self._create_invitation()
        self.client.force_authenticate(user=self.invited_user)

        response = self.client.get(reverse("user-invitations"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["token"], invitation.token)

    def test_invited_user_can_accept_invitation_becomes_workspace_member(self):
        invitation = self._create_invitation()
        self.client.force_authenticate(user=self.invited_user)

        response = self.client.post(
            reverse("invitation-accept"),
            {"token": invitation.token},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            WorkspaceMember.objects.filter(workspace=self.workspace, user=self.invited_user).exists()
        )

    def test_accepting_invitation_with_wrong_email_returns_403(self):
        invitation = self._create_invitation()
        self.client.force_authenticate(user=self.other_user)

        response = self.client.post(
            reverse("invitation-accept"),
            {"token": invitation.token},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_accepting_an_expired_invitation_returns_400(self):
        invitation = self._create_invitation(expires_at=timezone.now() - timedelta(minutes=1))
        self.client.force_authenticate(user=self.invited_user)

        response = self.client.post(
            reverse("invitation-accept"),
            {"token": invitation.token},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invited_user_can_reject_invitation(self):
        invitation = self._create_invitation()

        response = self.client.post(
            reverse("invitation-reject"),
            {"token": invitation.token},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        invitation.refresh_from_db()
        self.assertEqual(invitation.status, InvitationStatus.REJECTED)

    def test_admin_can_cancel_a_pending_invitation(self):
        invitation = self._create_invitation(email="cancel@example.com")
        self.client.force_authenticate(user=self.admin)

        response = self.client.delete(
            reverse(
                "workspace-invitations-cancel",
                kwargs={"workspace_id": self.workspace.id, "token": invitation.token},
            )
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        invitation.refresh_from_db()
        self.assertEqual(invitation.status, InvitationStatus.REJECTED)

    def test_core_plan_workspace_cannot_invite_any_members(self):
        self.admin.current_plan = "CORE"
        self.admin.save(update_fields=["current_plan"])
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.create_url,
            {"email": "core-blocked@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_individual_plan_workspace_cannot_exceed_member_limit(self):
        for index in range(2):
            user = User.objects.create_user(
                email=f"extra-member-{index}@example.com",
                username=f"extramember{index}",
                password="password123",
                full_name=f"Extra Member {index}",
            )
            WorkspaceMember.objects.create(
                workspace=self.workspace,
                user=user,
                role=WorkspaceRole.MEMBER,
                joined_at=timezone.now(),
            )
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.create_url,
            {"email": "limit-blocked@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_anyone_can_view_invitation_details_via_token(self):
        invitation = self._create_invitation()

        response = self.client.get(
            reverse("invitation-details"),
            {"token": invitation.token},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["workspace_id"], self.workspace.id)
        self.assertEqual(response.data["email"], invitation.email)
