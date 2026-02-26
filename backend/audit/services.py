from typing import Any

from .models import AuditLog, AuditScope, AuditStatus


def _extract_ip(request):
    if not request:
        return None

    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip() or None
    return request.META.get("REMOTE_ADDR")


def record_audit_event(
    *,
    workspace,
    action: str,
    actor=None,
    scope: str = AuditScope.WORKSPACE,
    category: str = "general",
    status: str = AuditStatus.SUCCESS,
    system=None,
    target_name: str = "",
    target_id: str = "",
    message: str = "",
    metadata: dict[str, Any] | None = None,
    request=None,
):
    if not workspace:
        return None

    actor_value = actor if getattr(actor, "is_authenticated", False) else None
    payload = metadata.copy() if metadata else {}

    return AuditLog.objects.create(
        workspace=workspace,
        system=system,
        actor=actor_value,
        scope=scope,
        category=category,
        action=action,
        target_name=target_name,
        target_id=str(target_id or ""),
        message=message,
        status=status,
        metadata=payload,
        ip_address=_extract_ip(request),
    )


def record_workspace_event(*, workspace, action: str, actor=None, request=None, **kwargs):
    return record_audit_event(
        workspace=workspace,
        action=action,
        actor=actor,
        scope=AuditScope.WORKSPACE,
        request=request,
        **kwargs,
    )


def record_system_event(*, workspace, system, action: str, actor=None, request=None, **kwargs):
    return record_audit_event(
        workspace=workspace,
        system=system,
        action=action,
        actor=actor,
        scope=AuditScope.SYSTEM,
        request=request,
        **kwargs,
    )
