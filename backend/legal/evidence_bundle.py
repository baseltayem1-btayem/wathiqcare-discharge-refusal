import json
import hashlib
import zipfile
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any

from backend.core.database import SessionLocal
from backend.models.discharge_case import DischargeCase
from backend.models.patient import Patient
from backend.models.user import User
from backend.models.tenant import Tenant
from backend.models.audit_log import AuditLog

BUNDLE_DIR = Path("backend/generated/bundles")
PDF_DIR = Path("backend/generated")
BUNDLE_DIR.mkdir(parents=True, exist_ok=True)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def generate_evidence_bundle(discharge_case_id: str) -> Dict[str, Any]:
    db = SessionLocal()

    try:
        case = db.query(DischargeCase).filter(DischargeCase.id == discharge_case_id).first()
        if not case:
            raise ValueError(f"Discharge case '{discharge_case_id}' not found")

        patient = db.query(Patient).filter(Patient.id == case.patient_id).first()
        user = db.query(User).filter(User.id == case.created_by).first()
        tenant = db.query(Tenant).filter(Tenant.id == case.tenant_id).first()

        audit_logs = (
            db.query(AuditLog)
            .filter(
                AuditLog.entity_type == "discharge_case",
                AuditLog.entity_id == case.id
            )
            .order_by(AuditLog.created_at.asc())
            .all()
        )

        if not case.pdf_file:
            raise ValueError("No PDF file recorded for this discharge case")

        pdf_name = Path(case.pdf_file).name
        pdf_path = PDF_DIR / pdf_name
        if not pdf_path.exists():
            raise ValueError(f"PDF file not found on disk: {pdf_name}")

        bundle_id = f"evidence_bundle_{case.id}"
        bundle_folder = BUNDLE_DIR / bundle_id
        bundle_folder.mkdir(parents=True, exist_ok=True)

        case_summary = {
            "bundle_id": bundle_id,
            "generated_at": _utc_now_iso(),
            "case_type": "DISCHARGE_REFUSAL",
            "discharge_case": {
                "id": case.id,
                "status": case.status,
                "refusal_reason": case.refusal_reason,
                "created_at": case.created_at.isoformat() if case.created_at else None,
                "signed_at": case.signed_at.isoformat() if case.signed_at else None,
                "pdf_file": pdf_name,
            },
            "tenant": {
                "id": tenant.id if tenant else None,
                "code": tenant.code if tenant else None,
                "name": tenant.name if tenant else None,
            },
            "patient": {
                "id": patient.id if patient else None,
                "mrn": patient.mrn if patient else None,
                "full_name": patient.full_name if patient else None,
            },
            "created_by": {
                "id": user.id if user else None,
                "email": user.email if user else None,
                "full_name": user.full_name if user else None,
                "role": user.role if user else None,
            },
            "signature": {
                "signer_name": case.signer_name,
                "signer_role": case.signer_role,
                "signature_text": case.signature_text,
            },
        }

        audit_payload = [
            {
                "id": log.id,
                "action": log.action,
                "details": log.details,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in audit_logs
        ]

        copied_pdf = bundle_folder / pdf_name
        copied_pdf.write_bytes(pdf_path.read_bytes())

        case_summary_text = json.dumps(case_summary, ensure_ascii=False, indent=2)
        audit_logs_text = json.dumps(audit_payload, ensure_ascii=False, indent=2)

        case_summary_file = bundle_folder / "case_summary.json"
        audit_logs_file = bundle_folder / "audit_logs.json"
        manifest_file = bundle_folder / "manifest.json"

        case_summary_file.write_text(case_summary_text, encoding="utf-8")
        audit_logs_file.write_text(audit_logs_text, encoding="utf-8")

        manifest = {
            "bundle_id": bundle_id,
            "generated_at": _utc_now_iso(),
            "discharge_case_id": case.id,
            "files": [
                {
                    "name": pdf_name,
                    "sha256": _sha256_file(copied_pdf),
                },
                {
                    "name": "case_summary.json",
                    "sha256": _sha256_bytes(case_summary_text.encode("utf-8")),
                },
                {
                    "name": "audit_logs.json",
                    "sha256": _sha256_bytes(audit_logs_text.encode("utf-8")),
                },
            ],
        }

        manifest_text = json.dumps(manifest, ensure_ascii=False, indent=2)
        manifest_file.write_text(manifest_text, encoding="utf-8")

        zip_name = f"{bundle_id}.zip"
        zip_path = BUNDLE_DIR / zip_name

        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.write(copied_pdf, arcname=pdf_name)
            zf.write(case_summary_file, arcname="case_summary.json")
            zf.write(audit_logs_file, arcname="audit_logs.json")
            zf.write(manifest_file, arcname="manifest.json")

        return {
            "message": "Evidence bundle generated successfully",
            "bundle_id": bundle_id,
            "bundle_file": zip_name,
            "bundle_path": str(zip_path),
        }

    finally:
        db.close()
