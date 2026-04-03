"""
secure_link_service.py
======================
Generates, validates, and revokes tokenised secure-discharge links.

Token security model
--------------------
Per-link token is generated as ``secrets.token_urlsafe(32)`` (≥192 bits of
entropy).  Only its HMAC-SHA256 digest (keyed with PUBLIC_LINK_TOKEN_PEPPER)
is stored in the database; the raw token never touches persistent storage.

The raw token is embedded in the URL:
    {APP_BASE_URL}/secure/{raw_token}

Audit events recorded for every mutating operation.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from backend.core.database import SessionLocal
from backend.models.audit_log import AuditLog
from backend.models.discharge_case import DischargeCase
from backend.models.discharge_execution_item import DischargeExecutionItem
from backend.models.secure_discharge_link import SecureDischargeLink
from backend.models.tenant import Tenant

logger = logging.getLogger(__name__)

_DEFAULT_EXPIRY_MINUTES = 10
_DEFAULT_MAX_ACTIVE_LINKS_PER_CASE = 10
## Legacy cooldown and expiry logic removed


def _hash_token(raw_token: str) -> str:
    return hmac.new(
        _pepper().encode("utf-8"),
        raw_token.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


class SecureLinkRateLimitError(ValueError):
    """Raised when secure-link generation exceeds issuance limits."""


def _write_audit(
    db,
    *,
    tenant_id: str,
    user_id: str,
    entity_id: str,
    action: str,
    details: Optional[str] = None,
) -> None:
    entry = AuditLog(
        tenant_id=tenant_id,
        user_id=user_id,
        entity_type="secure_discharge_link",
        entity_id=entity_id,
        action=action,
        details=details,
    )
    db.add(entry)


def _build_audit_details(**parts: Optional[str]) -> Optional[str]:
    items = []
    for key, value in parts.items():
        normalized = str(value).strip() if value is not None else ""
        if normalized:
            items.append(f"{key}={normalized}")
    return " ".join(items) or None


def _get_public_payload(db, link: SecureDischargeLink) -> dict:
    case = db.query(DischargeCase).filter(DischargeCase.id == link.case_id).first()
    tenant = db.query(Tenant).filter(Tenant.id == link.tenant_id).first()

    # Derive conditional sections from case-linked execution items (no brittle joins)
    execution_items = (
        db.query(DischargeExecutionItem)
        .filter(DischargeExecutionItem.case_id == link.case_id)
        .all()
    )
    home_care_item = next(
        (i for i in execution_items if i.item_type == "home_healthcare"), None
    )
    equipment_item = next(
        (i for i in execution_items if i.item_type == "medical_equipment"), None
    )

    return {
        "hospital_name": tenant.name if tenant else None,
        "case_id": link.case_id,
        "case_reference": case.case_number if case and case.case_number else link.case_id,
        "patient_name": case.patient_name if case and case.patient_name else None,
        "discharge_summary": case.discharge_plan_summary if case and case.discharge_plan_summary else None,
        "legal_notice": _PUBLIC_LEGAL_NOTICE,
        "expires_at": link.expires_at.isoformat(),
        "decision_type": link.decision_type,
        "decision_name": link.decision_name,
        "decision_submitted_at": (
            link.decision_submitted_at.isoformat() if link.decision_submitted_at else None
        ),
        # Conditional sections (None when not applicable)
        "has_home_care_agreement": home_care_item is not None,
        "home_care_agreement_text": home_care_item.description if home_care_item else None,
        "has_equipment_acknowledgment": equipment_item is not None,
        "equipment_acknowledgment_text": equipment_item.description if equipment_item else None,
    }


def _load_valid_link(db, raw_token: str) -> SecureDischargeLink:
    token_hash = _hash_token(raw_token)
    link = (
        db.query(SecureDischargeLink)
        .filter(SecureDischargeLink.token_hash == token_hash)
        .first()
    )

    if not link:
        raise ValueError("رابط التصريح غير صالح")

    if link.revoked_at is not None:
        raise ValueError("تم إلغاء رابط التصريح")

    now = datetime.now(timezone.utc)
    expires_naive = link.expires_at.replace(tzinfo=None)
    now_naive = now.replace(tzinfo=None)
    if expires_naive < now_naive:
        _write_audit(
            db,
            tenant_id=link.tenant_id,
            user_id=link.created_by,
            entity_id=link.id,
            action="secure_link_expired",
            details=f"attempted_at={now.isoformat()}",
        )
        db.commit()
        raise ValueError("انتهت صلاحية رابط التصريح")

    return link


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_link(
    *,
    tenant_id: str,
    case_id: str,
    created_by: str,
    recipient_email: str,
) -> dict:
    """
    Create a new secure discharge link and return its raw URL.

    Returns
    -------
    dict with keys:
        link_id        – UUID of the SecureDischargeLink row
        raw_token      – include this in the URL (never stored in DB)
        url            – full tokenised URL ready for delivery
        expires_at     – ISO-8601 datetime
        recipient_email
    """
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc).replace(tzinfo=None)

        # Validate case ownership
        case = (
            db.query(DischargeCase)
            .filter(DischargeCase.id == case_id, DischargeCase.tenant_id == tenant_id)
            .first()
        )
        if not case:
            raise ValueError("حالة التصريح غير موجودة أو لا تنتمي لهذه المؤسسة")

        active_link_count = (
            db.query(SecureDischargeLink)
            .filter(
                SecureDischargeLink.tenant_id == tenant_id,
                SecureDischargeLink.case_id == case_id,
                SecureDischargeLink.revoked_at.is_(None),
                SecureDischargeLink.expires_at > now,
            )
            .count()
        )
        if active_link_count >= _max_active_links_per_case():
            raise SecureLinkRateLimitError(
                "Maximum active secure links reached for this case. Revoke an existing link or wait for expiry."
            )

        cooldown_seconds = _issue_cooldown_seconds()
        if cooldown_seconds > 0:
            recent_cutoff = now - timedelta(seconds=cooldown_seconds)
            recent_link = (
                db.query(SecureDischargeLink)
                .filter(
                    SecureDischargeLink.tenant_id == tenant_id,
                    SecureDischargeLink.case_id == case_id,
                    SecureDischargeLink.recipient_email == recipient_email,
                    SecureDischargeLink.revoked_at.is_(None),
                    SecureDischargeLink.created_at >= recent_cutoff,
                    SecureDischargeLink.expires_at > now,
                )
                .order_by(SecureDischargeLink.created_at.desc())
                .first()
            )
            if recent_link:
                raise SecureLinkRateLimitError(
                    "A secure link was already issued recently for this recipient. Please wait before sending another link."
                )

        raw_token = secrets.token_urlsafe(32)
        token_hash = _hash_token(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=_expiry_minutes())
        base_url = os.getenv("APP_BASE_URL", "http://localhost:3000").rstrip("/")
        url = f"{base_url}/secure/{raw_token}"

        link = SecureDischargeLink(
            tenant_id=tenant_id,
            case_id=case_id,
            created_by=created_by,
            recipient_email=recipient_email,
            token_hash=token_hash,
            expires_at=expires_at,
            sent_via="email",
            delivery_status="pending",
        )
        db.add(link)
        db.flush()  # obtain link.id before audit

        _write_audit(
            db,
            tenant_id=tenant_id,
            user_id=created_by,
            entity_id=link.id,
            action="secure_link_generated",
            details=f"case_id={case_id} recipient={recipient_email} expires_at={expires_at.isoformat()}",
        )
        db.commit()

        logger.info(
            "secure_link_generated case_id=%s link_id=%s recipient=%s expires_at=%s",
            case_id,
            link.id,
            recipient_email,
            expires_at.isoformat(),
        )

        return {
            "link_id": link.id,
            "raw_token": raw_token,
            "url": url,
            "expires_at": expires_at.isoformat(),
            "recipient_email": recipient_email,
        }
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def update_delivery_status(link_id: str, *, status: str) -> None:
    """Update delivery_status after email/SMS dispatch attempt."""
    db = SessionLocal()
    try:
        link = db.query(SecureDischargeLink).filter(SecureDischargeLink.id == link_id).first()
        if link:
            link.delivery_status = status
            db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def validate_token(
    raw_token: str,
    *,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> dict:
    """
    Validate a token and return the associated case summary.

    Records ``accessed_at`` on first use.

    Raises
    ------
    ValueError  – token invalid, expired, or revoked
    """
    db = SessionLocal()
    try:
        link = _load_valid_link(db, raw_token)

        details = _build_audit_details(
            case_id=link.case_id,
            ip_address=ip_address,
            user_agent=(user_agent or "")[:300],
        )
        _write_audit(
            db,
            tenant_id=link.tenant_id,
            user_id=link.created_by,
            entity_id=link.id,
            action="link_opened",
            details=details,
        )

        if link.accessed_at is None:
            link.accessed_at = datetime.utcnow()
            _write_audit(
                db,
                tenant_id=link.tenant_id,
                user_id=link.created_by,
                entity_id=link.id,
                action="secure_link_first_access",
                details=f"case_id={link.case_id}",
            )

        _write_audit(
            db,
            tenant_id=link.tenant_id,
            user_id=link.created_by,
            entity_id=link.id,
            action="token_validated",
            details=details,
        )
        db.commit()

        payload = _get_public_payload(db, link)
        payload.update(
            {
                "link_id": link.id,
                "accessed_at": link.accessed_at.isoformat() if link.accessed_at else None,
            }
        )
        return payload
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def submit_decision(
    raw_token: str,
    *,
    decision_type: str,
    typed_name: str,
    refusal_acknowledged: bool,
    signature_data: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> dict:
    normalized_decision = decision_type.strip().lower()
    normalized_name = typed_name.strip()

    if normalized_decision not in {"accept", "refuse"}:
        raise ValueError("نوع القرار غير صالح")
    if len(normalized_name) < 3:
        raise ValueError("الاسم الكامل مطلوب لإتمام الإقرار")
    if normalized_decision == "refuse" and not refusal_acknowledged:
        raise ValueError("يجب تأكيد الإقرار القانوني قبل تسجيل الرفض")

    db = SessionLocal()
    try:
        link = _load_valid_link(db, raw_token)
        case = db.query(DischargeCase).filter(DischargeCase.id == link.case_id).first()
        if not case:
            raise ValueError("حالة التصريح غير موجودة")

        if link.decision_submitted_at is not None:
            payload = _get_public_payload(db, link)
            return {
                "hospital_name": payload["hospital_name"],
                "case_id": link.case_id,
                "case_reference": payload["case_reference"],
                "decision_type": link.decision_type,
                "typed_name": link.decision_name,
                "submitted_at": link.decision_submitted_at.isoformat(),
                "confirmation_message": (
                    "تم استلام موافقتكم على الخروج." if link.decision_type == "accept"
                    else "تم استلام رفضكم للخروج وتوثيق الإقرار القانوني."
                ),
            }

        now = datetime.utcnow()
        normalized_user_agent = (user_agent or "").strip()[:500] or None

        link.decision_type = normalized_decision
        link.decision_name = normalized_name
        link.decision_submitted_at = now
        link.decision_ip_address = ip_address
        link.decision_user_agent = normalized_user_agent
        link.refusal_acknowledged_at = now if normalized_decision == "refuse" else None

        case.signer_name = normalized_name
        case.signer_role = "patient_representative"
        # Prefer canvas signature data; fall back to typed name as plain-text proof
        normalized_signature = signature_data.strip() if signature_data and signature_data.strip() else normalized_name
        signature_hash = hashlib.sha256(normalized_signature.encode("utf-8")).hexdigest()
        case.signature_text = normalized_signature
        case.signed_at = now
        if normalized_decision == "accept":
            case.accepted_at = now
            case.status = "accepted"
        else:
            case.refused_at = now
            case.status = "refused"

        audit_details = _build_audit_details(
            case_id=link.case_id,
            decision_type=normalized_decision,
            typed_name=normalized_name,
            signature_hash=signature_hash,
            ip_address=ip_address,
            user_agent=normalized_user_agent,
        )
        if normalized_decision == "refuse":
            _write_audit(
                db,
                tenant_id=link.tenant_id,
                user_id=link.created_by,
                entity_id=link.id,
                action="refusal_acknowledged",
                details=audit_details,
            )

        _write_audit(
            db,
            tenant_id=link.tenant_id,
            user_id=link.created_by,
            entity_id=link.id,
            action="decision_submitted",
            details=audit_details,
        )

        # One-time use: invalidate token after successful decision submission.
        link.revoked_at = now
        _write_audit(
            db,
            tenant_id=link.tenant_id,
            user_id=link.created_by,
            entity_id=link.id,
            action="secure_link_consumed",
            details=f"consumed_at={now.isoformat()}",
        )

        db.commit()

        payload = _get_public_payload(db, link)
        return {
            "hospital_name": payload["hospital_name"],
            "case_id": link.case_id,
            "case_reference": payload["case_reference"],
            "decision_type": normalized_decision,
            "typed_name": normalized_name,
            "submitted_at": now.isoformat(),
            "confirmation_message": (
                "تم استلام موافقتكم على الخروج." if normalized_decision == "accept"
                else "تم استلام رفضكم للخروج وتوثيق الإقرار القانوني."
            ),
        }
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def revoke_link(
    *,
    link_id: str,
    tenant_id: str,
    revoked_by: str,
) -> None:
    """Revoke a link so it can no longer be used."""
    db = SessionLocal()
    try:
        link = (
            db.query(SecureDischargeLink)
            .filter(
                SecureDischargeLink.id == link_id,
                SecureDischargeLink.tenant_id == tenant_id,
            )
            .first()
        )
        if not link:
            raise ValueError("الرابط غير موجود")
        if link.revoked_at is not None:
            return  # idempotent

        link.revoked_at = datetime.utcnow()
        _write_audit(
            db,
            tenant_id=tenant_id,
            user_id=revoked_by,
            entity_id=link_id,
            action="secure_link_revoked",
        )
        db.commit()
        logger.info("secure_link_revoked link_id=%s by user_id=%s", link_id, revoked_by)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def list_links_for_case(*, tenant_id: str, case_id: str) -> list:
    """Return all secure links for a case, newest first."""
    db = SessionLocal()
    try:
        rows = (
            db.query(SecureDischargeLink)
            .filter(
                SecureDischargeLink.tenant_id == tenant_id,
                SecureDischargeLink.case_id == case_id,
            )
            .order_by(SecureDischargeLink.created_at.desc())
            .all()
        )
        result = []
        for r in rows:
            result.append(
                {
                    "link_id": r.id,
                    "recipient_email": r.recipient_email,
                    "sent_via": r.sent_via,
                    "delivery_status": r.delivery_status,
                    "decision_type": r.decision_type,
                    "decision_submitted_at": (
                        r.decision_submitted_at.isoformat() if r.decision_submitted_at else None
                    ),
                    "expires_at": r.expires_at.isoformat(),
                    "accessed_at": r.accessed_at.isoformat() if r.accessed_at else None,
                    "revoked_at": r.revoked_at.isoformat() if r.revoked_at else None,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
            )
        return result
    finally:
        db.close()
