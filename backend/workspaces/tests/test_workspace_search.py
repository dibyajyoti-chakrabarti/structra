from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.constants import WorkspaceVisibility
from workspaces.models import Workspace
from workspaces.throttles import AnonymousPublicWorkspaceSearchThrottle


User = get_user_model()


class WorkspaceSearchAPITests(APITestCase):
    def setUp(self):
        cache.clear()
        self.owner = User.objects.create_user(
            email="search-owner@example.com",
            username="searchowner",
            password="password123",
            full_name="Search Owner",
        )
        self.matching_workspace = Workspace.objects.create(
            name="Architecture Search Hub",
            owner=self.owner,
            visibility=WorkspaceVisibility.PUBLIC,
        )
        Workspace.objects.create(
            name="Internal Private Space",
            owner=self.owner,
            visibility=WorkspaceVisibility.PRIVATE,
        )
        self.search_url = reverse("workspace-public-search")

    def test_public_workspace_search_returns_results_matching_query(self):
        response = self.client.get(self.search_url, {"q": "Architecture"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        result_ids = [entry["id"] for entry in response.data["results"]]
        self.assertIn(self.matching_workspace.id, result_ids)

    def test_public_workspace_search_returns_empty_list_for_no_match(self):
        response = self.client.get(self.search_url, {"q": "DoesNotExist"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"], [])

    def test_private_workspaces_do_not_appear_in_public_search(self):
        response = self.client.get(self.search_url, {"q": "Private"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"], [])

    def test_anonymous_users_can_search_public_workspaces(self):
        response = self.client.get(self.search_url, {"q": "Search"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["count"], 1)

    def test_anonymous_users_are_throttled_after_exceeding_rate_limit(self):
        cache.clear()

        with patch.object(
            AnonymousPublicWorkspaceSearchThrottle,
            "get_rate",
            return_value="2/minute",
        ):
            with patch.object(
                AnonymousPublicWorkspaceSearchThrottle,
                "parse_rate",
                return_value=(2, 60),
            ):
                first = self.client.get(self.search_url, {"q": "test"})
                second = self.client.get(self.search_url, {"q": "test"})
                third = self.client.get(self.search_url, {"q": "test"})

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(third.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
