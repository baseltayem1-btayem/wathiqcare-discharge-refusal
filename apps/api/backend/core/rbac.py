from __future__ import annotations

import logging
import uuid
from datetime import datetime

from fastapi import HTTPException

from backend.core.database import SessionLocal
from backend.core.roles import canonicalize_role, is_platform_role
from backend.models.audit_log import AuditLog
from backend.models.discharge_case import DischargeCase

logger = logging.getLogger(__name__)


PERMISSIONS = {
    "cases.create",
    "cases.read.assigned",
    "cases.read.tenant",
    "cases.read.all",
    "cases.update.medical",
    "cases.update.operational",
    "cases.record.risk",
    "cases.record.decision",
    "cases.add.witness",
    "cases.submit.legal_review",
    "cases.close.medical",
    "cases.close.final",
    "legal.review",
    "legal.approve.readiness",
    "evidence.generate",
    "documents.generate_pdf",
    "documents.download.final",
    "audit.read",
    "compliance.review",
    "reports.read",
    "sms.send",
    "sms.evidence.read",
    "users.manage",
    "settings.manage",
}


ROLE_PERMISSIONS: dict[str, set[str]] = {
    "platform_superadmin": set(PERMISSIONS),
    "platform_admin": {
        "users.manage",
        "settings.manage",
        "reports.read",
        "audit.read",
        "sms.evidence.read",
        "cases.read.all",
        "documents.generate_pdf",
        "documents.download.final",
        "sms.send",
    },
    "tenant_owner": {
        "users.manage",
        "reports.read",
        "cases.read.tenant",
        "compliance.review",
        "audit.read",
    },
    "tenant_admin": {
        "users.manage",
        "reports.read",
        "cases.read.tenant",
        "compliance.review",
        "audit.read",
    },
    "doctor": {
        "cases.create",
        "cases.read.assigned",
        "cases.update.medical",
        "cases.record.risk",
        "cases.record.decision",
        "cases.close.medical",
        "documents.download.final",
    },
    "legal_admin": {
        "cases.read.tenant",
        "legal.review",
        "legal.approve.readiness",
        "evidence.generate",
        "documents.generate_pdf",
        "documents.download.final",
        "audit.read",
        "sms.evidence.read",
        "reports.read",
    },
    "quality": {
        "cases.read.tenant",
        "compliance.review",
        "reports.read",
        "audit.read",
    },
    "compliance": {
        "cases.read.tenant",
        "compliance.review",
        "reports.read",
        "audit.read",
    },
    "nursing": {
        "cases.read.assigned",
        "cases.update.operational",
        "cases.add.witness",
    },
    "patient_affairs": {
        "cases.read.tenant",
        "cases.update.operational",
    },
    "viewer": {
        "cases.read.tenant",
        "reports.read",
    },
}


def _role_permissions(role: str | None) -> set[str]:
    normalized = canonicalize_role(role)
    return set(ROLE_PERMISSIONS.get(normalized, set()))


def has_permission(current_user: dict, permission: str) -> bool:
    if permission not in PERMISSIONS:
        logger.warning("rbac_unknown_permission permission=%s", permission)
        return False

    role = canonicalize_role(current_user.get("role"))
    if is_platform_role(role):
        return True

    return permission in _role_permissions(role)


def has_any_permission(current_user: dict, permissions: tuple[str, ...]) -> bool:
    return any(has_permission(current_user, item) for item in permissions)


def _write_auth_audit(
    *,
    user_id: str | None,
    tenant_id: str | None,
    entity_type: str,
    entity_id: str,
    action: str,
    details: str,
) -> None:
    if not user_id or not tenant_id:
        return

    db = SessionLocal()
    try:
        db.add(
            AuditLog(
                id=str(uuid.uuid4()),
                tenant_id=tenant_id,
                user_id=user_id,
                entity_type=entity_type,
                entity_id=entity_id,
                action=action,
                details=details,
                created_at=datetime.utcnow(),
            )
        )
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.warning("rbac_audit_write_failed action=%s reason=%s", action, str(exc))
    finally:
        db.close()


