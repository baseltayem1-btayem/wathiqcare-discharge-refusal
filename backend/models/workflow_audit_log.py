from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from backend.core.database import Base



class WorkflowAuditLog(Base):
        __tablename__ = "workflow_audit_logs"

        @staticmethod
        def compute_hash(
                previous_hash: str,
                payload: dict,
                event_category: str = None,
                event_type: str = None,
                case_id: str = None,
                created_at: str = None,
        ) -> str:
                import hashlib, json
                canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
                # Compose the canonical string for hash
                parts = [
                        previous_hash or "",
                        event_category or "",
                        event_type or "",
                        case_id or "",
                        created_at or "",
                        canonical,
                ]
                to_hash = "|".join(parts)
                return hashlib.sha256(to_hash.encode("utf-8")).hexdigest()

        id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
        case_id = Column(String, ForeignKey("discharge_cases.id"), nullable=False, index=True)
        event_category = Column(String, nullable=False)
        event_type = Column(String, nullable=False, index=True)
        user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
        actor_type = Column(String, nullable=True)
        payload_json = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False)
        previous_hash = Column(String, nullable=True)
        current_hash = Column(String, nullable=False)
        chain_index = Column(String, nullable=False, default="0", index=True)
        ip_address = Column(String, nullable=True)
        session_id = Column(String, nullable=True)
        created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
