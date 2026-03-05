from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.patient import Patient
from app.schemas.patient import PatientCreate, PatientUpdate
from app.services import audit_service


def create_patient(db: Session, patient_data: PatientCreate, registered_by: str) -> Patient:
    patient = Patient(
        national_id=patient_data.national_id,
        full_name=patient_data.full_name,
        date_of_birth=patient_data.date_of_birth,
        gender=patient_data.gender,
        contact_phone=patient_data.contact_phone,
        contact_email=patient_data.contact_email,
        emergency_contact_name=patient_data.emergency_contact_name,
        emergency_contact_phone=patient_data.emergency_contact_phone,
        registered_by=registered_by,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    audit_service.log_event(
        db,
        "patient_created",
        "patient",
        patient.id,
        registered_by,
        {"national_id": patient_data.national_id, "full_name": patient_data.full_name},
    )
    return patient


def get_patient(db: Session, patient_id: str) -> Optional[Patient]:
    return db.query(Patient).filter(Patient.id == patient_id).first()


def get_patient_by_national_id(db: Session, national_id: str) -> Optional[Patient]:
    return db.query(Patient).filter(Patient.national_id == national_id).first()


def get_patients(db: Session, skip: int = 0, limit: int = 100) -> List[Patient]:
    return db.query(Patient).offset(skip).limit(limit).all()


def update_patient(
    db: Session, patient_id: str, update_data: PatientUpdate, updated_by: str
) -> Optional[Patient]:
    patient = get_patient(db, patient_id)
    if not patient:
        return None
    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(patient, field, value)
    patient.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(patient)
    audit_service.log_event(
        db,
        "patient_updated",
        "patient",
        patient_id,
        updated_by,
        update_data.model_dump(exclude_unset=True),
    )
    return patient
