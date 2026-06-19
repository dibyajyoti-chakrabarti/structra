from django.utils import timezone
from django.db.models import Q

from core.constants import WorkspaceRole
from permissions.models import WorkspaceMember


def get_billable_seat_snapshot(workspace, at=None):
    at = at or timezone.now()
    occupied_memberships = WorkspaceMember.all_objects.filter(
        workspace=workspace,
        joined_at__lte=at,
    ).filter(Q(left_at__isnull=True) | Q(left_at__gt=at))

    total_occupied = occupied_memberships.count()
    invited_occupied = occupied_memberships.filter(role=WorkspaceRole.MEMBER).count()

    return {
        "admin_occupied": 1,
        "invited_occupied": invited_occupied,
        "billable_invited_seats": invited_occupied,
        "total_occupied": max(total_occupied, 1),
    }
