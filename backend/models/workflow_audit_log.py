from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from backend.core.database import Base


class WorkflowAuditLog(Base):
    __tablename__ = "workflow_audit_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=True, index=True)
    task_id = Column(String, ForeignKey("workflow_tasks.id"), nullable=True, index=True)
    actor_user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    actor_role = Column(String, nullable=True, index=True)
    actor_department_code = Column(String, ForeignKey("departments.code"), nullable=True, index=True)
    actor_ip = Column(String, nullable=True)
    entity_type = Column(String, nullable=False, default="workflow_case", index=True)
    entity_id = Column(String, nullable=True, index=True)
    event_type = Column(String, nullable=False, index=True)
    event_title = Column(String, nullable=False)
    event_details = Column(Text, nullable=True)
    payload_summary = Column(Text, nullable=True)
    metadata_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    previous_hash = Column(String, nullable=False, default="GENESIS")
    immutable_hash = Column(String, nullable=False, unique=True, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
