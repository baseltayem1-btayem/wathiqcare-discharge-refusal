"""TenantNotificationSetting — per-tenant configuration for notification channels."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB

from backend.core.database import Base


class TenantNotificationSetting(Base):
    __tablename__ = "tenant_notification_settings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, unique=True, index=True)

    # ── Email (primary) ──────────────────────────────────────────────────────
    email_enabled = Column(Boolean, nullable=False, default=True)

    # ── Dashboard (secondary fallback) ───────────────────────────────────────
    dashboard_enabled = Column(Boolean, nullable=False, default=True)

    # ── WhatsApp (critical-only tertiary fallback) ────────────────────────────
    whatsapp_enabled = Column(Boolean, nullable=False, default=False)
    # Twilio / WhatsApp Business API credentials (tenant-specific)
    whatsapp_sender_number = Column(String, nullable=True)  # e.g. +966XXXXXXXX

    # JSON list of {name, phone} for legal/compliance recipients
    legal_recipient_phones_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    # JSON list of {name, email} for legal/compliance recipients
    legal_recipient_emails_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    # JSON list of {name, email} for compliance team
    compliance_recipient_emails_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)

    # ── Escalation thresholds (minutes) ─────────────────────────────────────
    notification_threshold_minutes = Column(Integer, nullable=False, default=1440)  # 24 h
    escalation_threshold_minutes = Column(Integer, nullable=False, default=2880)   # 48 h

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
