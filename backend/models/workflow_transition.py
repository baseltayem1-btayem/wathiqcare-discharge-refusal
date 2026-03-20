from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, String

from backend.core.database import Base


class WorkflowTransition(Base):
    __tablename__ = "workflow_transitions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    from_stage_code = Column(String, nullable=False, index=True)
    action_code = Column(String, nullable=False, index=True)
    to_stage_code = Column(String, nullable=False, index=True)
    requires_comment = Column(Boolean, nullable=False, default=False)
    requires_role = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
