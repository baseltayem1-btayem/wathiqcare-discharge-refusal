from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from backend.core.database import Base
from backend.models.actor_enums import ActorType, ActorEventType

class WorkflowActorEvent(Base):
    __tablename__ = "workflow_actor_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=False)
    actor_type = Column(Enum(ActorType), nullable=False)
    actor_user_id = Column(String, ForeignKey("users.id"), nullable=True)
    actor_name = Column(String, nullable=True)
    actor_identifier = Column(String, nullable=True)
    event_type = Column(Enum(ActorEventType), nullable=False)
    event_details = Column(JSON, nullable=True)
    document_hash = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    session_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("DischargeCase")
    actor_user = relationship("User")
