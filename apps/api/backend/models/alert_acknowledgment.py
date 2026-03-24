"""AlertAcknowledgment — tracks who acknowledged an alert and when."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Text

from backend.core.database import Base


class AlertAcknowledgment(Base):
    __tablename__ = "alert_acknowledgments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    alert_id = Column(String, ForeignKey("dashboard_alerts.id"), nullable=False, index=True)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    acknowledged_by = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    acknowledged_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    note = Column(Text, nullable=True)
