"""Notification Orchestrator — fallback dispatch chain.

Channel order:
  1. Email (Microsoft Graph) — primary
  2. Dashboard alert — persistent internal fallback
  3. WhatsApp — critical-only tertiary fallback (PDPL-safe)

PDPL Note:
  WhatsApp messages contain ONLY: reference_id, urgency, and secure_link.
  No PHI, no diagnosis, no patient identifiers beyond a hashed reference.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from backend.core.logging_config import get_logger
from backend.models.notification_delivery_attempt import NotificationDeliveryAttempt
from backend.models.tenant_notification_setting import TenantNotificationSetting
from backend.notifications.dashboard_channel import send_dashboard_alert
from backend.notifications.whatsapp_channel import send_whatsapp_alert
from backend.services.notification_service import NotificationService

logger = get_logger(__name__)

# ─────────────────────────────── Internal types ──────────────────────────────

SEVERITY_CRITICAL = "critical"
SEVERITY_WARNING = "warning"
SEVERITY_INFO = "info"

# Trigger types ─ must match legal_artifact_service thresholds
TRIGGER_24H_LEGAL = "legal_24h_notification"
TRIGGER_48H_ESCALATION = "legal_48h_escalation"
TRIGGER_BLOCKED_FINALIZE = "blocked_finalization"
TRIGGER_MISSING_SIGNATURE = "missing_mandatory_signature"
TRIGGER_COMPLIANCE_REVIEW = "urgent_compliance_review"

# Triggers that are allowed to use WhatsApp
_CRITICAL_TRIGGERS = {TRIGGER_48H_ESCALATION, TRIGGER_BLOCKED_FINALIZE, TRIGGER_COMPLIANCE_REVIEW}


@dataclass
class DispatchPayload:
    tenant_id: str
    case_id: Optional[str]
    trigger_type: str                      # one of TRIGGER_* constants
    severity: str                          # critical | warning | info
    title: str
    message: str                           # Internal message (may include context)
    # Safe public reference used in WhatsApp; must NOT contain PHI
    reference_id: str
    secure_link: str                       # Case review URL for recipients
    case_deep_link: Optional[str] = None  # Deep-link within dashboard
    # Optional per-recipient overrides
    recipient_emails: List[str] = field(default_factory=list)
    recipient_phones: List[str] = field(default_factory=list)  # WhatsApp-eligible numbers
    team_code: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class DispatchResult:
    trigger_type: str
    email_sent: bool = False
    dashboard_sent: bool = False
    whatsapp_sent: bool = False
    skipped_channels: List[str] = field(default_factory=list)
    attempted_channels: List[str] = field(default_factory=list)


# ─────────────────────────── Public entry point ───────────────────────────────

def dispatch_with_fallback(db: Session, payload: DispatchPayload) -> DispatchResult:
    """Dispatches a notification through the full fallback chain.

    1. Email (always attempted when enabled)
    2. Dashboard alert (always created as persistent fallback)
    3. WhatsApp (only for critical triggers when enabled)

    All delivery attempts are recorded immutably.
    """
    result = DispatchResult(trigger_type=payload.trigger_type)

    settings = _get_or_default_settings(db, tenant_id=payload.tenant_id)
    email_targets = payload.recipient_emails or _extract_emails(settings, trigger_type=payload.trigger_type)
    phone_targets = payload.recipient_phones or _extract_phones(settings)

    # ── Step 1: Email (primary) ───────────────────────────────────────────────
    if settings.email_enabled and email_targets:
        result.attempted_channels.append("email")
        email_ok = _dispatch_email(db, payload=payload, settings=settings, recipients=email_targets)
        result.email_sent = email_ok
        if not email_ok:
            logger.warning(
                "ORCHESTRATOR_EMAIL_FAILED",
                extra={"trigger": payload.trigger_type, "tenant_id": payload.tenant_id},
            )
    else:
        result.skipped_channels.append("email")

    # ── Step 2: Dashboard alert (always persisted) ────────────────────────────
    if settings.dashboard_enabled:
        result.attempted_channels.append("dashboard")
        alert_key = _build_alert_key(payload)
        send_dashboard_alert(
            db,
            tenant_id=payload.tenant_id,
            case_id=payload.case_id,
            alert_key=alert_key,
            alert_type=payload.trigger_type,
            severity=payload.severity,
            title=payload.title,
            message=payload.message,
            case_deep_link=payload.case_deep_link,
            metadata_json=payload.metadata,
        )
        result.dashboard_sent = True
    else:
        result.skipped_channels.append("dashboard")

    # ── Step 3: WhatsApp (critical + enabled) ────────────────────────────────
    is_critical_trigger = payload.trigger_type in _CRITICAL_TRIGGERS
    if settings.whatsapp_enabled and is_critical_trigger and phone_targets:
        result.attempted_channels.append("whatsapp")
        urgency_label = _severity_to_urgency(payload.severity)
        twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
        twilio_token = os.getenv("TWILIO_AUTH_TOKEN")
        any_sent = False
        for phone in phone_targets:
            sent = send_whatsapp_alert(
                db,
                tenant_id=payload.tenant_id,
                case_id=payload.case_id,
                alert_id=None,
                to_phone=phone,
                reference_id=payload.reference_id,
                urgency=urgency_label,
                secure_link=payload.secure_link,
                notification_type=payload.trigger_type,
                whatsapp_sender_number=settings.whatsapp_sender_number,
                twilio_account_sid=twilio_sid,
                twilio_auth_token=twilio_token,
                metadata_json=payload.metadata,
            )
            any_sent = any_sent or sent
        result.whatsapp_sent = any_sent
    else:
        reason = "not_critical" if not is_critical_trigger else ("disabled" if not settings.whatsapp_enabled else "no_phones")
        result.skipped_channels.append(f"whatsapp:{reason}")

    logger.info(
        "ORCHESTRATOR_DISPATCH_COMPLETE",
        extra={
            "trigger": payload.trigger_type,
            "tenant_id": payload.tenant_id,
            "case_id": payload.case_id,
            "email_sent": result.email_sent,
            "dashboard_sent": result.dashboard_sent,
            "whatsapp_sent": result.whatsapp_sent,
            "skipped": result.skipped_channels,
        },
    )
    return result


# ─────────────────────────────── Helpers ─────────────────────────────────────

def _get_or_default_settings(db: Session, *, tenant_id: str) -> TenantNotificationSetting:
    """Returns tenant settings or a default-enabled object (without persisting)."""
    settings = (
        db.query(TenantNotificationSetting)
        .filter(TenantNotificationSetting.tenant_id == tenant_id)
        .first()
    )
    if settings:
        return settings
    # Return defaults without persisting — avoids FK issues during testing
    default = TenantNotificationSetting()
    default.tenant_id = tenant_id
    default.email_enabled = True
    default.dashboard_enabled = True
    default.whatsapp_enabled = False
    default.whatsapp_sender_number = None
    default.legal_recipient_phones_json = []
    default.legal_recipient_emails_json = []
    default.compliance_recipient_emails_json = []
    default.notification_threshold_minutes = 1440
    default.escalation_threshold_minutes = 2880
    return default


def _dispatch_email(
    db: Session,
    *,
    payload: DispatchPayload,
    settings: TenantNotificationSetting,
    recipients: List[str],
) -> bool:
    """Dispatches email via NotificationService; logs attempt. Returns True on no error."""
    svc = NotificationService(db)
    success = True
    for email in recipients:
        attempt = NotificationDeliveryAttempt(
            tenant_id=payload.tenant_id,
            case_id=payload.case_id,
            channel="email",
            provider="microsoft_graph",
            recipient=email,
            notification_type=payload.trigger_type,
            status="pending",
            attempted_at=datetime.utcnow(),
            metadata_json=payload.metadata,
        )
        db.add(attempt)
        db.flush()
        try:
            svc.send_email_notification(
                tenant_id=payload.tenant_id,
                created_by="system",
                case_id=payload.case_id,
                recipient_email=email,
                title=payload.title,
                body=payload.message,
                metadata_json=payload.metadata,
                raise_on_failure=True,
            )
            attempt.status = "sent"
            attempt.status_code = 202
        except Exception as exc:  # noqa: BLE001
            attempt.status = "failed"
            attempt.failure_reason = str(exc)[:500]
            success = False
        db.flush()
    return success


def _extract_phones(settings: TenantNotificationSetting) -> List[str]:
    """Extracts phone numbers from legal_recipient_phones_json."""
    raw = settings.legal_recipient_phones_json or []
    if isinstance(raw, list):
        return [
            entry.get("phone") or entry.get("phone_number") or entry
            for entry in raw
            if isinstance(entry, (dict, str))
        ]
    return []


def _extract_emails(settings: TenantNotificationSetting, *, trigger_type: str) -> List[str]:
    """Returns tenant-configured emails relevant to the trigger type."""
    legal_entries = settings.legal_recipient_emails_json or []
    compliance_entries = settings.compliance_recipient_emails_json or []

    def normalize(entries: Any) -> List[str]:
        if not isinstance(entries, list):
            return []
        values: List[str] = []
        for entry in entries:
            if isinstance(entry, dict):
                email = entry.get("email")
                if email:
                    values.append(str(email))
            elif isinstance(entry, str):
                values.append(entry)
        return values

    legal_emails = normalize(legal_entries)
    compliance_emails = normalize(compliance_entries)

    if trigger_type == TRIGGER_24H_LEGAL:
        return legal_emails
    if trigger_type in {TRIGGER_48H_ESCALATION, TRIGGER_COMPLIANCE_REVIEW}:
        return list(dict.fromkeys(legal_emails + compliance_emails))
    return list(dict.fromkeys(legal_emails + compliance_emails))


def _build_alert_key(payload: DispatchPayload) -> str:
    """Builds a deduplication key for dashboard alerts."""
    case_part = payload.case_id or "global"
    return f"{payload.tenant_id}:{case_part}:{payload.trigger_type}"


def _severity_to_urgency(severity: str) -> str:
    mapping = {SEVERITY_CRITICAL: "Critical / عاجل جداً", SEVERITY_WARNING: "High / عالي", SEVERITY_INFO: "Normal / عادي"}
    return mapping.get(severity, "High / عالي")
