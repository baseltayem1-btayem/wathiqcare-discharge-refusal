import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Column, DateTime, ForeignKey, String

from app.db.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    event_type = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, nullable=False)
    performed_by = Column(String, ForeignKey("users.id"), nullable=True)
    payload = Column(JSON)
    prev_hash = Column(String, default="")
    entry_hash = Column(String, nullable=False)
    timestamp = Column(DateTime, default=_utcnow)
