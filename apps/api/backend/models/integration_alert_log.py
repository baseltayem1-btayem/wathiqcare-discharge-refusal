from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, String, Text

from backend.core.database import Base


class IntegrationAlertLog(Base):
    __tablename__ = "integration_alert_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    alert_type = Column(String, nullable=False, index=True)
    alert_key = Column(String, nullable=False, index=True)
    connector_key = Column(String, nullable=True, index=True)
    severity = Column(String, nullable=False, default="warning")
    status = Column(String, nullable=False, default="pending", index=True)

    channel = Column(String, nullable=False, default="internal")
    target = Column(String, nullable=True)
    message = Column(Text, nullable=False)
    error_message = Column(Text, nullable=True)

    payload_json = Column(JSON, nullable=True)
    is_suppressed = Column(Boolean, nullable=False, default=False)

    triggered_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    notified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
