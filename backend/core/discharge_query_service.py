from pathlib import Path

from backend.core.database import SessionLocal
from backend.models.discharge_case import DischargeCase
from backend.models.patient import Patient
from backend.models.audit_log import AuditLog


def list_discharge_cases_for_tenant(tenant_id: str):
    db = SessionLocal()
    try:
        rows = (
            db.query(DischargeCase, Patient)
            .join(Patient, Patient.id == DischargeCase.patient_id)
            .filter(DischargeCase.tenant_id == tenant_id)
            .order_by(DischargeCase.created_at.desc())
            .all()
        )

        results = []
        for case, patient in rows:
            results.append({
                "id": case.id,
                "patient_mrn": patient.mrn,
                "patient_name": patient.full_name,
                "status": case.status,
                "refusal_reason": case.refusal_reason,
                "signer_name": case.signer_name,
                "signer_role": case.signer_role,
                "pdf_file": case.pdf_file,
                "created_at": case.created_at.isoformat() if case.created_at else None,
            })
        return results
    finally:
        db.close()


def get_discharge_case_detail(tenant_id: str, case_id: str):
    db = SessionLocal()
    try:
        row = (
            db.query(DischargeCase, Patient)
            .join(Patient, Patient.id == DischargeCase.patient_id)
            .filter(
                DischargeCase.tenant_id == tenant_id,
                DischargeCase.id == case_id
            )
            .first()
        )

        if not row:
            return None

        case, patient = row
        return {
            "id": case.id,
            "tenant_id": case.tenant_id,
            "patient_id": case.patient_id,
            "created_by": case.created_by,
            "patient_mrn": patient.mrn,
            "patient_name": patient.full_name,
            "status": case.status,
            "refusal_reason": case.refusal_reason,
            "signer_name": case.signer_name,
            "signer_role": case.signer_role,
            "signature_text": case.signature_text,
            "signed_at": case.signed_at.isoformat() if case.signed_at else None,
            "pdf_file": case.pdf_file,
            "created_at": case.created_at.isoformat() if case.created_at else None,
        }
    finally:
        db.close()


def list_audit_logs_for_case(tenant_id: str, case_id: str):
    db = SessionLocal()
    try:
        case = (
            db.query(DischargeCase)
            .filter(
                DischargeCase.tenant_id == tenant_id,
                DischargeCase.id == case_id
            )
            .first()
        )
        if not case:
            return None

        logs = (
            db.query(AuditLog)
            .filter(
                AuditLog.tenant_id == tenant_id,
                AuditLog.entity_type == "discharge_case",
                AuditLog.entity_id == case_id,
            )
            .order_by(AuditLog.created_at.desc())
            .all()
        )

        return [
            {
                "id": log.id,
                "action": log.action,
                "details": log.details,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ]
    finally:
        db.close()


def list_bundles():
    bundles_dir = Path("backend/generated/bundles")
    bundles_dir.mkdir(parents=True, exist_ok=True)

    items = []
    for path in sorted(bundles_dir.iterdir(), key=lambda p: p.name, reverse=True):
        if path.is_file() and path.suffix == ".zip":
            items.append({
                "name": path.name,
                "path": str(path),
            })
    return items
