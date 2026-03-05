from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.routers.auth import get_current_user, require_role
from app.schemas.consent import ConsentCreate, ConsentOut, ConsentUpdate
from app.services import consent_service

router = APIRouter(prefix="/consents", tags=["consents"])


@router.post("", response_model=ConsentOut, status_code=status.HTTP_201_CREATED)
def create_consent(
    consent_data: ConsentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "nurse", "admin")),
):
    return consent_service.create_consent(db, consent_data, current_user.id)


@router.get("/patient/{patient_id}", response_model=List[ConsentOut])
def get_patient_consents(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return consent_service.get_consents_by_patient(db, patient_id)


@router.get("/{consent_id}", response_model=ConsentOut)
def get_consent(
    consent_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    consent = consent_service.get_consent(db, consent_id)
    if not consent:
        raise HTTPException(status_code=404, detail="Consent not found")
    return consent


@router.patch("/{consent_id}", response_model=ConsentOut)
def update_consent(
    consent_id: str,
    update_data: ConsentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("doctor", "nurse", "admin")),
):
    consent = consent_service.update_consent_status(db, consent_id, update_data, current_user.id)
    if not consent:
        raise HTTPException(status_code=404, detail="Consent not found")
    return consent
