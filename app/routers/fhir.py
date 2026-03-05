from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.routers.auth import get_current_user
from app.services import fhir_service, patient_service
from app.services.consent_service import get_consent

router = APIRouter(prefix="/fhir", tags=["fhir"])


@router.get("/metadata")
def capability_statement():
    return {
        "resourceType": "CapabilityStatement",
        "status": "active",
        "kind": "instance",
        "fhirVersion": "4.0.1",
        "format": ["json"],
        "rest": [
            {
                "mode": "server",
                "resource": [
                    {
                        "type": "Patient",
                        "interaction": [{"code": "read"}, {"code": "create"}],
                    },
                    {"type": "Consent", "interaction": [{"code": "read"}]},
                ],
            }
        ],
    }


@router.get("/Patient/{patient_id}")
def get_fhir_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient = patient_service.get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return fhir_service.patient_to_fhir(patient)


@router.post("/Patient", status_code=status.HTTP_201_CREATED)
def create_fhir_patient(
    fhir_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    patient_create = fhir_service.parse_fhir_patient(fhir_data)
    existing = patient_service.get_patient_by_national_id(db, patient_create.national_id)
    if existing:
        raise HTTPException(
            status_code=400, detail="Patient with this national ID already exists"
        )
    patient = patient_service.create_patient(db, patient_create, current_user.id)
    return fhir_service.patient_to_fhir(patient)


@router.get("/Consent/{consent_id}")
def get_fhir_consent(
    consent_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    consent = get_consent(db, consent_id)
    if not consent:
        raise HTTPException(status_code=404, detail="Consent not found")
    return fhir_service.consent_to_fhir(consent)
