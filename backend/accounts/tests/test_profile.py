from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from core.constants import WorkspaceRole, WorkspaceVisibility
from permissions.models import WorkspaceMember
from workspaces.models import Workspace


User = get_user_model()


class UserProfileAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="profile@example.com",
            username="profileuser",
            password="password123",
            full_name="Profile User",
            org_name="Old Org",
            org_loc="Old City",
        )
        self.workspace = Workspace.objects.create(
            name="Profile Workspace",
            owner=self.user,
            visibility=WorkspaceVisibility.PUBLIC,
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.user,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )
        self.other_user = User.objects.create_user(
            email="other@example.com",
            username="otheruser",
            password="password123",
            full_name="Other User",
        )
        self.profile_url = reverse("profile")
        self.public_profile_url = reverse(
            "user-public-profile",
            kwargs={"username": self.user.username},
        )
        self.user_search_url = reverse("user-trigram-search")
        self.username_available_url = reverse("username-available")
        self.client.force_authenticate(user=self.other_user)

    def test_authenticated_user_can_retrieve_their_own_profile(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.get(self.profile_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], self.user.email)
        self.assertEqual(response.data["username"], self.user.username)

    def test_authenticated_user_can_update_full_name_username_org_name_org_loc(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            self.profile_url,
            {
                "full_name": "Updated Name",
                "username": "updateduser",
                "org_name": "Updated Org",
                "org_loc": "Updated City",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.full_name, "Updated Name")
        self.assertEqual(self.user.username, "updateduser")
        self.assertEqual(self.user.org_name, "Updated Org")
        self.assertEqual(self.user.org_loc, "Updated City")

    def test_cannot_update_email_or_current_plan_via_profile_endpoint(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            self.profile_url,
            {
                "email": "changed@example.com",
                "current_plan": User.CurrentPlan.TEAM,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "profile@example.com")
        self.assertEqual(self.user.current_plan, User.CurrentPlan.CORE)

    def test_username_uniqueness_is_enforced_on_update(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.patch(
            self.profile_url,
            {"username": self.other_user.username},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_public_user_profile_is_visible_by_username(self):
        response = self.client.get(self.public_profile_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], self.user.username)
        self.assertEqual(response.data["workspace_count"], 1)

    def test_public_user_profile_returns_404_for_non_existent_username(self):
        response = self.client.get(
            reverse("user-public-profile", kwargs={"username": "missing-user"})
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_search_returns_results_with_trigram_similarity(self):
        matching_user = User.objects.create_user(
            email="architect@example.com",
            username="systemarchitect",
            password="password123",
            full_name="Systems Architect",
        )

        response = self.client.get(self.user_search_url, {"q": "architect"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(
            str(matching_user.user_id),
            [entry["id"] for entry in response.data],
        )

    def test_username_availability_check_returns_true_for_unused_username(self):
        response = self.client.get(self.username_available_url, {"username": "availableuser"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["available"])

    def test_username_availability_check_returns_false_for_taken_username(self):
        response = self.client.get(self.username_available_url, {"username": self.user.username})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["available"])
