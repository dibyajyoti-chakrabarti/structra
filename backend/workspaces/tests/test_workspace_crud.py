from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from systems.models import Canvas
from core.constants import WorkspaceRole, WorkspaceVisibility
from permissions.models import WorkspaceMember
from workspaces.models import Workspace


User = get_user_model()


class WorkspaceCRUDAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="workspace-owner@example.com",
            username="workspaceowner",
            password="password123",
            full_name="Workspace Owner",
        )
        self.workspace = Workspace.objects.create(
            name="Owner Workspace",
            owner=self.user,
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.user,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )
        self.member = User.objects.create_user(
            email="workspace-member@example.com",
            username="workspacemember",
            password="password123",
            full_name="Workspace Member",
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.member,
            role=WorkspaceRole.MEMBER,
            joined_at=timezone.now(),
        )
        self.outsider = User.objects.create_user(
            email="workspace-outsider@example.com",
            username="workspaceoutsider",
            password="password123",
            full_name="Workspace Outsider",
        )
        self.list_url = reverse("workspace-list")

    def _create_workspace(self, owner, name, visibility=WorkspaceVisibility.PRIVATE):
        workspace = Workspace.objects.create(name=name, owner=owner, visibility=visibility)
        WorkspaceMember.objects.create(
            workspace=workspace,
            user=owner,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )
        return workspace

    def test_authenticated_user_can_create_a_workspace_creator_becomes_admin_member(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.post(
            self.list_url,
            {"name": "Created Workspace", "description": "Created from test"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_workspace = Workspace.objects.get(name="Created Workspace")
        membership = WorkspaceMember.objects.get(workspace=created_workspace, user=self.outsider)
        self.assertEqual(membership.role, WorkspaceRole.ADMIN)
        self.assertIsNotNone(membership.joined_at)

    def test_workspace_name_must_be_unique_per_owner(self):
        self.user.current_plan = User.CurrentPlan.INDIVIDUAL
        self.user.save(update_fields=["current_plan"])
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.list_url,
            {"name": self.workspace.name},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_core_plan_user_cannot_create_more_than_one_workspace(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.list_url,
            {"name": "Second Workspace"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_individual_plan_user_can_create_up_to_five_workspaces(self):
        self.user.current_plan = User.CurrentPlan.INDIVIDUAL
        self.user.save(update_fields=["current_plan"])
        for index in range(2, 5):
            self._create_workspace(self.user, f"Individual Workspace {index}")
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.list_url,
            {"name": "Individual Workspace 5"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Workspace.objects.filter(owner=self.user).count(), 5)

    def test_creator_can_retrieve_their_workspace(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(
            reverse("workspace-detail", kwargs={"id": self.workspace.id})
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.workspace.id)

    def test_creator_can_update_workspace_name_and_description(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse("workspace-detail", kwargs={"id": self.workspace.id}),
            {"name": "Renamed Workspace", "description": "Updated description"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.workspace.refresh_from_db()
        self.assertEqual(self.workspace.name, "Renamed Workspace")
        self.assertEqual(self.workspace.description, "Updated description")

    def test_creator_can_update_workspace_visibility(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse("workspace-detail", kwargs={"id": self.workspace.id}),
            {"visibility": WorkspaceVisibility.PUBLIC},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.workspace.refresh_from_db()
        self.assertEqual(self.workspace.visibility, WorkspaceVisibility.PUBLIC)

    def test_changing_workspace_from_public_to_private_also_sets_all_its_canvases_to_private(self):
        public_workspace = self._create_workspace(
            self.user,
            "Public Workspace",
            visibility=WorkspaceVisibility.PUBLIC,
        )
        canvas = Canvas.objects.create(
            name="Public Canvas",
            workspace=public_workspace,
            visibility=WorkspaceVisibility.PUBLIC,
            last_modified_by=self.user,
        )
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            reverse("workspace-detail", kwargs={"id": public_workspace.id}),
            {"visibility": WorkspaceVisibility.PRIVATE},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        canvas.refresh_from_db()
        self.assertEqual(canvas.visibility, WorkspaceVisibility.PRIVATE)

    def test_non_member_cannot_access_a_private_workspace(self):
        self.client.force_authenticate(user=self.outsider)

        response = self.client.get(
            reverse("workspace-detail", kwargs={"id": self.workspace.id})
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_anyone_can_access_a_public_workspace_get_only(self):
        public_workspace = self._create_workspace(
            self.user,
            "Browsable Workspace",
            visibility=WorkspaceVisibility.PUBLIC,
        )
        self.client.force_authenticate(user=self.outsider)

        get_response = self.client.get(
            reverse("workspace-detail", kwargs={"id": public_workspace.id})
        )
        patch_response = self.client.patch(
            reverse("workspace-detail", kwargs={"id": public_workspace.id}),
            {"description": "Blocked update"},
            format="json",
        )

        self.assertEqual(get_response.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_creator_can_delete_workspace(self):
        removable_workspace = self._create_workspace(self.user, "Removable Workspace")
        self.client.force_authenticate(user=self.user)

        response = self.client.delete(
            reverse("workspace-detail", kwargs={"id": removable_workspace.id})
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Workspace.objects.filter(id=removable_workspace.id).exists())

    def test_non_admin_member_cannot_delete_workspace(self):
        self.client.force_authenticate(user=self.member)

        response = self.client.delete(
            reverse("workspace-detail", kwargs={"id": self.workspace.id})
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_workspace_list_only_returns_workspaces_the_user_is_a_member_of(self):
        visible_workspace = self._create_workspace(self.member, "Member Owned Workspace")
        WorkspaceMember.objects.create(
            workspace=visible_workspace,
            user=self.user,
            role=WorkspaceRole.MEMBER,
            joined_at=timezone.now(),
        )
        hidden_workspace = self._create_workspace(self.outsider, "Hidden Workspace")
        self.client.force_authenticate(user=self.user)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {entry["id"] for entry in response.data}
        self.assertIn(self.workspace.id, returned_ids)
        self.assertIn(visible_workspace.id, returned_ids)
        self.assertNotIn(hidden_workspace.id, returned_ids)
