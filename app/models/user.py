import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, String
from sqlalchemy import Enum as SAEnum

from app.db.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(
        SAEnum("doctor", "nurse", "legal_officer", "admin", name="user_role"), nullable=False
    )
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_utcnow)
