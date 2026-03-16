from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from backend.core.database import Base


class WorkflowTask(Base):
    __tablename__ = "workflow_tasks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=False, index=True)
    stage_code = Column(String, nullable=False, index=True)
    task_code = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    assigned_user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    assigned_team_code = Column(String, nullable=True, index=True)
    assigned_department_code = Column(String, ForeignKey("departments.code"), nullable=True, index=True)
    assigned_role_code = Column(String, nullable=True, index=True)
    escalation_department_code = Column(String, ForeignKey("departments.code"), nullable=True, index=True)
    status = Column(String, nullable=False, default="pending", index=True)
    priority = Column(String, nullable=False, default="medium")
    due_at = Column(DateTime, nullable=True, index=True)
    completed_at = Column(DateTime, nullable=True)
    completed_by = Column(String, ForeignKey("users.id"), nullable=True)
    escalation_level = Column(Integer, nullable=False, default=0)
    parent_task_id = Column(String, ForeignKey("workflow_tasks.id"), nullable=True)
    metadata_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
