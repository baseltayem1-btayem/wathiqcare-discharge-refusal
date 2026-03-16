from __future__ import annotations

import hashlib
import json
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from backend.models.workflow_audit_log import WorkflowAuditLog


class AuditService:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def _compute_hash(payload: Dict[str, Any]) -> str:
        serialized = json.dumps(payload, sort_keys=True, ensure_ascii=True, separators=(",", ":"))
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    def log(
        self,
        *,
        case_id: Optional[str],
        task_id: Optional[str],
        actor_user_id: Optional[str],
        actor_role: Optional[str] = None,
        actor_department_code: Optional[str] = None,
        actor_ip: Optional[str] = None,
        entity_type: str = "workflow_case",
        entity_id: Optional[str] = None,
        event_type: str,
        event_title: str,
        event_details: Optional[str] = None,
        payload_summary: Optional[str] = None,
        metadata_json: Optional[Dict[str, Any]] = None,
    ) -> WorkflowAuditLog:
        previous = (
            self.db.query(WorkflowAuditLog)
            .order_by(WorkflowAuditLog.created_at.desc(), WorkflowAuditLog.id.desc())
            .first()
        )
        previous_hash = previous.immutable_hash if previous else "GENESIS"
        created_at = datetime.utcnow()

        hash_payload = {
            "case_id": case_id,
            "task_id": task_id,
            "actor_user_id": actor_user_id,
            "actor_role": actor_role,
            "actor_department_code": actor_department_code,
            "actor_ip": actor_ip,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "event_type": event_type,
            "event_title": event_title,
            "event_details": event_details,
            "payload_summary": payload_summary,
            "metadata_json": metadata_json,
            "previous_hash": previous_hash,
            "created_at": created_at.isoformat(),
        }
        immutable_hash = self._compute_hash(hash_payload)

        entry = WorkflowAuditLog(
            case_id=case_id,
            task_id=task_id,
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            actor_department_code=actor_department_code,
            actor_ip=actor_ip,
            entity_type=entity_type,
            entity_id=entity_id,
            event_type=event_type,
            event_title=event_title,
            event_details=event_details,
            payload_summary=payload_summary,
            metadata_json=metadata_json,
            previous_hash=previous_hash,
            immutable_hash=immutable_hash,
            created_at=created_at,
        )
        self.db.add(entry)
        self.db.flush()
        return entry
