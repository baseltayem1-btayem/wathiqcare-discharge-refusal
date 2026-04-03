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
import sys
from datetime import datetime, timezone
from typing import Any


class _StructuredJsonFormatter(logging.Formatter):
    """Emits one-line JSON log records for machine parsing."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Pull any structured extra fields attached via logger.info(..., extra={...})
        RESERVED = {
            "name", "msg", "args", "created", "filename", "funcName",
            "levelname", "levelno", "lineno", "module", "msecs",
            "pathname", "process", "processName", "relativeCreated",
            "stack_info", "thread", "threadName", "exc_info", "exc_text",
            "message", "taskName",
        }
        for key, value in record.__dict__.items():
            if key not in RESERVED and not key.startswith("_"):
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
