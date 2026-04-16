import json
import hashlib
import logging
import os
import zipfile
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any

from backend.core.database import SessionLocal
from backend.models.discharge_case import DischargeCase
from backend.models.discharge_workflow import DischargeRefusalWorkflow
from backend.models.patient import Patient
from backend.models.user import User
from backend.models.tenant import Tenant
from backend.models.audit_log import AuditLog
from backend.legal.evidence_cover_page import generate_cover_page_pdf
from backend.legal.evidence_bundle_security import RFC3161TimestampService, DetachedManifestSignatureService

BUNDLE_DIR = Path("backend/generated/bundles")
PDF_DIR = Path("backend/generated")
SIGNATURE_DIR = Path("backend/generated/document_signature")
logger = logging.getLogger(__name__)
BUNDLE_DIR.mkdir(parents=True, exist_ok=True)
SIGNATURE_DIR.mkdir(parents=True, exist_ok=True)


def build_discharge_refusal_bundle(order: Any, refusal: Any, pdf_path: str) -> str:
    """
    Backward-compatible helper used by in-memory workflow tests.

    Creates a small evidence zip from runtime objects without requiring DB records.
    """
    order_id = str(getattr(order, "order_id", "unknown-order"))
    refusal_id = str(getattr(refusal, "refusal_id", "unknown-refusal"))

    bundle_name = f"discharge_refusal_bundle_{order_id}_{refusal_id}.zip"
    bundle_path = BUNDLE_DIR / bundle_name

    payload = {
        "generated_at": _utc_now_iso(),
        "order_id": order_id,
        "patient_id": str(getattr(order, "patient_id", "")),
        "physician_id": str(getattr(order, "physician_id", "")),
        "diagnosis_codes": list(getattr(order, "diagnosis_codes", []) or []),
        "refusal_id": refusal_id,
        "refusal_reason": str(getattr(refusal, "reason", "")),
        "pdf_file": Path(pdf_path).name if pdf_path else None,
    }

    with zipfile.ZipFile(bundle_path, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("refusal_summary.json", json.dumps(payload, ensure_ascii=True, indent=2))

        pdf_file_path = Path(pdf_path)
        if pdf_path and pdf_file_path.exists():
            archive.write(pdf_file_path, arcname=pdf_file_path.name)

    return str(bundle_path)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def _canonical_json_bytes(payload: Dict[str, Any]) -> bytes:
    return json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _build_hash_chain(records: list[Dict[str, Any]], seed: str) -> tuple[list[Dict[str, Any]], str]:
    previous_hash = _sha256_bytes(seed.encode("utf-8"))
    chained: list[Dict[str, Any]] = []

    for index, record in enumerate(records, start=1):
        normalized = dict(record)
        normalized["sequence"] = index
        record_hash = _sha256_bytes(previous_hash.encode("utf-8") + _canonical_json_bytes(normalized))
        normalized["previous_hash"] = previous_hash
        normalized["entry_hash"] = record_hash
        chained.append(normalized)
        previous_hash = record_hash

    return chained, previous_hash


def _get_pdf_integrity_profile(path: Path) -> Dict[str, Any]:
    data = path.read_bytes()
    header = data[:8]
    tail = data[-4096:] if len(data) > 4096 else data

    header_text = header.decode("ascii", errors="ignore")
    has_valid_pdf_header = header_text.startswith("%PDF-")

    pdf_version = None
    if has_valid_pdf_header and len(header_text) >= 8:
        pdf_version = header_text[5:8]

    return {
        "file_name": path.name,
        "file_size_bytes": len(data),
        "sha256": _sha256_bytes(data),
        "structure_checks": {
            "has_valid_pdf_header": has_valid_pdf_header,
            "pdf_version": pdf_version,
            "has_eof_marker": b"%%EOF" in tail,
            "has_cross_reference": b"xref" in data or b"/XRef" in data,
            "estimated_page_markers": data.count(b"/Type /Page"),
        },
    }


def _collect_signature_evidence(workflow: DischargeRefusalWorkflow | None) -> list[Dict[str, Any]]:
    if not workflow:
        return []

    documents = getattr(workflow, "documents", []) or []
    signature_evidence: list[Dict[str, Any]] = []

    for document in documents:
        metadata_path = _signature_metadata_path(document.id)
        signature_metadata = _load_json(metadata_path)

        signature_evidence.append(
            {
                "document_id": document.id,
                "form_type": getattr(document, "template_key", None),
                "file_name": document.file_name,
                "generation_status": signature_metadata.get("generationStatus", "generated"),
                "signed_status": bool(document.signed_at) or bool(signature_metadata.get("signedStatus")),
                "verified_status": bool(signature_metadata.get("verifiedStatus")),
                "signed_at": document.signed_at.isoformat() if document.signed_at else None,
                "verified_at": signature_metadata.get("verifiedAt"),
                "signature_metadata_file": metadata_path.name,
                "signature_metadata_present": bool(signature_metadata),
                "signature_metadata_sha256": (
                    _sha256_bytes(_canonical_json_bytes(signature_metadata)) if signature_metadata else None
                ),
            }
        )

    return signature_evidence


def _signature_metadata_path(document_id: str) -> Path:
    return SIGNATURE_DIR / f"{document_id}.json"


def _load_json(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: Dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=True, indent=2), encoding="utf-8")


