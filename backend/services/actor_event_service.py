from sqlalchemy.orm import Session
from backend.models.workflow_actor_event import WorkflowActorEvent
from backend.models.actor_enums import ActorType, ActorEventType
from typing import Optional, Dict, Any

class ActorEventService:
    def __init__(self, db: Session):
        self.db = db

    def record_actor_event(
        self,
        case_id: str,
        actor_type: str,
        event_type: str,
        actor_user_id: Optional[str] = None,
        actor_name: Optional[str] = None,
        actor_identifier: Optional[str] = None,
        event_details: Optional[Dict[str, Any]] = None,
        document_hash: Optional[str] = None,
        ip_address: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> WorkflowActorEvent:
        # Validate actor_type
        if actor_type not in ActorType._value2member_map_:
            raise ValueError(f"Invalid actor_type: {actor_type}")
        # Validate event_type
        if event_type not in ActorEventType._value2member_map_:
            raise ValueError(f"Invalid event_type: {event_type}")
        event = WorkflowActorEvent(
            case_id=case_id,
            actor_type=ActorType(actor_type),
            event_type=ActorEventType(event_type),
            actor_user_id=actor_user_id,
            actor_name=actor_name,
            actor_identifier=actor_identifier,
            event_details=event_details,
            document_hash=document_hash,
            ip_address=ip_address,
            session_id=session_id,
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        # --- Unified Audit Log ---
        from backend.services.workflow_audit_log_service import WorkflowAuditLogService
        audit_service = WorkflowAuditLogService(self.db)
        audit_service.append_audit_log(
            case_id=case_id,
            event_category="actor_event",
            event_type=event_type,
            user_id=actor_user_id,
            actor_type=actor_type,
            payload_json={
                "actor_type": actor_type,
                "event_type": event_type,
                "actor_user_id": actor_user_id,
                "actor_name": actor_name,
                "actor_identifier": actor_identifier,
                "event_details": event_details,
                "document_hash": document_hash,
                "ip_address": ip_address,
                "session_id": session_id,
            },
        )
        return event
