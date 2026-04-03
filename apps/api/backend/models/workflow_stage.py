from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String

from backend.core.database import Base


class WorkflowStage(Base):
    __tablename__ = "workflow_stages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String, nullable=False, unique=True, index=True)
    name_en = Column(String, nullable=False)
    name_ar = Column(String, nullable=False)
    category = Column(String, nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    is_terminal = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