def _mask_patient_reference(raw_reference: str | None) -> str:
    value = (raw_reference or "").strip()
    if len(value) <= 4:
        return "****"
    return f"{value[:2]}***{value[-2:]}"


def generate_evidence_bundle(
    discharge_case_id: str,
    tenant_id: str | None = None,
    actor_user_id: str | None = None,
) -> Dict[str, Any]:
    db = SessionLocal()

    try:
        query = db.query(DischargeCase).filter(DischargeCase.id == discharge_case_id)
        if tenant_id:
            query = query.filter(DischargeCase.tenant_id == tenant_id)
        case = query.first()
        if not case:
            raise ValueError(f"Discharge case '{discharge_case_id}' not found")

        patient = db.query(Patient).filter(Patient.id == case.patient_id).first()
        user = db.query(User).filter(User.id == case.created_by).first()
        tenant = db.query(Tenant).filter(Tenant.id == case.tenant_id).first()

        audit_logs = (
            db.query(AuditLog)
            .filter(
                AuditLog.tenant_id == case.tenant_id,
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
            "evidence_quality": {
                "profile": "phase2-evidence-quality-v1",
                "timestamping": "enabled",
                "audit_hash_chain": "enabled",
                "digital_signature_snapshot": "enabled",
                "chain_of_custody": "enabled",
            },
        }

        copied_pdf = bundle_folder / pdf_name
        copied_pdf.write_bytes(pdf_path.read_bytes())
        pdf_integrity_profile = _get_pdf_integrity_profile(copied_pdf)

        workflow = (
            db.query(DischargeRefusalWorkflow)
            .filter(DischargeRefusalWorkflow.case_id == case.id)
            .first()
        )

        signature_evidence = _collect_signature_evidence(workflow)

        base_audit_payload = [
            {
                "id": log.id,
                "action": log.action,
                "details": log.details,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in audit_logs
        ]
        audit_payload, audit_chain_root = _build_hash_chain(base_audit_payload, seed=f"{bundle_id}:audit")

        generated_at = _utc_now()
        generated_at_iso = generated_at.isoformat()

        custody_base_events: list[Dict[str, Any]] = [
            {
                "event": "bundle_generation_started",
                "timestamp": generated_at_iso,
                "actor_user_id": actor_user_id or case.created_by,
                "case_id": case.id,
                "tenant_id": case.tenant_id,
            },
            {
                "event": "pdf_snapshot_captured",
                "timestamp": _utc_now_iso(),
                "pdf_file": pdf_name,
                "pdf_sha256": pdf_integrity_profile["sha256"],
            },
            {
                "event": "audit_log_snapshot_captured",
                "timestamp": _utc_now_iso(),
                "audit_entries_count": len(audit_payload),
                "audit_chain_root": audit_chain_root,
            },
            {
                "event": "signature_snapshot_captured",
                "timestamp": _utc_now_iso(),
                "document_signatures_count": len(signature_evidence),
            },
        ]
        custody_events, custody_chain_root = _build_hash_chain(custody_base_events, seed=f"{bundle_id}:custody")

        case_summary_text = json.dumps(case_summary, ensure_ascii=False, indent=2)
        audit_logs_text = json.dumps(
            {
                "chain_algorithm": "sha256",
                "seed": f"{bundle_id}:audit",
                "chain_root": audit_chain_root,
                "entries": audit_payload,
            },
            ensure_ascii=False,
            indent=2,
        )

        signatures_text = json.dumps(
            {
                "snapshot_at": _utc_now_iso(),
                "documents": signature_evidence,
            },
            ensure_ascii=False,
            indent=2,
        )

        chain_of_custody_text = json.dumps(
            {
                "chain_algorithm": "sha256",
                "seed": f"{bundle_id}:custody",
                "chain_root": custody_chain_root,
                "events": custody_events,
            },
            ensure_ascii=False,
            indent=2,
        )

        timestamp_assertions = [
            {
                "assertion": "bundle_generation_time",
                "timestamp_utc": generated_at_iso,
                "unix_epoch_ms": int(generated_at.timestamp() * 1000),
                "source": "system_utc_clock",
            },
            {
                "assertion": "pdf_hash_timestamped",
                "timestamp_utc": _utc_now_iso(),
                "sha256": pdf_integrity_profile["sha256"],
            },
            {
                "assertion": "audit_chain_timestamped",
                "timestamp_utc": _utc_now_iso(),
                "chain_root": audit_chain_root,
            },
            {
                "assertion": "custody_chain_timestamped",
                "timestamp_utc": _utc_now_iso(),
                "chain_root": custody_chain_root,
            },
        ]
        timestamps_text = json.dumps(
            {
                "profile": "phase2-evidence-timestamp-v1",
                "timestamp_mode": "utc_internal",
                "assertions": timestamp_assertions,
            },
            ensure_ascii=False,
            indent=2,
        )

        court_admissible_index_text = json.dumps(
            {
                "schema": "wathiqcare.evidence_bundle.court_admissible.v1",
                "bundle_id": bundle_id,
                "case_id": case.id,
                "tenant_id": case.tenant_id,
                "created_at": generated_at_iso,
                "validation_profile": {
                    "pdf_structure_strength": "high" if pdf_integrity_profile["structure_checks"]["has_valid_pdf_header"] else "warning",
                    "timestamping": "internal_utc_assertions",
                    "audit_trail": "hash_chained",
                    "digital_signatures": "snapshot_captured",
                    "chain_of_custody": "hash_chained",
                },
                "legal_readiness_label": "tamper_evident_internal_package_not_external_legal_grade",
                "evidence_sections": [
                    "case_summary.json",
                    "audit_logs.json",
                    "signatures.json",
                    "chain_of_custody.json",
                    "timestamps.json",
                    "evidence_cover_sheet.json",
                    "signing_metadata.json",
                    "manifest.json",
                    "manifest.sig",
                    "timestamp.tsr",
                    pdf_name,
                ],
            },
            ensure_ascii=False,
            indent=2,
        )

        case_summary_file = bundle_folder / "case_summary.json"
        audit_logs_file = bundle_folder / "audit_logs.json"
        signatures_file = bundle_folder / "signatures.json"
        chain_of_custody_file = bundle_folder / "chain_of_custody.json"
        timestamps_file = bundle_folder / "timestamps.json"
        court_admissible_index_file = bundle_folder / "court_admissible_index.json"
        manifest_file = bundle_folder / "manifest.json"
        cover_page_file = bundle_folder / "00_evidence_cover_certificate.pdf"
        evidence_cover_sheet_file = bundle_folder / "evidence_cover_sheet.json"
        signing_metadata_file = bundle_folder / "signing_metadata.json"
        manifest_signature_file = bundle_folder / "manifest.sig"
        tsa_token_file = bundle_folder / "timestamp.tsr"

        case_summary_file.write_text(case_summary_text, encoding="utf-8")
        audit_logs_file.write_text(audit_logs_text, encoding="utf-8")
        signatures_file.write_text(signatures_text, encoding="utf-8")
        chain_of_custody_file.write_text(chain_of_custody_text, encoding="utf-8")
        timestamps_file.write_text(timestamps_text, encoding="utf-8")
        court_admissible_index_file.write_text(court_admissible_index_text, encoding="utf-8")

        non_cover_file_digests = [
            {
                "name": pdf_name,
                "sha256": _sha256_file(copied_pdf),
                "size_bytes": copied_pdf.stat().st_size,
            },
            {
                "name": "case_summary.json",
                "sha256": _sha256_file(case_summary_file),
                "size_bytes": case_summary_file.stat().st_size,
            },
            {
                "name": "audit_logs.json",
                "sha256": _sha256_file(audit_logs_file),
                "size_bytes": audit_logs_file.stat().st_size,
            },
            {
                "name": "signatures.json",
                "sha256": _sha256_file(signatures_file),
                "size_bytes": signatures_file.stat().st_size,
            },
            {
                "name": "chain_of_custody.json",
                "sha256": _sha256_file(chain_of_custody_file),
                "size_bytes": chain_of_custody_file.stat().st_size,
            },
            {
                "name": "timestamps.json",
                "sha256": _sha256_file(timestamps_file),
                "size_bytes": timestamps_file.stat().st_size,
            },
            {
                "name": "court_admissible_index.json",
                "sha256": _sha256_file(court_admissible_index_file),
                "size_bytes": court_admissible_index_file.stat().st_size,
            },
        ]

        provisional_bundle_root_hash = _sha256_bytes(
            "|".join(
                f"{item['name']}:{item['sha256']}" for item in sorted(non_cover_file_digests, key=lambda item: item["name"])
            ).encode("utf-8")
        )

        timestamp_service = RFC3161TimestampService()
        tsa_result = timestamp_service.issue_timestamp(payload_hash=provisional_bundle_root_hash)
        if tsa_result.token_bytes:
            tsa_token_file.write_bytes(tsa_result.token_bytes)
            logger.info("tsa_token_created bundle_id=%s mode=%s", bundle_id, tsa_result.mode)
        else:
            logger.info("tsa_token_not_created bundle_id=%s status=%s", bundle_id, tsa_result.status)

        cover_signature_status = "enabled" if os.getenv("WATHIQ_MANIFEST_SIGNING_ENABLED", "false").strip().lower() in {"1", "true", "yes", "on"} else "not_configured"
        cover_tsa_status = "enabled" if tsa_result.status == "enabled" else ("unavailable" if tsa_result.status == "unavailable" else "not_configured")

        case_date_value = case.created_at.isoformat() if case.created_at else generated_at_iso
        cover_context = {
            "case_id": case.id,
            "patient_reference": _mask_patient_reference(patient.mrn if patient else None),
            "case_date": case_date_value,
            "generated_at": generated_at_iso,
            "root_hash": provisional_bundle_root_hash,
            "tsa_status": cover_tsa_status,
            "signature_status": cover_signature_status,
            "institution_name": "International Medical Center (IMC)",
            "system_name": "WathiqCare",
        }
        cover_page_file.write_bytes(generate_cover_page_pdf(cover_context))

        file_digests = [
            {
                "name": "00_evidence_cover_certificate.pdf",
                "sha256": _sha256_file(cover_page_file),
                "size_bytes": cover_page_file.stat().st_size,
            },
            *non_cover_file_digests,
        ]

        bundle_root_hash = _sha256_bytes(
            "|".join(
                f"{item['name']}:{item['sha256']}" for item in sorted(file_digests, key=lambda item: item["name"])
            ).encode("utf-8")
        )

        pdf_profiles = [pdf_integrity_profile]

        manifest = {
            "schema": "wathiqcare.evidence_bundle.manifest.v2",
            "bundle_id": bundle_id,
            "generated_at": generated_at_iso,
            "discharge_case_id": case.id,
            "bundle_root_hash": bundle_root_hash,
            "integrity": {
                "algorithm": "sha256",
                "audit_chain_root": audit_chain_root,
                "custody_chain_root": custody_chain_root,
                "pdf_integrity": pdf_integrity_profile,
                "pdf_profiles": pdf_profiles,
            },
            "external_trust": {
                "timestamp_authority": tsa_result.to_manifest_metadata(),
            },
            "legal_metadata": {
                "jurisdiction": "Kingdom of Saudi Arabia",
                "applicable_laws": [
                    "Saudi Evidence Law",
                    "Electronic Transactions Law",
                    "Personal Data Protection Law (PDPL)",
                ],
                "system_type": "Tamper-evident clinical-legal documentation system",
                "admissibility_level": "Internal integrity ensured; external verification pending",
            },
            "files": file_digests,
        }

        manifest_text = json.dumps(manifest, ensure_ascii=False, indent=2)
        manifest_file.write_text(manifest_text, encoding="utf-8")

        manifest_sha256 = _sha256_bytes(manifest_text.encode("utf-8"))
        signing_service = DetachedManifestSignatureService()
        signature_result = signing_service.sign_manifest(manifest_text.encode("utf-8"))

        if signature_result.signature_bytes:
            manifest_signature_file.write_bytes(signature_result.signature_bytes)
            logger.info("manifest_signed bundle_id=%s", bundle_id)
        else:
            logger.info("manifest_not_signed bundle_id=%s status=%s", bundle_id, signature_result.status)

        signing_metadata = signature_result.to_metadata(manifest_sha256=manifest_sha256)
        signing_metadata["version"] = "phase3-signing-foundation-v1"
        signing_metadata_text = json.dumps(signing_metadata, ensure_ascii=False, indent=2)
        signing_metadata_file.write_text(signing_metadata_text, encoding="utf-8")

        evidence_cover_sheet = {
            "schema": "wathiqcare.evidence_bundle.cover_sheet.v1",
            "case_id": case.id,
            "generated_at": generated_at_iso,
            "bundle_id": bundle_id,
            "bundle_root_hash": bundle_root_hash,
            "manifest_hash": manifest_sha256,
            "included_files_count": len(file_digests),
            "signer_status": signing_metadata.get("status"),
            "timestamp_status": tsa_result.status,
            "chain_of_custody_statement": "Bundle includes hash-chained custody entries generated in UTC. External legal-grade verification is not yet active.",
        }
        evidence_cover_sheet_text = json.dumps(evidence_cover_sheet, ensure_ascii=False, indent=2)
        evidence_cover_sheet_file.write_text(evidence_cover_sheet_text, encoding="utf-8")

        zip_name = f"{bundle_id}.zip"
        zip_path = BUNDLE_DIR / zip_name

        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.write(cover_page_file, arcname="00_evidence_cover_certificate.pdf")
            zf.write(copied_pdf, arcname=pdf_name)
            zf.write(case_summary_file, arcname="case_summary.json")
            zf.write(audit_logs_file, arcname="audit_logs.json")
            zf.write(signatures_file, arcname="signatures.json")
            zf.write(chain_of_custody_file, arcname="chain_of_custody.json")
            zf.write(timestamps_file, arcname="timestamps.json")
            zf.write(court_admissible_index_file, arcname="court_admissible_index.json")
            zf.write(evidence_cover_sheet_file, arcname="evidence_cover_sheet.json")
            zf.write(signing_metadata_file, arcname="signing_metadata.json")
            zf.write(manifest_file, arcname="manifest.json")
            if manifest_signature_file.exists():
                zf.write(manifest_signature_file, arcname="manifest.sig")
            if tsa_token_file.exists():
                zf.write(tsa_token_file, arcname="timestamp.tsr")
        archived_at = _utc_now_iso()
        archived_document_ids: list[str] = []
        if workflow:
            for document in workflow.documents:
                signature_payload = _load_json(_signature_metadata_path(document.id))
                signature_payload.update(
                    {
                        "archivedStatus": True,
                        "archivedAt": archived_at,
                        "archivedBy": actor_user_id or case.created_by,
                        "archiveBundleId": bundle_id,
                        "archiveBundleRootHash": bundle_root_hash,
                        "archiveCustodyChainRoot": custody_chain_root,
                    }
                )
                _write_json(_signature_metadata_path(document.id), signature_payload)
                archived_document_ids.append(document.id)

        archive_user_id = actor_user_id or case.created_by
        if archive_user_id:
            db.add(
                AuditLog(
                    tenant_id=case.tenant_id,
                    user_id=archive_user_id,
                    entity_type="discharge_case",
                    entity_id=case.id,
                    action="archive_case_documents",
                    details=(
                        f"Evidence bundle {bundle_id} generated and archived documents for case {case.id}: "
                        f"{', '.join(archived_document_ids) if archived_document_ids else 'no workflow documents'}"
                    ),
                    created_at=datetime.now(timezone.utc).replace(tzinfo=None),
                )
            )
        db.commit()

        return {
            "message": "Evidence bundle generated successfully",
            "bundle_id": bundle_id,
            "bundle_file": zip_name,
            "bundle_path": str(zip_path),
        }

    finally:
        db.close()
