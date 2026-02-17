from django.db import models


class WorkspaceVisibility:
    PUBLIC = 'public'
    PRIVATE = 'private'
    CHOICES = [
        (PUBLIC, 'Public'),
        (PRIVATE, 'Private'),
    ]


class WorkspaceRole(models.TextChoices):
    ADMIN = 'ADMIN', 'Admin'
    MEMBER = 'MEMBER', 'Member'


class CanvasRole:
    VIEWER = 'viewer'
    EDITOR = 'editor'
    COMMENTER = 'commenter'
    CHOICES = [
        (VIEWER, 'Viewer'),
        (EDITOR, 'Editor'),
        (COMMENTER, 'Commenter'),
    ]

class InvitationStatus:
    PENDING = 'pending'
    ACCEPTED = 'accepted'
    REJECTED = 'rejected'
    EXPIRED = 'expired'
    CHOICES = [
        (PENDING, 'Pending'),
        (ACCEPTED, 'Accepted'),
        (REJECTED, 'Rejected'),
        (EXPIRED, 'Expired'),
    ]

class NotificationType:
    WORKSPACE_INVITE_SENT = 'workspace_invite_sent'
    WORKSPACE_INVITE_ACCEPTED = 'workspace_invite_accepted'
    CANVAS_PERMISSION_GRANTED = 'canvas_permission_granted'
    CANVAS_PERMISSION_REVOKED = 'canvas_permission_revoked'
    MEMBER_REMOVED = 'member_removed'
    CANVAS_SHARED = 'canvas_shared'
    CHOICES = [
        (WORKSPACE_INVITE_SENT, 'Workspace Invite Sent'),
        (WORKSPACE_INVITE_ACCEPTED, 'Workspace Invite Accepted'),
        (CANVAS_PERMISSION_GRANTED, 'Canvas Permission Granted'),
        (CANVAS_PERMISSION_REVOKED, 'Canvas Permission Revoked'),
        (MEMBER_REMOVED, 'Member Removed'),
        (CANVAS_SHARED, 'Canvas Shared'),
    ]

class AuditAction:
    CANVAS_CREATED = 'canvas_created'
    CANVAS_UPDATED = 'canvas_updated'
    CANVAS_DELETED = 'canvas_deleted'
    MEMBER_ADDED = 'member_added'
    MEMBER_REMOVED = 'member_removed'
    PERMISSION_GRANTED = 'permission_granted'
    PERMISSION_REVOKED = 'permission_revoked'
    WORKSPACE_SETTINGS_CHANGED = 'workspace_settings_changed'
    WORKSPACE_VISIBILITY_CHANGED = 'workspace_visibility_changed'
    CHOICES = [
        (CANVAS_CREATED, 'Canvas Created'),
        (CANVAS_UPDATED, 'Canvas Updated'),
        (CANVAS_DELETED, 'Canvas Deleted'),
        (MEMBER_ADDED, 'Member Added'),
        (MEMBER_REMOVED, 'Member Removed'),
        (PERMISSION_GRANTED, 'Permission Granted'),
        (PERMISSION_REVOKED, 'Permission Revoked'),
        (WORKSPACE_SETTINGS_CHANGED, 'Workspace Settings Changed'),
        (WORKSPACE_VISIBILITY_CHANGED, 'Workspace Visibility Changed'),
    ]
