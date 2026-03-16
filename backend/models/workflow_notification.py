from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from backend.core.database import Base


class WorkflowNotification(Base):
    __tablename__ = "workflow_notifications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=True, index=True)
    task_id = Column(String, ForeignKey("workflow_tasks.id"), nullable=True, index=True)
    recipient_user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    recipient_email = Column(String, nullable=True)
    recipient_team_code = Column(String, nullable=True, index=True)
    recipient_department_code = Column(String, ForeignKey("departments.code"), nullable=True, index=True)
    channel = Column(String, nullable=False)
    notification_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    status = Column(String, nullable=False, default="pending", index=True)
    sent_at = Column(DateTime, nullable=True)
    read_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    metadata_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
