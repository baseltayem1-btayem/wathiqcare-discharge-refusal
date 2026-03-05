import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum

from app.db.database import Base


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    recipient_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    notification_type = Column(
        SAEnum(
            "escalation_alert",
            "consent_update",
            "legal_review",
            "compliance_alert",
            name="notification_type",
        ),
        nullable=False,
    )
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    is_sent = Column(Boolean, default=False)
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
