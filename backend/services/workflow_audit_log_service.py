
import json
from datetime import datetime
from backend.models.workflow_audit_log import WorkflowAuditLog
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any

class WorkflowAuditLogService:
    def __init__(self, db: Session):
        self.db = db

    def get_last_entry(self, case_id: str) -> Optional[WorkflowAuditLog]:
        last = (
            self.db.query(WorkflowAuditLog)
            .filter(WorkflowAuditLog.case_id == case_id)
            .order_by(WorkflowAuditLog.chain_index.desc())
            .first()
        )
        return last

    def append_audit_log(
        self,
        case_id: str,
        event_category: str,
        event_type: str,
        user_id: Optional[str],
        actor_type: Optional[str],
        payload_json: Dict[str, Any],
        ip_address: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> WorkflowAuditLog:
        last = self.get_last_entry(case_id)
        previous_hash = last.current_hash if last else None
        chain_index = str(int(last.chain_index) + 1) if last else "0"
        created_at_dt = datetime.utcnow()
        created_at_iso = created_at_dt.isoformat()
        current_hash = WorkflowAuditLog.compute_hash(
            previous_hash,
            payload_json,
            event_category,
            event_type,
            case_id,
            created_at_iso,
        )
        entry = WorkflowAuditLog(
            case_id=case_id,
            event_category=event_category,
            event_type=event_type,
            user_id=user_id,
            actor_type=actor_type,
            payload_json=payload_json,
            previous_hash=previous_hash,
            current_hash=current_hash,
            chain_index=chain_index,
            ip_address=ip_address,
            session_id=session_id,
            created_at=created_at_dt,
        )
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)
        return entry
