# Minimal SQLAlchemy model for NotificationDeliveryAttempt
from sqlalchemy import Column, String, DateTime, Integer, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.core.database import Base

class NotificationDeliveryAttempt(Base):
    __tablename__ = "notification_delivery_attempts"
    id = Column(String, primary_key=True)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    case_id = Column(String, nullable=True)
    alert_id = Column(String, ForeignKey("dashboard_alerts.id"), nullable=True)
    channel = Column(String, nullable=False)
    provider = Column(String, nullable=True)
    recipient = Column(String, nullable=False)
    notification_type = Column(String, nullable=False)
    status = Column(String, default="pending", nullable=False)
    status_code = Column(Integer, nullable=True)
    failure_reason = Column(String, nullable=True)
    attempted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    metadata_json = Column(JSON, nullable=True)

    alert = relationship("DashboardAlert", backref="delivery_attempts")
