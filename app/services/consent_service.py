from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.config import rules
from app.models.consent import Consent
from app.schemas.consent import ConsentCreate, ConsentUpdate
from app.services import audit_service


def create_consent(db: Session, consent_data: ConsentCreate, consented_by: str) -> Consent:
    validity_days = rules.get("clinical", {}).get("consent_validity_days", 90)
    valid_until = consent_data.valid_until or (datetime.now(timezone.utc) + timedelta(days=validity_days))
    consent = Consent(
        patient_id=consent_data.patient_id,
        consent_type=consent_data.consent_type,
        icd11_codes=consent_data.icd11_codes or [],
        procedure_description=consent_data.procedure_description,
        consented_by=consented_by,
        witnessed_by=consent_data.witnessed_by,
        valid_until=valid_until,
        status="pending",
    )
    db.add(consent)
    db.commit()
    db.refresh(consent)
    audit_service.log_event(
        db,
        "consent_created",
        "consent",
        consent.id,
        consented_by,
        {"patient_id": consent_data.patient_id, "consent_type": consent_data.consent_type},
    )
    return consent


def get_consent(db: Session, consent_id: str) -> Optional[Consent]:
    return db.query(Consent).filter(Consent.id == consent_id).first()


def get_consents_by_patient(db: Session, patient_id: str) -> List[Consent]:
    return db.query(Consent).filter(Consent.patient_id == patient_id).all()


def update_consent_status(
    db: Session, consent_id: str, update_data: ConsentUpdate, updated_by: str
) -> Optional[Consent]:
    consent = get_consent(db, consent_id)
    if not consent:
        return None
    if update_data.status:
        consent.status = update_data.status
        if update_data.status == "granted":
            consent.signed_at = datetime.now(timezone.utc)
    if update_data.refusal_reason:
        consent.refusal_reason = update_data.refusal_reason
    if update_data.witnessed_by:
        consent.witnessed_by = update_data.witnessed_by
    consent.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(consent)
    audit_service.log_event(
        db,
        "consent_updated",
        "consent",
        consent_id,
        updated_by,
        update_data.model_dump(exclude_unset=True),
    )
    return consent
