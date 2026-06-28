from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from backend.core import database as database_module
from backend.models.workflow_audit_log import WorkflowAuditLog

logger = logging.getLogger(__name__)


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
    ) -> Optional[WorkflowAuditLog]:
        """
        Persist an audit entry in a separate session so it survives rollback of
        the caller's business transaction.  Errors are logged loudly; the caller
        receives the entry or None so failures cannot pass silently.
        """
        entry = WorkflowAuditLog(
            case_id=case_id,
            task_id=task_id,
            actor_user_id=actor_user_id,
            event_type=event_type,
            event_title=event_title,
            event_details=event_details,
            metadata_json=metadata_json,
        )

        audit_db = database_module.SessionLocal()
        try:
            audit_db.add(entry)
            audit_db.commit()
            audit_db.refresh(entry)
            logger.info("audit_entry_persisted case_id=%s event_type=%s", case_id, event_type)
            return entry
        except Exception as exc:
            audit_db.rollback()
            logger.exception(
                "audit_entry_persist_failed case_id=%s event_type=%s error=%s",
                case_id,
                event_type,
                exc,
            )
            return None
        finally:
            audit_db.close()
