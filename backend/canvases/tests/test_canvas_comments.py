from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from canvases.models import Canvas, CanvasComment
from core.constants import CanvasRole, WorkspaceRole
from permissions.models import CanvasPermission, WorkspaceMember
from workspaces.models import Workspace


User = get_user_model()


class CanvasCommentsAPITests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="comments-admin@example.com",
            username="commentsadmin",
            password="password123",
            full_name="Comments Admin",
        )
        self.workspace = Workspace.objects.create(name="Comments Workspace", owner=self.admin)
        WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=self.admin,
            role=WorkspaceRole.ADMIN,
            joined_at=timezone.now(),
        )
        self.editor = User.objects.create_user(
            email="comments-editor@example.com",
            username="commentseditor",
            password="password123",
            full_name="Comments Editor",
        )
        self.commenter = User.objects.create_user(
            email="comments-commenter@example.com",
            username="commentscommenter",
            password="password123",
            full_name="Comments Commenter",
        )
        self.viewer = User.objects.create_user(
            email="comments-viewer@example.com",
            username="commentsviewer",
            password="password123",
            full_name="Comments Viewer",
        )
        self.other_member = User.objects.create_user(
            email="comments-other@example.com",
            username="commentsother",
            password="password123",
            full_name="Comments Other",
        )
        for user in [self.editor, self.commenter, self.viewer, self.other_member]:
            WorkspaceMember.objects.create(
                workspace=self.workspace,
                user=user,
                role=WorkspaceRole.MEMBER,
                joined_at=timezone.now(),
            )
        self.canvas = Canvas.objects.create(
            name="Comment Canvas",
            workspace=self.workspace,
            visibility="private",
            last_modified_by=self.admin,
        )
        CanvasPermission.objects.create(system=self.canvas, user=self.editor, role=CanvasRole.EDITOR)
        CanvasPermission.objects.create(system=self.canvas, user=self.commenter, role=CanvasRole.COMMENTER)
        CanvasPermission.objects.create(system=self.canvas, user=self.viewer, role=CanvasRole.VIEWER)
        CanvasPermission.objects.create(system=self.canvas, user=self.other_member, role=CanvasRole.VIEWER)
        self.comments_url = reverse("system-comments", kwargs={"system_id": self.canvas.id})

    def test_workspace_member_with_editor_role_can_create_a_comment(self):
        self.client.force_authenticate(user=self.editor)

        response = self.client.post(
            self.comments_url,
            {"body": "Editor comment"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CanvasComment.objects.count(), 1)

    def test_workspace_member_with_commenter_role_can_create_a_comment(self):
        self.client.force_authenticate(user=self.commenter)

        response = self.client.post(
            self.comments_url,
            {"body": "Commenter comment"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_workspace_member_with_viewer_role_cannot_create_a_comment(self):
        self.client.force_authenticate(user=self.viewer)

        response = self.client.post(
            self.comments_url,
            {"body": "Blocked comment"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_comment_author_can_edit_their_own_comment(self):
        comment = CanvasComment.objects.create(system=self.canvas, author=self.editor, body="Original")
        self.client.force_authenticate(user=self.editor)

        response = self.client.patch(
            reverse(
                "system-comment-detail",
                kwargs={"system_id": self.canvas.id, "comment_id": comment.id},
            ),
            {"body": "Updated"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        comment.refresh_from_db()
        self.assertEqual(comment.body, "Updated")

    def test_comment_author_can_delete_their_own_comment(self):
        comment = CanvasComment.objects.create(system=self.canvas, author=self.editor, body="Delete me")
        self.client.force_authenticate(user=self.editor)

        response = self.client.delete(
            reverse(
                "system-comment-detail",
                kwargs={"system_id": self.canvas.id, "comment_id": comment.id},
            )
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CanvasComment.objects.filter(id=comment.id).exists())

    def test_admin_can_delete_any_comment(self):
        comment = CanvasComment.objects.create(system=self.canvas, author=self.editor, body="Admin removes")
        self.client.force_authenticate(user=self.admin)

        response = self.client.delete(
            reverse(
                "system-comment-detail",
                kwargs={"system_id": self.canvas.id, "comment_id": comment.id},
            )
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CanvasComment.objects.filter(id=comment.id).exists())

    def test_non_author_non_admin_cannot_delete_another_users_comment(self):
        comment = CanvasComment.objects.create(system=self.canvas, author=self.editor, body="Keep me")
        self.client.force_authenticate(user=self.other_member)

        response = self.client.delete(
            reverse(
                "system-comment-detail",
                kwargs={"system_id": self.canvas.id, "comment_id": comment.id},
            )
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_replies_are_nested_under_parent_comments_in_get_response(self):
        parent = CanvasComment.objects.create(system=self.canvas, author=self.editor, body="Parent")
        CanvasComment.objects.create(
            system=self.canvas,
            author=self.commenter,
            body="Reply",
            parent=parent,
        )
        self.client.force_authenticate(user=self.editor)

        response = self.client.get(self.comments_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["body"], "Parent")
        self.assertEqual(len(response.data[0]["replies"]), 1)
        self.assertEqual(response.data[0]["replies"][0]["body"], "Reply")
