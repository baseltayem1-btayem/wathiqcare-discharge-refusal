# Add SessionLocal import for test monkeypatching
from backend.core.database import SessionLocal
# Minimal stub for legal_artifact_service


def create_legal_artifact_case(db, tenant_id, actor_user_id, payload):
    """
    Create a new legal artifact case and return its case_id.
    """
    import uuid
    from backend.models.patient import Patient
    from backend.models.discharge_case import DischargeCase
    from datetime import datetime

    # Create patient
    patient = Patient(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        mrn=payload.get("patient_mrn", f"MRN-{uuid.uuid4().hex[:8]}"),
        full_name=payload.get("patient_name", "Unknown Patient"),
    )
    db.add(patient)
    db.flush()  # Assigns patient.id

    # Create discharge case
    case_id = str(uuid.uuid4())
    discharge_case = DischargeCase(
        id=case_id,
        tenant_id=tenant_id,
        patient_id=patient.id,
        created_by=actor_user_id,
        patient_name=patient.full_name,
        mrn=patient.mrn,
        attending_physician_name=payload.get("attending_physician_name"),
        refusal_reason=payload.get("refusal_reason"),
        status="pending",
        created_at=datetime.utcnow(),
    )
    db.add(discharge_case)
    db.commit()
    return {"case_id": case_id}


def upsert_legal_artifact_screen(*args, **kwargs):
    return {
        "status": "ok",
        "screen_id": kwargs.get("screen_id") or "legal-artifact-screen",
        "artifact_id": kwargs.get("artifact_id"),
    }
