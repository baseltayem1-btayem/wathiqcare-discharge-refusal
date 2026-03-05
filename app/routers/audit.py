from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.routers.auth import require_role
from app.services.audit_service import verify_chain

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("/logs")
def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("legal_officer", "admin")),
):
    logs = (
        db.query(AuditLog)
        .order_by(AuditLog.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": log.id,
            "event_type": log.event_type,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "performed_by": log.performed_by,
            "payload": log.payload,
            "entry_hash": log.entry_hash,
            "timestamp": log.timestamp.isoformat(),
        }
        for log in logs
    ]


@router.get("/verify")
def verify_audit_chain(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("legal_officer", "admin")),
):
    valid = verify_chain(db)
    return {
        "chain_valid": valid,
        "message": (
            "Audit chain is intact" if valid else "Audit chain integrity violation detected"
        ),
    }
