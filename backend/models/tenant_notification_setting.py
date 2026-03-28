
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from backend.core.database import Base

class TenantNotificationSetting(Base):
    __tablename__ = "tenant_notification_settings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, ForeignKey("tenants.id"), unique=True, nullable=False)
    email_enabled = Column(Boolean, default=True)
    dashboard_enabled = Column(Boolean, default=True)
    whatsapp_enabled = Column(Boolean, default=False)
    whatsapp_sender_number = Column(String, nullable=True)
    legal_recipient_phones_json = Column(JSON, nullable=True)
    legal_recipient_emails_json = Column(JSON, nullable=True)
    compliance_recipient_emails_json = Column(JSON, nullable=True)
    notification_threshold_minutes = Column(Integer, default=1440)
    escalation_threshold_minutes = Column(Integer, default=2880)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tenant = relationship("Tenant", backref="notification_setting", cascade="all, delete")
