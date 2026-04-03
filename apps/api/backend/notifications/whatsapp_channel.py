"""WhatsApp channel — PDPL-safe critical-only fallback.

PDPL compliance requirements enforced here:
  - NO diagnosis, NO condition names, NO patient full name in the message body.
  - Only reference_id (case_id short), urgency label, and secure_link are sent.
  - Every send attempt is logged immutably.

Supported providers:
  - Twilio WhatsApp (via their REST API)
  - Stub provider for testing
"""
from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from datetime import datetime
from typing import Any, Dict, Optional
from urllib.error import HTTPError, URLError

from sqlalchemy.orm import Session

from backend.core.logging_config import get_logger
from backend.models.notification_delivery_attempt import NotificationDeliveryAttempt

logger = get_logger(__name__)

_WHATSAPP_TIMEOUT = 10.0
_SAFE_MESSAGE_TEMPLATE_AR = (
    "واثق كير | إشعار عاجل\n"
    "رقم المرجع: {reference_id}\n"
    "مستوى الأولوية: {urgency}\n"
    "رابط المراجعة الآمن: {secure_link}\n"
    "يُرجى المراجعة الفورية."
)
_SAFE_MESSAGE_TEMPLATE_EN = (
    "WathiqCare | Urgent Alert\n"
    "Reference: {reference_id}\n"
    "Priority: {urgency}\n"
    "Secure Review Link: {secure_link}\n"
    "Immediate review required."
)


def _build_pdpl_safe_message(reference_id: str, urgency: str, secure_link: str) -> str:
    """Returns an Arabic + English dual-language PDPL-safe WhatsApp message.

    Strictly contains: reference_id, urgency label, and secure_link ONLY.
    No diagnosis, no patient name, no medical details.
    """
    ar = _SAFE_MESSAGE_TEMPLATE_AR.format(
        reference_id=reference_id, urgency=urgency, secure_link=secure_link
    )
    en = _SAFE_MESSAGE_TEMPLATE_EN.format(
        reference_id=reference_id, urgency=urgency, secure_link=secure_link
    )
    return f"{ar}\n\n---\n\n{en}"


def send_whatsapp_alert(
    db: Session,
    *,
    tenant_id: str,
    case_id: Optional[str],
    alert_id: Optional[str],
    to_phone: str,
    reference_id: str,
    urgency: str,
    secure_link: str,
    notification_type: str,
    whatsapp_sender_number: Optional[str] = None,
    twilio_account_sid: Optional[str] = None,
    twilio_auth_token: Optional[str] = None,
    metadata_json: Optional[Dict[str, Any]] = None,
) -> bool:
    """Sends a PDPL-safe WhatsApp message.  Returns True on success, False on failure.

    Every attempt (including failures) is recorded in notification_delivery_attempts.
    """
    message_body = _build_pdpl_safe_message(
        reference_id=reference_id, urgency=urgency, secure_link=secure_link
    )

    attempt = NotificationDeliveryAttempt(
        tenant_id=tenant_id,
        case_id=case_id,
        alert_id=alert_id,
        channel="whatsapp",
        provider="twilio" if twilio_account_sid else "stub",
        recipient=to_phone,
        notification_type=notification_type,
        status="pending",
        attempted_at=datetime.utcnow(),
        metadata_json={
            "reference_id": reference_id,
            "urgency": urgency,
            "message_length": len(message_body),
            **(metadata_json or {}),
        },
    )
    db.add(attempt)
    db.flush()

    if not twilio_account_sid or not twilio_auth_token or not whatsapp_sender_number:
        logger.warning(
            "WHATSAPP_SKIPPED_NO_CREDENTIALS",
            extra={"tenant_id": tenant_id, "to_phone": to_phone, "notification_type": notification_type},
        )
        attempt.status = "skipped"
        attempt.failure_reason = "WhatsApp credentials not configured for this tenant."
        db.flush()
        return False

    try:
        status_code, response_body = _call_twilio(
            account_sid=twilio_account_sid,
            auth_token=twilio_auth_token,
            from_number=f"whatsapp:{whatsapp_sender_number}",
            to_number=f"whatsapp:{to_phone}",
            body=message_body,
        )
        attempt.status = "sent" if status_code in (200, 201) else "failed"
        attempt.status_code = status_code
        if attempt.status == "failed":
            attempt.failure_reason = f"Twilio HTTP {status_code}: {response_body[:500]}"
        db.flush()
        logger.info(
            "WHATSAPP_SENT",
            extra={"to": to_phone, "status_code": status_code, "notification_type": notification_type},
        )
        return attempt.status == "sent"

    except (HTTPError, URLError, Exception) as exc:  # noqa: BLE001
        attempt.status = "failed"
        attempt.failure_reason = str(exc)[:500]
        db.flush()
        logger.error(
            "WHATSAPP_SEND_FAILED",
            extra={"to": to_phone, "error": str(exc), "notification_type": notification_type},
        )
        return False


def _call_twilio(
    account_sid: str, auth_token: str, from_number: str, to_number: str, body: str
) -> tuple[int, str]:
    url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
    payload = urllib.parse.urlencode({"From": from_number, "To": to_number, "Body": body}).encode()

    import base64
    credentials = base64.b64encode(f"{account_sid}:{auth_token}".encode()).decode()
    req = urllib.request.Request(url, data=payload, method="POST")
    req.add_header("Authorization", f"Basic {credentials}")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    try:
        with urllib.request.urlopen(req, timeout=_WHATSAPP_TIMEOUT) as resp:
            return resp.status, resp.read().decode("utf-8", errors="ignore")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore") if hasattr(exc, "read") else str(exc)
        return exc.code, detail
