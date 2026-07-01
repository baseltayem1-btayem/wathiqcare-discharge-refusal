"""
logging_config.py
Structured operational logging for WathiqCare backend.

Provides a minimal JSON-formatted logging configuration for production
observability. Keeps PII and secrets out of logs. Does NOT replace the
immutable hash-chained business AuditLogger — that handles compliance.
This module covers operational/diagnostic traces.

Usage:
    from backend.core.logging_config import get_logger
    logger = get_logger(__name__)
    logger.info("workflow.action", extra={"case_id": "...", "action": "..."})
"""

from __future__ import annotations

import json
import logging
import os
import re
import sys
from datetime import datetime, timezone
from typing import Any


# Keys whose values must never be emitted in plain text.
_SENSITIVE_KEYS = {
    "password", "secret", "token", "api_key", "apikey", "auth", "authorization",
    "cookie", "session", "otp", "code", "signature", "signature_data_url",
    "signature_image", "private_key", "privatekey", "connection_string",
    "connectionstring", "database_url", "databaseurl", "dsn",
}

# Keys whose values are likely to contain PHI/PII and must be redacted.
_PHI_KEYS = {
    "patient", "patient_name", "full_name", "first_name", "last_name", "mrn",
    "medical_record", "national_id", "nationalid", "iqama", "id_number",
    "idnumber", "email", "phone", "mobile", "msisdn", "address", "dob",
    "date_of_birth", "birth", "gender", "diagnosis", "clinical_notes",
    "clinicalnotes", "medical_history", "medicalhistory", "allergies",
    "medication", "treatment", "procedure", "physician_name", "signer_name",
    "witness_name", "guardian_name", "interpreter_name",
}


def _normalize_key(key: str) -> str:
    return re.sub(r"[-_\s]", "", key.lower())


def _is_sensitive_key(key: str) -> bool:
    normalized = _normalize_key(key)
    return any(pattern in normalized for pattern in _SENSITIVE_KEYS)


def _is_phi_key(key: str) -> bool:
    normalized = _normalize_key(key)
    return any(pattern in normalized for pattern in _PHI_KEYS)


def _hash_identifier(value: str) -> str:
    import hashlib
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]


def _mask_phone(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    if len(digits) <= 4:
        return "[REDACTED_PHONE]"
    return f"{digits[:3]}****{digits[-2:]}"


def _mask_email(value: str) -> str:
    if "@" not in value:
        return "[REDACTED_EMAIL]"
    local, domain = value.split("@", 1)
    local_visible = local[:2]
    domain_parts = domain.split(".")
    domain_visible = domain_parts[0][:2] if domain_parts else ""
    tld = f".{domain_parts[-1]}" if len(domain_parts) > 1 else ""
    return f"{local_visible}****@{domain_visible}****{tld}"


def _redact_value(key: str, value: Any) -> Any:
    if value is None:
        return None

    if isinstance(value, (int, float, bool)):
        return value

    normalized = _normalize_key(key)

    if _is_sensitive_key(key):
        return "[REDACTED]"

    if isinstance(value, str):
        if "userid" in normalized or "user_id" in normalized or key.lower() == "sub":
            return f"u_{_hash_identifier(value)}"
        if "tenantid" in normalized or "tenant_id" in normalized:
            return f"t_{_hash_identifier(value)}"
        if "email" in normalized:
            return _mask_email(value)
        if "phone" in normalized or "mobile" in normalized or "msisdn" in normalized:
            return _mask_phone(value)
        if _is_phi_key(key):
            return "[REDACTED]"
        if len(value) > 1000:
            return f"{value[:997]}..."
        return value

    if isinstance(value, list):
        return [_redact_value(key, item) for item in value[:20]]

    if isinstance(value, dict):
        return {k: _redact_value(k, v) for k, v in value.items()}

    return str(value)


def redact_log_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Return a copy of the payload with PII/secrets redacted."""
    return {k: _redact_value(k, v) for k, v in payload.items()}


class _RedactionFilter(logging.Filter):
    """Redact sensitive extra fields attached to log records."""

    def filter(self, record: logging.LogRecord) -> bool:
        reserved = {
            "name", "msg", "args", "created", "filename", "funcName",
            "levelname", "levelno", "lineno", "module", "msecs",
            "pathname", "process", "processName", "relativeCreated",
            "stack_info", "thread", "threadName", "exc_info", "exc_text",
            "message", "taskName",
        }
        for key in list(record.__dict__.keys()):
            if key in reserved or key.startswith("_"):
                continue
            setattr(record, key, _redact_value(key, getattr(record, key)))
        return True


class _StructuredJsonFormatter(logging.Formatter):
    """Emits one-line JSON log records for machine parsing."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        reserved = {
            "name", "msg", "args", "created", "filename", "funcName",
            "levelname", "levelno", "lineno", "module", "msecs",
            "pathname", "process", "processName", "relativeCreated",
            "stack_info", "thread", "threadName", "exc_info", "exc_text",
            "message", "taskName",
        }
        for key, value in record.__dict__.items():
            if key not in reserved and not key.startswith("_"):
                payload[key] = value

        if record.exc_info:
            payload["exc_type"] = record.exc_info[0].__name__ if record.exc_info[0] else None

        return json.dumps(payload, default=str, ensure_ascii=False)


def _configure_root_logger() -> None:
    root = logging.getLogger()
    if root.handlers:
        return  # Already configured — avoid duplicate handlers

    log_level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    log_level = getattr(logging, log_level_name, logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(_StructuredJsonFormatter())
    handler.addFilter(_RedactionFilter())
    root.addHandler(handler)
    root.setLevel(log_level)

    # Silence noisy third-party libraries at WARNING unless debug mode
    if log_level > logging.DEBUG:
        logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
        logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


_configure_root_logger()


def get_logger(name: str) -> logging.Logger:
    """Return a named logger. Import this everywhere in the backend."""
    return logging.getLogger(name)
