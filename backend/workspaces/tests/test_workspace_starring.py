from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from core.constants import WorkspaceRole, WorkspaceVisibility
from permissions.models import WorkspaceMember
from workspaces.models import Workspace, WorkspaceStar


User = get_user_model()


class WorkspaceStarringAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="star-user@example.com",
            username="staruser",
            password="password123",
            full_name="Star User",
        )
        self.workspace = Workspace.objects.create(name="Starred Workspace", owner=self.user)
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.user,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )
        self.public_owner = User.objects.create_user(
            email="public-owner@example.com",
            username="publicowner",
            password="password123",
            full_name="Public Owner",
        )
        self.public_workspace = Workspace.objects.create(
            name="Public Workspace",
            owner=self.public_owner,
            visibility=WorkspaceVisibility.PUBLIC,
        )
        WorkspaceMember.objects.create(
            workspace=self.public_workspace,
            user=self.public_owner,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )
        self.private_owner = User.objects.create_user(
            email="private-owner@example.com",
            username="privateowner",
            password="password123",
            full_name="Private Owner",
        )
        self.private_workspace = Workspace.objects.create(
            name="Private Workspace",
            owner=self.private_owner,
        )
        WorkspaceMember.objects.create(
            workspace=self.private_workspace,
            user=self.private_owner,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )
        self.client.force_authenticate(user=self.user)

    def test_authenticated_user_can_star_a_workspace_they_are_a_member_of(self):
        response = self.client.patch(
            reverse("workspace-star-toggle", kwargs={"id": self.workspace.id}),
            {"is_starred": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            WorkspaceStar.objects.filter(workspace=self.workspace, user=self.user).exists()
        )

    def test_authenticated_user_can_star_a_public_workspace(self):
        response = self.client.patch(
            reverse("workspace-star-toggle", kwargs={"id": self.public_workspace.id}),
            {"is_starred": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            WorkspaceStar.objects.filter(workspace=self.public_workspace, user=self.user).exists()
        )

    def test_authenticated_user_cannot_star_a_workspace_they_have_no_access_to(self):
        response = self.client.patch(
            reverse("workspace-star-toggle", kwargs={"id": self.private_workspace.id}),
            {"is_starred": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_starring_is_idempotent_starring_twice_stays_starred(self):
        first = self.client.patch(
            reverse("workspace-star-toggle", kwargs={"id": self.workspace.id}),
            {"is_starred": True},
            format="json",
        )
        second = self.client.patch(
            reverse("workspace-star-toggle", kwargs={"id": self.workspace.id}),
            {"is_starred": True},
            format="json",
        )

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(
            WorkspaceStar.objects.filter(workspace=self.workspace, user=self.user).count(),
            1,
        )

    def test_user_can_unstar_a_workspace(self):
        WorkspaceStar.objects.create(workspace=self.workspace, user=self.user)

        response = self.client.patch(
            reverse("workspace-star-toggle", kwargs={"id": self.workspace.id}),
            {"is_starred": False},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(
            WorkspaceStar.objects.filter(workspace=self.workspace, user=self.user).exists()
        )

    def test_starred_workspaces_list_returns_only_starred_workspaces(self):
        WorkspaceStar.objects.create(workspace=self.workspace, user=self.user)
        WorkspaceStar.objects.create(workspace=self.public_workspace, user=self.user)

        response = self.client.get(reverse("workspace-starred-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {entry["id"] for entry in response.data}
        self.assertEqual(returned_ids, {self.workspace.id, self.public_workspace.id})