def require_permission(current_user: dict, permission: str) -> None:
    if has_permission(current_user, permission):
        return

    _write_auth_audit(
        user_id=current_user.get("id"),
        tenant_id=current_user.get("tenant_id"),
        entity_type="authorization",
        entity_id=permission,
        action="permission_denied",
        details=f"Missing permission: {permission}",
    )
    raise HTTPException(status_code=403, detail="الصلاحيات غير كافية")


def require_any_permission(current_user: dict, permissions: tuple[str, ...]) -> None:
    if has_any_permission(current_user, permissions):
        return

    _write_auth_audit(
        user_id=current_user.get("id"),
        tenant_id=current_user.get("tenant_id"),
        entity_type="authorization",
        entity_id=",".join(permissions),
        action="permission_denied",
        details="Missing all required permissions",
    )
    raise HTTPException(status_code=403, detail="الصلاحيات غير كافية")


def can_access_case(current_user: dict, case_row: DischargeCase) -> bool:
    role = canonicalize_role(current_user.get("role"))
    if is_platform_role(role):
        return True

    if has_permission(current_user, "cases.read.all"):
        return True

    if case_row.tenant_id != current_user.get("tenant_id"):
        return False

    if has_permission(current_user, "cases.read.tenant"):
        return True

    if has_permission(current_user, "cases.read.assigned"):
        current_user_id = current_user.get("id")
        return case_row.attending_physician_user_id == current_user_id or case_row.created_by == current_user_id

    return False


def require_case_access(current_user: dict, case_id: str) -> DischargeCase:
    db = SessionLocal()
    try:
        case_row = db.query(DischargeCase).filter(DischargeCase.id == case_id).first()
        if not case_row:
            raise HTTPException(status_code=404, detail="الحالة غير موجودة")

        if can_access_case(current_user, case_row):
            return case_row

        _write_auth_audit(
            user_id=current_user.get("id"),
            tenant_id=current_user.get("tenant_id"),
            entity_type="discharge_case",
            entity_id=case_id,
            action="unauthorized_case_access_attempt",
            details=f"Role {canonicalize_role(current_user.get('role'))} cannot access case",
        )
        raise HTTPException(status_code=403, detail="غير مصرح بالوصول إلى هذه الحالة")
    finally:
        db.close()


def filter_case_summaries(current_user: dict, case_summaries: list[dict]) -> list[dict]:
    if has_permission(current_user, "cases.read.all") or has_permission(current_user, "cases.read.tenant"):
        return case_summaries

    if not has_permission(current_user, "cases.read.assigned"):
        return []

    case_ids = [item.get("id") for item in case_summaries if item.get("id")]
    if not case_ids:
        return []

    db = SessionLocal()
    try:
        rows = (
            db.query(DischargeCase.id)
            .filter(
                DischargeCase.id.in_(case_ids),
                DischargeCase.tenant_id == current_user.get("tenant_id"),
                (DischargeCase.attending_physician_user_id == current_user.get("id"))
                | (DischargeCase.created_by == current_user.get("id")),
            )
            .all()
        )
        allowed_ids = {row[0] for row in rows}
        return [item for item in case_summaries if item.get("id") in allowed_ids]
    finally:
        db.close()


def log_privileged_document_download(current_user: dict, document_id: str) -> None:
    _write_auth_audit(
        user_id=current_user.get("id"),
        tenant_id=current_user.get("tenant_id"),
        entity_type="document",
        entity_id=document_id,
        action="privileged_document_download",
        details="Final document download permitted",
    )


def log_sms_evidence_access(current_user: dict, case_id: str) -> None:
    _write_auth_audit(
        user_id=current_user.get("id"),
        tenant_id=current_user.get("tenant_id"),
        entity_type="sms_evidence",
        entity_id=case_id,
        action="sms_evidence_accessed",
        details="SMS evidence records viewed",
    )
