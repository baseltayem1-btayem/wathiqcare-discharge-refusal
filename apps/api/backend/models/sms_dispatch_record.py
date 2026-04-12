from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from backend.core.database import Base


class SmsDispatchRecord(Base):
    __tablename__ = "sms_dispatch_records"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=True, index=True)
    document_id = Column(String, nullable=True, index=True)

    recipient_phone_masked = Column(String, nullable=False)
    recipient_role = Column(String, nullable=True)
    event_type = Column(String, nullable=False, index=True)

    message_template_key = Column(String, nullable=True)
    message_template_version = Column(String, nullable=True)

    provider = Column(String, nullable=False, default="taqnyat")
    provider_message_id = Column(String, nullable=True, index=True)
    provider_status = Column(String, nullable=False)
    internal_status = Column(String, nullable=False, index=True)

    content_hash = Column(String, nullable=False, index=True)

    requested_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    sent_at = Column(DateTime, nullable=True)
    failed_at = Column(DateTime, nullable=True)
    failure_reason = Column(Text, nullable=True)

    retry_count = Column(Integer, nullable=False, default=0)
    metadata_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
