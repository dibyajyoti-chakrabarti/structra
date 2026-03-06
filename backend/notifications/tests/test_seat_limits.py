from django.contrib.auth import get_user_model
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
class TeamSeatLimitInvitationTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="owner@example.com",
            username="owneruser",
            password="password123",
            full_name="Owner User",
            current_plan="TEAM",
            purchased_team_seats=2,
        )
        self.workspace = Workspace.objects.create(name="Seat Limited WS", owner=self.owner)
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.owner,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )

    def test_invitation_create_blocks_when_team_seat_limit_reached(self):
        existing_member = User.objects.create_user(
            email="member1@example.com",
            username="member1",
            password="password123",
            full_name="Member One",
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=existing_member,
            role=WorkspaceRole.MEMBER,
            joined_at=timezone.now(),
        )

        self.client.force_authenticate(user=self.owner)
        response = self.client.post(
            reverse("workspace-invitations-create", kwargs={"workspace_id": self.workspace.id}),
            {"email": "member2@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response.data["error"],
            "Seat limit reached. You have purchased 2 total seats. Please upgrade your subscription quantity to invite more members.",
        )

    def test_invitation_accept_blocks_when_team_seat_limit_reached(self):
        existing_member = User.objects.create_user(
            email="member1@example.com",
            username="existingmember",
            password="password123",
            full_name="Existing Member",
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=existing_member,
            role=WorkspaceRole.MEMBER,
            joined_at=timezone.now(),
        )

        invited_user = User.objects.create_user(
            email="invited@example.com",
            username="invitedmember",
            password="password123",
            full_name="Invited User",
        )
        invitation = Invitation.objects.create(
            workspace=self.workspace,
            email=invited_user.email,
            invited_by=self.owner,
            status=InvitationStatus.PENDING,
            role=WorkspaceRole.MEMBER,
        )

        self.client.force_authenticate(user=invited_user)
        response = self.client.post(
            reverse("invitation-accept"),
            {"token": invitation.token},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response.data["error"],
            "Seat limit reached. You have purchased 2 total seats. Please upgrade your subscription quantity to invite more members.",
        )
