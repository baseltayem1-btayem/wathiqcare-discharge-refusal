# Minimal stub for AlertAcknowledgment to resolve import errors in tests
from sqlalchemy import Column, String
from backend.core.database import Base

class AlertAcknowledgment(Base):
    __tablename__ = "alert_acknowledgments"
    id = Column(String, primary_key=True)
