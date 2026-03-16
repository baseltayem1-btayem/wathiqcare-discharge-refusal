from datetime import datetime
import uuid

from sqlalchemy import Boolean, Column, DateTime, JSON, String
from sqlalchemy.dialects.postgresql import JSONB

from backend.core.database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String, nullable=False, unique=True, index=True)
    name_en = Column(String, nullable=False)
    name_ar = Column(String, nullable=False)
    parent_code = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    metadata_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
