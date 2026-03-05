from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.routers.auth import require_role
from app.schemas.escalation import EscalationCreate, EscalationOut
from app.services import consent_service, escalation_service

router = APIRouter(prefix="/escalations", tags=["escalations"])


@router.post("", response_model=EscalationOut, status_code=status.HTTP_201_CREATED)
def create_escalation(
    escalation_data: EscalationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "legal_officer", "admin")),
):
    try:
        consent = escalation_service.create_escalation(
            db, escalation_data.consent_id, escalation_data.reason, current_user.id
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    actions = escalation_service.get_escalation_actions(consent)
    return EscalationOut(
        consent_id=consent.id,
        reason=escalation_data.reason,
        escalated_at=consent.escalated_at,
        required_actions=actions,
    )


@router.get("/{consent_id}/actions")
def get_escalation_actions(
    consent_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("legal_officer", "admin", "doctor")),
):
    consent = consent_service.get_consent(db, consent_id)
    if not consent:
        raise HTTPException(status_code=404, detail="Consent not found")
    actions = escalation_service.get_escalation_actions(consent)
    return {"consent_id": consent_id, "actions": actions}
