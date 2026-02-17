from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.constants import InvitationStatus, WorkspaceRole
from permissions.checks import user_is_workspace_admin
from permissions.models import WorkspaceMember
from workspaces.models import Workspace
from .models import Invitation
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
    message = (
        f"{inviter_name} invited you to join workspace '{invitation.workspace.name}' on Structra.\n\n"
        f"Open this link to review and accept the invitation:\n{invite_link}\n\n"
        "This invitation expires in 48 hours."
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "sarthshah333@gmail.com"),
        recipient_list=[invitation.email],
        fail_silently=False,
    )


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
            return Response(
                {"message": "Invitation already pending. Invitation email resent."},
                status=status.HTTP_200_OK,
            )

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

        member, created = WorkspaceMember.objects.get_or_create(
            workspace=invitation.workspace,
            user=request.user,
            defaults={"role": invitation.role},
        )

        invitation.status = InvitationStatus.ACCEPTED
        invitation.user = request.user
        invitation.save(update_fields=["status", "user"])

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
        return Response({"message": "Invitation rejected successfully."}, status=status.HTTP_200_OK)
