import hashlib
import json
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.audit import AuditLog


def _compute_hash(prev_hash: str, payload: dict, timestamp: str) -> str:
    data = prev_hash + json.dumps(payload, sort_keys=True, default=str) + timestamp
    return hashlib.sha256(data.encode()).hexdigest()


def log_event(
    db: Session,
    event_type: str,
    entity_type: str,
    entity_id: str,
    performed_by_id: str | None,
    payload: dict,
) -> AuditLog:
    last = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).first()
    prev_hash = last.entry_hash if last else ""
    # Use naive UTC datetime for consistent storage and hash computation across backends
    timestamp = datetime.now(timezone.utc).replace(tzinfo=None)
    entry_hash = _compute_hash(prev_hash, payload, timestamp.isoformat())
    log = AuditLog(
        event_type=event_type,
        entity_type=entity_type,
        entity_id=str(entity_id),
        performed_by=performed_by_id,
        payload=payload,
        prev_hash=prev_hash,
        entry_hash=entry_hash,
        timestamp=timestamp,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def verify_chain(db: Session) -> bool:
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.asc()).all()
    prev_hash = ""
    for log in logs:
        expected = _compute_hash(prev_hash, log.payload or {}, log.timestamp.isoformat())
        if log.entry_hash != expected:
            return False
        prev_hash = log.entry_hash
    return True
