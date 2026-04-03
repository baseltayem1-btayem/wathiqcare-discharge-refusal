from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, Float, String, Text

from backend.core.database import Base


class IntegrationSLABreach(Base):
    __tablename__ = "integration_sla_breaches"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    connector_key = Column(String, nullable=False, index=True)

    # breach_type: delayed_sync | high_failure_rate | max_queue_time
    breach_type = Column(String, nullable=False, index=True)
    severity = Column(String, nullable=False, default="warning")

    # status: open | resolved
    status = Column(String, nullable=False, default="open", index=True)

    message = Column(Text, nullable=False)
    metric_value = Column(Float, nullable=True)    # actual measured value
    threshold_value = Column(Float, nullable=True) # SLA threshold value

    details_json = Column(JSON, nullable=True)
    alert_dispatched = Column(Boolean, nullable=False, default=False)

    detected_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
