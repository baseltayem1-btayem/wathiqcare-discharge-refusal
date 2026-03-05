from datetime import datetime
from typing import List

from sqlalchemy.orm import Session

from app.config import rules
from app.models.consent import Consent
from app.models.user import User
from app.services import audit_service, notification_service
from app.services.icd11_service import is_refusal_high_risk


def should_escalate(consent: Consent, icd11_codes: List[str]) -> bool:
    if consent.status == "refused":
        return True
    high_risk_codes = rules.get("legal", {}).get("high_risk_icd11_codes", [])
    if set(icd11_codes) & set(high_risk_codes):
        return True
    high_risk_procedures = rules.get("clinical", {}).get("high_risk_procedures", [])
    desc = (consent.procedure_description or "").lower()
    if any(p in desc for p in high_risk_procedures):
        return True
    return False


def create_escalation(
    db: Session, consent_id: str, reason: str, escalated_by: str
) -> Consent:
    consent = db.query(Consent).filter(Consent.id == consent_id).first()
    if not consent:
        raise ValueError(f"Consent {consent_id} not found")
    consent.status = "escalated"
    consent.is_escalated = True
    consent.escalated_at = datetime.utcnow()
    db.commit()
    db.refresh(consent)
    legal_officers = (
        db.query(User)
        .filter(User.role.in_(["legal_officer", "admin"]), User.is_active.is_(True))
        .all()
    )
    legal_ids = [u.id for u in legal_officers]
    notification_service.send_escalation_alert(db, consent_id, legal_ids)
    audit_service.log_event(
        db,
        event_type="consent_escalated",
        entity_type="consent",
        entity_id=consent_id,
        performed_by_id=escalated_by,
        payload={"reason": reason, "consent_id": consent_id},
    )
    return consent


def get_escalation_actions(consent: Consent) -> List[str]:
    actions = []
    if consent.status in ("refused", "escalated"):
        actions.append("Notify legal officer")
        actions.append("Schedule patient interview within 24 hours")
        if is_refusal_high_risk(consent.icd11_codes or []):
            actions.append("Immediate medical committee review required")
            actions.append("Notify hospital administration")
        actions.append("Document patient's mental competency assessment")
        actions.append("Prepare legal discharge waiver if applicable")
    return actions
