from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String

from backend.core.database import Base


class AssignmentRule(Base):
    __tablename__ = "assignment_rules"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    rule_code = Column(String, nullable=False, unique=True, index=True)
    event_code = Column(String, nullable=False, index=True)
    target_stage_code = Column(String, nullable=True, index=True)
    target_team_code = Column(String, nullable=True)
    target_department_code = Column(String, ForeignKey("departments.code"), nullable=True)
    target_role_code = Column(String, nullable=True)
    target_user_id = Column(String, ForeignKey("users.id"), nullable=True)
    escalation_department_code = Column(String, ForeignKey("departments.code"), nullable=True)
    escalation_role_code = Column(String, nullable=True)
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
