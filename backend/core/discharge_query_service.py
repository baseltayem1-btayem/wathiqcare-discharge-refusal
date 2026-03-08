from pathlib import Path

from backend.core.database import SessionLocal
from backend.models.discharge_case import DischargeCase
from backend.models.discharge_workflow import DischargeRefusalWorkflow
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
        workflow = (
            db.query(DischargeRefusalWorkflow)
            .filter(
                DischargeRefusalWorkflow.tenant_id == tenant_id,
                DischargeRefusalWorkflow.case_id == case.id,
            )
            .first()
        )

        generated_documents = []
        if workflow:
            for document in workflow.documents:
                generated_documents.append(
                    {
                        "id": document.id,
                        "template_key": document.template_key,
                        "document_code": document.document_code,
                        "title": document.title,
                        "file_name": document.file_name,
                        "generated_at": document.generated_at.isoformat() if document.generated_at else None,
                    }
                )

        policy_documentation = None
        if workflow and workflow.case_documentation:
            case_doc = workflow.case_documentation
            policy_documentation = {
                "decision_recorded_at": case_doc.decision_recorded_at.isoformat() if case_doc.decision_recorded_at else None,
                "discussion_summary": case_doc.discussion_summary,
                "refusal_reasons": case_doc.refusal_reasons,
                "forms_issued": case_doc.forms_issued,
                "social_administrative_interventions": case_doc.social_administrative_interventions,
                "last_validated_at": case_doc.last_validated_at.isoformat() if case_doc.last_validated_at else None,
                "last_validation_status": case_doc.last_validation_status,
            }

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
            "generated_documents": generated_documents,
            "policy_documentation": policy_documentation,
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
