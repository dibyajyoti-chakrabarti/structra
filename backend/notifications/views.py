from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import EmailMultiAlternatives
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.models import AuditLog
from audit.services import record_workspace_event
from core.constants import InvitationStatus, WorkspaceRole
from core.pricing import (
    PLAN_CORE,
    get_member_limit_for_workspace_plan,
    normalize_plan,
)
from permissions.checks import (
    check_workspace_entitlement,
    get_workspace_admin_plan,
    user_is_workspace_admin,
)
from permissions.models import WorkspaceMember
from workspaces.models import Workspace
from .models import AuditNotificationState, Invitation
from .serializers import (
    InvitationTokenSerializer,
    WorkspaceInvitationCreateSerializer,
    WorkspaceInvitationSerializer,
)


def _mark_expired_if_needed(invitation):
    if invitation.status == InvitationStatus.PENDING and invitation.expires_at <= timezone.now():
        invitation.status = InvitationStatus.EXPIRED
        invitation.save(update_fields=["status"])
        return True
    return False


def _get_valid_invitation(token):
    invitation = Invitation.objects.filter(token=token).select_related(
        "workspace", "invited_by", "user"
    ).first()
    if not invitation:
        return None, "Invalid invitation token."

    if invitation.status != InvitationStatus.PENDING:
        return None, "Invitation is no longer pending."

    if _mark_expired_if_needed(invitation):
        return None, "Invitation has expired."

    return invitation, None


def _build_invitation_link(token):
    base = getattr(settings, "FRONTEND_INVITE_BASE_URL", "http://localhost:5173/invite")
    return f"{base.rstrip('/')}/{token}"


def _send_invitation_email(invitation):
    inviter_name = (
        invitation.invited_by.full_name
        if invitation.invited_by and invitation.invited_by.full_name
        else invitation.invited_by.email
        if invitation.invited_by
        else "Workspace admin"
    )
    invite_link = _build_invitation_link(invitation.token)
    subject = f"Invitation to join {invitation.workspace.name} on Structra"
    text_message = (
        f"{inviter_name} invited you to join workspace '{invitation.workspace.name}' on Structra.\n\n"
        f"Open this link to review and accept the invitation:\n{invite_link}\n\n"
        "This invitation expires in 48 hours."
    )

    html_message = render_to_string(
        "notifications/emails/workspace_invitation.html",
        {
            "inviter_name": inviter_name,
            "workspace_name": invitation.workspace.name,
            "invite_link": invite_link,
            "invited_email": invitation.email,
        },
    )

    message = EmailMultiAlternatives(
        subject=subject,
        body=text_message,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "sarthshah333@gmail.com"),
        to=[invitation.email],
    )
    message.attach_alternative(html_message, "text/html")
    message.send(fail_silently=False)


class WorkspaceInvitationCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, workspace_id):
        workspace = get_object_or_404(Workspace, id=workspace_id)

        if not user_is_workspace_admin(workspace, request.user):
            return Response(
                {"error": "Action allowed only for admin."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Expire stale pending invitations before listing.
        Invitation.objects.filter(
            workspace=workspace,
            status=InvitationStatus.PENDING,
            expires_at__lte=timezone.now(),
        ).update(status=InvitationStatus.EXPIRED)

        invitations = Invitation.objects.filter(
            workspace=workspace,
            status=InvitationStatus.PENDING,
            expires_at__gt=timezone.now(),
        ).select_related("invited_by")

        serializer = WorkspaceInvitationSerializer(invitations, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, workspace_id):
        workspace = get_object_or_404(Workspace, id=workspace_id)

        if not user_is_workspace_admin(workspace, request.user):
            return Response(
                {"error": "Only workspace admins can send invitations."},
                status=status.HTTP_403_FORBIDDEN,
            )
        entitlement = check_workspace_entitlement(
            user_id=request.user.user_id,
            workspace_id=workspace.id,
            feature="invite_member",
        )
        if not entitlement["allowed"]:
            return Response(
                {"error": entitlement["reason"] or "Only workspace admins can send invitations."},
                status=status.HTTP_403_FORBIDDEN,
            )

        workspace_plan = entitlement.get("plan") or get_workspace_admin_plan(workspace)
        member_limit = get_member_limit_for_workspace_plan(workspace_plan)

        serializer = WorkspaceInvitationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        if WorkspaceMember.objects.filter(workspace=workspace, user__email__iexact=email).exists():
            return Response(
                {"error": "This user is already a workspace member."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Expire stale pending invites first.
        Invitation.objects.filter(
            workspace=workspace,
            email__iexact=email,
            status=InvitationStatus.PENDING,
            expires_at__lte=timezone.now(),
        ).update(status=InvitationStatus.EXPIRED)

        pending_invitation = Invitation.objects.filter(
            workspace=workspace,
            email__iexact=email,
            status=InvitationStatus.PENDING,
            expires_at__gt=timezone.now(),
        ).first()

        if pending_invitation:
            try:
                _send_invitation_email(pending_invitation)
            except Exception:
                return Response(
                    {"error": "Invitation exists but email could not be sent right now."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
            record_workspace_event(
                workspace=workspace,
                actor=request.user,
                request=request,
                category="user",
                action="Invitation Resent",
                target_name=email,
                target_id=pending_invitation.token,
                message="Pending invitation email resent.",
            )
            return Response(
                {"message": "Invitation already pending. Invitation email resent."},
                status=status.HTTP_200_OK,
            )

        if member_limit is not None:
            active_non_admin_members = WorkspaceMember.objects.filter(
                workspace=workspace,
                role=WorkspaceRole.MEMBER,
            ).count()
            pending_member_invites = Invitation.objects.filter(
                workspace=workspace,
                status=InvitationStatus.PENDING,
                expires_at__gt=timezone.now(),
            ).count()
            if active_non_admin_members + pending_member_invites >= member_limit:
                if workspace_plan == PLAN_CORE:
                    message = "Core workspaces cannot invite members."
                else:
                    message = (
                        f"{workspace_plan} workspace reached its member limit of {member_limit}. "
                        "Remove an invite/member or upgrade plan."
                    )
                return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)

        invited_user = get_user_model().objects.filter(email__iexact=email).first()
        invitation = Invitation.objects.create(
            user=invited_user,
            email=email,
            workspace=workspace,
            invited_by=request.user,
            role=WorkspaceRole.MEMBER,  # Admins can only invite MEMBER role.
        )

        try:
            _send_invitation_email(invitation)
        except Exception:
            invitation.delete()
            return Response(
                {"error": "Failed to send invitation email. Please verify SMTP configuration."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        record_workspace_event(
            workspace=workspace,
            actor=request.user,
            request=request,
            category="user",
            action="Invitation Sent",
            target_name=email,
            target_id=invitation.token,
            message="Workspace invitation sent.",
            metadata={"role": invitation.role},
        )

        return Response(
            {"message": "Invitation sent successfully."},
            status=status.HTTP_201_CREATED,
        )


class WorkspaceInvitationCancelView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, workspace_id, token):
        workspace = get_object_or_404(Workspace, id=workspace_id)

        if not user_is_workspace_admin(workspace, request.user):
            return Response(
                {"error": "Action allowed only for admin."},
                status=status.HTTP_403_FORBIDDEN,
            )

        invitation = Invitation.objects.filter(workspace=workspace, token=token).first()
        if not invitation:
            return Response({"error": "Invitation not found."}, status=status.HTTP_404_NOT_FOUND)

        if invitation.status != InvitationStatus.PENDING:
            return Response(
                {"error": "Only pending invitations can be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if _mark_expired_if_needed(invitation):
            return Response(
                {"error": "Invitation already expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invitation.status = InvitationStatus.REJECTED
        invitation.save(update_fields=["status"])
        record_workspace_event(
            workspace=workspace,
            actor=request.user,
            request=request,
            category="user",
            action="Invitation Cancelled",
            target_name=invitation.email,
            target_id=invitation.token,
            message="Workspace invitation cancelled by admin.",
        )
        return Response({"message": "Invitation cancelled successfully."}, status=status.HTTP_200_OK)


class InvitationDetailsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        token = (request.query_params.get("token") or "").strip()
        if not token:
            return Response({"error": "Token is required."}, status=status.HTTP_400_BAD_REQUEST)

        invitation, error = _get_valid_invitation(token)
        if error:
            return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)

        inviter_name = (
            invitation.invited_by.full_name
            if invitation.invited_by and invitation.invited_by.full_name
            else invitation.invited_by.email
            if invitation.invited_by
            else "Workspace admin"
        )
        return Response(
            {
                "workspace_id": invitation.workspace_id,
                "workspace_name": invitation.workspace.name,
                "inviter_name": inviter_name,
                "email": invitation.email,
                "has_account": get_user_model().objects.filter(
                    email__iexact=invitation.email
                ).exists(),
            },
            status=status.HTTP_200_OK,
        )


class InvitationAcceptView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = InvitationTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data["token"]

        invitation, error = _get_valid_invitation(token)
        if error:
            return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)

        if request.user.email.lower() != invitation.email.lower():
            return Response(
                {"error": "This invitation was sent to a different email address."},
                status=status.HTTP_403_FORBIDDEN,
            )

        workspace_plan = normalize_plan(invitation.workspace.owner.current_plan)
        member_limit = get_member_limit_for_workspace_plan(workspace_plan)
        if member_limit is not None:
            active_non_admin_members = WorkspaceMember.objects.filter(
                workspace=invitation.workspace,
                role=WorkspaceRole.MEMBER,
            ).exclude(user=request.user).count()
            if active_non_admin_members >= member_limit and not WorkspaceMember.objects.filter(
                workspace=invitation.workspace,
                user=request.user,
            ).exists():
                return Response(
                    {
                        "error": (
                            f"This workspace reached its {workspace_plan} member limit ({member_limit}). "
                            "Ask the admin to upgrade or free a seat."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        member, created = WorkspaceMember.objects.get_or_create(
            workspace=invitation.workspace,
            user=request.user,
            defaults={"role": invitation.role},
        )

        invitation.status = InvitationStatus.ACCEPTED
        invitation.user = request.user
        invitation.save(update_fields=["status", "user"])

        record_workspace_event(
            workspace=invitation.workspace,
            actor=request.user,
            request=request,
            category="user",
            action="Invitation Accepted",
            target_name=request.user.full_name or request.user.email,
            target_id=str(request.user.user_id),
            message=f"{request.user.email} accepted invitation.",
            metadata={"invited_email": invitation.email},
        )

        return Response(
            {
                "message": (
                    "Invitation accepted successfully."
                    if created
                    else "You are already a member of this workspace."
                ),
                "workspace_id": invitation.workspace_id,
                "role": member.role,
            },
            status=status.HTTP_200_OK,
        )


class InvitationRejectView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = InvitationTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data["token"]

        invitation, error = _get_valid_invitation(token)
        if error:
            return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)

        invitation.status = InvitationStatus.REJECTED
        invitation.save(update_fields=["status"])
        record_workspace_event(
            workspace=invitation.workspace,
            actor=request.user if request.user.is_authenticated else None,
            request=request,
            category="user",
            action="Invitation Rejected",
            target_name=invitation.email,
            target_id=invitation.token,
            message=f"{invitation.email} rejected invitation.",
            metadata={"invited_email": invitation.email},
        )
        return Response({"message": "Invitation rejected successfully."}, status=status.HTTP_200_OK)


def _format_notification_item(log, is_read):
    workspace_name = log.workspace.name if log.workspace else "Unknown workspace"
    actor_name = None
    if log.actor:
        actor_name = log.actor.full_name or log.actor.email
    elif isinstance(log.metadata, dict):
        actor_name = log.metadata.get("actor_name") or log.metadata.get("invited_email")
    actor_name = actor_name or "System"

    body_parts = [f"Workspace: {workspace_name}"]
    if log.system:
        body_parts.append(f"System: {log.system.name}")
    if log.target_name:
        body_parts.append(f"Target: {log.target_name}")

    return {
        "id": str(log.id),
        "title": log.action,
        "body": " - ".join(body_parts),
        "status": log.status,
        "category": log.category,
        "scope": log.scope,
        "workspace_id": log.workspace_id,
        "workspace_name": workspace_name,
        "system_id": log.system_id,
        "system_name": log.system.name if log.system else None,
        "actor_name": actor_name,
        "created_at": log.created_at,
        "is_read": is_read,
    }


class AdminNotificationFeedView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            limit = int(request.query_params.get("limit", 50))
        except (TypeError, ValueError):
            limit = 50
        limit = max(1, min(limit, 200))

        admin_workspace_ids = WorkspaceMember.objects.filter(
            user=request.user,
            role=WorkspaceRole.ADMIN,
        ).values_list("workspace_id", flat=True)

        audit_qs = (
            AuditLog.objects.filter(workspace_id__in=admin_workspace_ids)
            .select_related("workspace", "system", "actor")
            .order_by("-created_at")
        )

        unread_count = audit_qs.exclude(read_states__user=request.user).count()
        logs = list(audit_qs[:limit])

        read_ids = set(
            AuditNotificationState.objects.filter(
                user=request.user,
                audit_log_id__in=[log.id for log in logs],
            ).values_list("audit_log_id", flat=True)
        )

        items = [_format_notification_item(log, log.id in read_ids) for log in logs]
        return Response(
            {"unread_count": unread_count, "items": items},
            status=status.HTTP_200_OK,
        )


class AdminNotificationMarkReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, audit_log_id):
        admin_workspace_ids = WorkspaceMember.objects.filter(
            user=request.user,
            role=WorkspaceRole.ADMIN,
        ).values_list("workspace_id", flat=True)

        audit_log = get_object_or_404(
            AuditLog,
            id=audit_log_id,
            workspace_id__in=admin_workspace_ids,
        )

        AuditNotificationState.objects.update_or_create(
            user=request.user,
            audit_log=audit_log,
        )
        return Response({"message": "Notification marked as read."}, status=status.HTTP_200_OK)


class AdminNotificationMarkAllReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        admin_workspace_ids = WorkspaceMember.objects.filter(
            user=request.user,
            role=WorkspaceRole.ADMIN,
        ).values_list("workspace_id", flat=True)

        unread_ids = list(
            AuditLog.objects.filter(workspace_id__in=admin_workspace_ids)
            .exclude(read_states__user=request.user)
            .values_list("id", flat=True)
        )
        if unread_ids:
            existing = set(
                AuditNotificationState.objects.filter(
                    user=request.user,
                    audit_log_id__in=unread_ids,
                ).values_list("audit_log_id", flat=True)
            )
            to_create = [
                AuditNotificationState(user=request.user, audit_log_id=log_id)
                for log_id in unread_ids
                if log_id not in existing
            ]
            if to_create:
                AuditNotificationState.objects.bulk_create(to_create, ignore_conflicts=True)

        return Response({"message": "All notifications marked as read."}, status=status.HTTP_200_OK)
