from datetime import datetime
import uuid
from pathlib import Path

from backend.core.database import SessionLocal
from backend.models.patient import Patient
from backend.models.discharge_case import DischargeCase
from backend.models.audit_log import AuditLog
from backend.models.user import User
from backend.models.tenant import Tenant
from backend.forms.pdf_generator import generate_discharge_refusal_pdf


def create_discharge_refusal(
    tenant_code: str,
    user_email: str,
    patient_mrn: str,
    patient_name: str,
    refusal_reason: str,
    signer_name: str,
    signer_role: str,
    signature_text: str,
):
    db = SessionLocal()

    try:
        tenant = db.query(Tenant).filter(Tenant.code == tenant_code).first()
        if not tenant:
            raise ValueError(f"Tenant '{tenant_code}' not found")

        user = db.query(User).filter(
            User.email == user_email,
            User.tenant_id == tenant.id
        ).first()
        if not user:
            raise ValueError(f"User '{user_email}' not found for tenant '{tenant_code}'")

        patient = db.query(Patient).filter(
            Patient.mrn == patient_mrn,
            Patient.tenant_id == tenant.id
        ).first()

        if not patient:
            patient = Patient(
                id=str(uuid.uuid4()),
                tenant_id=tenant.id,
                mrn=patient_mrn,
                full_name=patient_name,
                date_of_birth=None,
            )
            db.add(patient)
            db.flush()

        signed_at = datetime.utcnow()

        discharge_case = DischargeCase(
            id=str(uuid.uuid4()),
            tenant_id=tenant.id,
            patient_id=patient.id,
            created_by=user.id,
            status="CASE_CREATED",
            refusal_reason=refusal_reason,
            signer_name=signer_name,
            signer_role=signer_role,
            signature_text=signature_text,
            signed_at=signed_at,
            created_at=datetime.utcnow(),
        )
        db.add(discharge_case)
        db.flush()

        pdf_path = generate_discharge_refusal_pdf({
            "tenant_code": tenant.code,
            "user_email": user.email,
            "patient_mrn": patient.mrn,
            "patient_name": patient.full_name,
            "discharge_case_id": discharge_case.id,
            "status": discharge_case.status,
            "refusal_reason": discharge_case.refusal_reason,
            "signer_name": discharge_case.signer_name,
            "signer_role": discharge_case.signer_role,
            "signature_text": discharge_case.signature_text,
            "signed_at": signed_at.strftime("%Y-%m-%d %H:%M:%S UTC"),
        })

        discharge_case.pdf_file = Path(pdf_path).name
        db.flush()

        audit_log = AuditLog(
            id=str(uuid.uuid4()),
            tenant_id=tenant.id,
            user_id=user.id,
            entity_type="discharge_case",
            entity_id=discharge_case.id,
            action="create_discharge_refusal_with_signature",
            details=(
                f"Case {discharge_case.id} created with lifecycle status CASE_CREATED for patient MRN {patient.mrn}; "
                f"signed by {signer_name} ({signer_role}); PDF generated at {pdf_path}"
            ),
            created_at=datetime.utcnow(),
        )
        db.add(audit_log)

        db.commit()

        return {
            "message": "Discharge refusal created successfully",
            "tenant": tenant.code,
            "patient_id": patient.id,
            "patient_mrn": patient.mrn,
            "discharge_case_id": discharge_case.id,
            "audit_log_created": True,
            "pdf_file": discharge_case.pdf_file,
            "signed_at": signed_at.strftime("%Y-%m-%d %H:%M:%S UTC"),
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()
