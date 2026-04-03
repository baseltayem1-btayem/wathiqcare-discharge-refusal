"""NotificationDeliveryAttempt — immutable audit record for every dispatch attempt."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from backend.core.database import Base


class NotificationDeliveryAttempt(Base):
    __tablename__ = "notification_delivery_attempts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=True, index=True)
    alert_id = Column(String, ForeignKey("dashboard_alerts.id"), nullable=True, index=True)

    # Channel used: email | dashboard | whatsapp
    channel = Column(String, nullable=False, index=True)
    provider = Column(String, nullable=True)  # microsoft_graph | internal | twilio | etc.

    recipient = Column(String, nullable=False)  # email address, phone number, or user_id
    notification_type = Column(String, nullable=False, index=True)

    # Delivery outcome
    status = Column(String, nullable=False, default="pending", index=True)  # pending | sent | failed | skipped
    status_code = Column(Integer, nullable=True)  # HTTP response code from provider
    failure_reason = Column(Text, nullable=True)

    # Immutable timestamps
    attempted_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    metadata_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
