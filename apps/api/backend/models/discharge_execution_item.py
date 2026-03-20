from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text

from backend.core.database import Base


class DischargeExecutionItem(Base):
    __tablename__ = "discharge_execution_items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=False, index=True)
    item_type = Column(String, nullable=False)
    target_team_code = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    is_required = Column(Boolean, nullable=False, default=True)
    is_completed = Column(Boolean, nullable=False, default=False)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
