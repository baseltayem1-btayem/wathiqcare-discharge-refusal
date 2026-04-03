"""DashboardAlert — persistent internal notification visible in the Alert Center UI."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from backend.core.database import Base


class DashboardAlert(Base):
    __tablename__ = "dashboard_alerts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=True, index=True)

    # Deduplication key — combination of (case_id, alert_type) must be unique per tenant
    alert_key = Column(String, nullable=False, index=True)
    alert_type = Column(String, nullable=False, index=True)  # legal_24h | legal_48h | blocked_finalize | missing_sig | compliance_review

    severity = Column(String, nullable=False, default="info", index=True)  # info | warning | critical
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)

    # Deep-link for the alert center
    case_deep_link = Column(String, nullable=True)

    is_acknowledged = Column(Boolean, nullable=False, default=False, index=True)
    acknowledged_by = Column(String, ForeignKey("users.id"), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)

    # Immutable — alerts cannot be deleted once created, only acknowledged
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    metadata_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
