# Minimal stub for IntegrationSLABreach to resolve import errors in tests
from sqlalchemy import Column, String, Integer, Float, Boolean
from backend.core.database import Base

from sqlalchemy import DateTime

class IntegrationSLABreach(Base):
    __tablename__ = "integration_sla_breaches"
    id = Column(Integer, primary_key=True, autoincrement=True)
    connector_key = Column(String)
    breach_type = Column(String)
    severity = Column(String)
    status = Column(String)
    message = Column(String)
    metric_value = Column(Float)
    threshold_value = Column(Float)
    alert_dispatched = Column(Boolean)
    detected_at = Column(DateTime)
    resolved_at = Column(DateTime)
