from __future__ import annotations

from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from backend.models.workflow_audit_log import WorkflowAuditLog


class AuditService:
    def __init__(self, db: Session):
        self.db = db

    def log(
        self,
        *,
        case_id: Optional[str],
        task_id: Optional[str],
        actor_user_id: Optional[str],
        event_type: str,
        event_title: str,
        event_details: Optional[str] = None,
        metadata_json: Optional[Dict[str, Any]] = None,
    ) -> WorkflowAuditLog:
        entry = WorkflowAuditLog(
            case_id=case_id,
            actor_user_id=actor_user_id,
            event_type=event_type,
            event_title=event_title,
            event_details=event_details,
            metadata_json=metadata_json,
        )
        self.db.add(entry)
        self.db.flush()
        return entry
