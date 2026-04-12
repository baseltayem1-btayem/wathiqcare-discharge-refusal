from __future__ import annotations

import hashlib
import logging
import os
from datetime import UTC, datetime
from typing import Any

from backend.core.database import SessionLocal
from backend.models.sms_dispatch_record import SmsDispatchRecord

logger = logging.getLogger(__name__)


def is_sms_evidence_enabled() -> bool:
    return os.getenv("SMS_EVIDENCE_ENABLED", "false").strip().lower() == "true"


def generate_sms_content_hash(message: str) -> str:
    normalized = (message or "").strip()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def mask_phone_number(phone: str) -> str:
    digits = "".join(ch for ch in (phone or "") if ch.isdigit())
    if not digits:
        return "****"
    if len(digits) <= 4:
        return "****"
    return f"{digits[:3]}****{digits[-2:]}"


def _extract_provider_message_id(result: dict[str, Any]) -> str | None:
    data = result.get("data")
    if not isinstance(data, dict):
        return None

    candidate_keys = [
        "messageId",
        "message_id",
        "id",
        "reference",
        "referenceId",
        "requestId",
    ]
    for key in candidate_keys:
        value = data.get(key)
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return None


def _extract_failure_reason(result: dict[str, Any]) -> str | None:
    data = result.get("data")
    if isinstance(data, dict):
        for key in ("error", "message", "detail", "error_description"):
            value = data.get(key)
            if value is None:
                continue
            text = str(value).strip()
            if text:
                return text

    if data is not None and not isinstance(data, dict):
        text = str(data).strip()
        if text:
            return text

    return None


def persist_sms_evidence(
    *,
    to: str,
    message: str,
    result: dict[str, Any],
    provider: str,
    event_type: str,
    case_id: str | None = None,
    document_id: str | None = None,
    recipient_role: str | None = None,
    message_template_key: str | None = None,
    message_template_version: str | None = None,
    requested_at: datetime | None = None,
    metadata_json: dict[str, Any] | None = None,
) -> None:
    if not is_sms_evidence_enabled():
        return

    now = datetime.now(UTC).replace(tzinfo=None)
    requested = requested_at or now

    ok = bool(result.get("ok"))
    status_code = result.get("status_code")
    provider_status = str(status_code if status_code is not None else "unknown")
    internal_status = "succeeded" if ok else "failed"

    attempt = result.get("attempt")
    max_attempts = result.get("max_attempts")
    retry_count = 0
    if isinstance(attempt, int):
        retry_count = max(attempt - 1, 0)

    sent_at = now if ok else None
    failed_at = None if ok else now

    provider_message_id = _extract_provider_message_id(result)
    failure_reason = None if ok else _extract_failure_reason(result)

    metadata: dict[str, Any] = {
        "attempt": attempt,
        "max_attempts": max_attempts,
    }
    if metadata_json:
        metadata.update(metadata_json)

    record = SmsDispatchRecord(
        case_id=case_id,
        document_id=document_id,
        recipient_phone_masked=mask_phone_number(to),
        recipient_role=recipient_role,
        event_type=event_type,
        message_template_key=message_template_key,
        message_template_version=message_template_version,
        provider=provider,
        provider_message_id=provider_message_id,
        provider_status=provider_status,
        internal_status=internal_status,
        content_hash=generate_sms_content_hash(message),
        requested_at=requested,
        sent_at=sent_at,
        failed_at=failed_at,
        failure_reason=failure_reason,
        retry_count=retry_count,
        metadata_json=metadata,
    )

    db = SessionLocal()
    try:
        db.add(record)
        db.commit()
    except Exception as exc:
        db.rollback()
        # Best-effort persistence only; never break SMS behavior.
        logger.error("sms_evidence_persist_failed reason=%s", str(exc))
    finally:
        db.close()
