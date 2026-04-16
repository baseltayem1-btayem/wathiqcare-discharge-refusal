from __future__ import annotations

import hashlib
import json
import zipfile
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import backend.models  # noqa: F401
from backend.core.database import Base
from backend.core.discharge_query_service import list_audit_logs_for_case
from backend.core.discharge_workflow_service import get_workflow_snapshot, run_workflow_action
from backend.core.forms_engine_service import FormsEngineService
from backend.forms.medical_legal_forms_library import CANONICAL_TEMPLATE_SOURCE
from backend.legal.evidence_bundle import generate_evidence_bundle
from backend.legal.evidence_bundle_verifier import verify_evidence_bundle
from backend.models.discharge_case import DischargeCase
from backend.models.patient import Patient
from backend.models.tenant import Tenant
from backend.models.user import User


@pytest.fixture()
def workflow_env(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    db_path = tmp_path / "phase2.sqlite3"
    engine = create_engine(f"sqlite:///{db_path}")
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    case_docs_dir = tmp_path / "case_documents"
    signature_dir = tmp_path / "document_signature"
    otp_dir = tmp_path / "document_otp"
    bundle_dir = tmp_path / "bundles"
    pdf_dir = tmp_path / "legacy_pdf"

    for path in (case_docs_dir, signature_dir, otp_dir, bundle_dir, pdf_dir):
        path.mkdir(parents=True, exist_ok=True)

    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("WATHIQ_SMS_STUB_MODE", "true")
    # Expose debug OTP codes in test environment so the test can read the code
    # that was just dispatched and pass it back to verify_document_otp.
    monkeypatch.setattr("backend.core.forms_engine_service.EXPOSE_DEBUG_OTP", True)

    monkeypatch.setattr("backend.core.discharge_workflow_service.SessionLocal", session_local)
    monkeypatch.setattr("backend.core.discharge_workflow_service.GENERATED_DOCS_DIR", case_docs_dir)
    monkeypatch.setattr("backend.core.discharge_workflow_service.SIGNATURE_METADATA_DIR", signature_dir)
    monkeypatch.setattr("backend.core.discharge_workflow_service.OTP_METADATA_DIR", otp_dir)

    monkeypatch.setattr("backend.core.discharge_query_service.SessionLocal", session_local)

    monkeypatch.setattr("backend.core.forms_engine_service.SessionLocal", session_local)
    monkeypatch.setattr("backend.core.forms_engine_service.SIGNATURE_DIR", signature_dir)
    monkeypatch.setattr("backend.core.forms_engine_service.OTP_DIR", otp_dir)

    monkeypatch.setattr("backend.legal.evidence_bundle.SessionLocal", session_local)
    monkeypatch.setattr("backend.legal.evidence_bundle.BUNDLE_DIR", bundle_dir)
    monkeypatch.setattr("backend.legal.evidence_bundle.PDF_DIR", pdf_dir)
    monkeypatch.setattr("backend.legal.evidence_bundle.SIGNATURE_DIR", signature_dir)

    tenant_id = "tenant-1"
    user_id = "user-1"
    user_email = "doctor@test.local"

    db = session_local()
    tenant = Tenant(id=tenant_id, name="Test Tenant", code="TEST", is_active=True)
    user = User(
        id=user_id,
        tenant_id=tenant.id,
        email=user_email,
        full_name="Dr. Test",
        role="doctor",
        is_active=True,
    )
    patient = Patient(id="patient-1", tenant_id=tenant.id, mrn="MRN-1001", full_name="Patient One")
    discharge_case = DischargeCase(
        id="case-1",
        tenant_id=tenant.id,
        patient_id=patient.id,
        created_by=user.id,
        status="CASE_CREATED",
        refusal_reason="Patient requested additional stay.",
        signer_name="Patient One",
        signer_role="patient",
        signature_text="signed",
    )
    db.add_all([tenant, user, patient, discharge_case])
    db.commit()
    db.close()

    legacy_pdf = pdf_dir / "legacy_case_document.pdf"
    legacy_pdf.write_bytes(b"legacy-pdf")

    db = session_local()
    discharge_case = db.query(DischargeCase).filter(DischargeCase.id == "case-1").first()
    assert discharge_case is not None
    discharge_case.pdf_file = legacy_pdf.name
    db.commit()
    db.close()

    return {
        "session_local": session_local,
        "tenant_id": tenant_id,
        "case_id": "case-1",
        "user": {"id": user_id, "email": user_email, "tenant_id": tenant_id},
    }


def _decision_payload() -> dict[str, str]:
    return {
        "patient_name": "Patient One",
        "patient_id_number": "1234567890",
        "medical_record_number": "MRN-1001",
        "room_number": "301A",
        "attending_physician": "Dr. Test",
        "discharge_decision_at": "2026-03-11T10:00:00",
        "discussion_summary": "Explained readiness for discharge.",
        "refusal_reason": "Patient requested additional stay.",
        "social_administrative_interventions": "Counseling and social services.",
    }


def _run_core_flow(env: dict[str, object]) -> None:
    tenant_id = str(env["tenant_id"])
    case_id = str(env["case_id"])
    current_user = env["user"]
    payload = _decision_payload()

    run_workflow_action(
        tenant_id=tenant_id,
        case_id=case_id,
        action="record_discharge_decision",
        payload=payload,
        current_user=current_user,
    )
    run_workflow_action(
        tenant_id=tenant_id,
        case_id=case_id,
        action="start_refusal_workflow",
        payload=payload,
        current_user=current_user,
    )
    run_workflow_action(
        tenant_id=tenant_id,
        case_id=case_id,
        action="mark_patient_counseled",
        payload=payload,
        current_user=current_user,
    )
    run_workflow_action(
        tenant_id=tenant_id,
        case_id=case_id,
        action="refer_social_services",
        payload=payload,
        current_user=current_user,
    )


def test_case_lifecycle_prevents_invalid_jump_and_persists_status(workflow_env: dict[str, object]):
    with pytest.raises(ValueError, match="Document initial communication|Start refusal workflow before this action"):
        run_workflow_action(
            tenant_id=str(workflow_env["tenant_id"]),
            case_id=str(workflow_env["case_id"]),
            action="refer_social_services",
            payload=_decision_payload(),
            current_user=workflow_env["user"],
        )

    _run_core_flow(workflow_env)

    snapshot = get_workflow_snapshot(
        tenant_id=str(workflow_env["tenant_id"]),
        case_id=str(workflow_env["case_id"]),
    )

    assert snapshot["current_stage"] == "refusal_form"
    assert snapshot["lifecycle_status"] == "SOCIAL_SERVICE_REFERRED"

    db = workflow_env["session_local"]()
    discharge_case = db.query(DischargeCase).filter(DischargeCase.id == str(workflow_env["case_id"])).first()
    assert discharge_case is not None
    assert discharge_case.status == "SOCIAL_SERVICE_REFERRED"
    db.close()


def test_document_lifecycle_and_audit_metadata_are_hardened(workflow_env: dict[str, object]):
    _run_core_flow(workflow_env)

    service = FormsEngineService()
    document = service.generate_form(
        tenant_id=str(workflow_env["tenant_id"]),
        case_id=str(workflow_env["case_id"]),
        form_type="discharge_refusal_form",
        payload={
            **_decision_payload(),
            "witness1_name": "Witness One",
            "witness2_name": "Witness Two",
        },
        current_user=workflow_env["user"],
    )["document"]

    assert document["templateVersion"] == "1.0"
    assert document["templateSource"] == CANONICAL_TEMPLATE_SOURCE
    assert document["generationStatus"] == "generated"

    signed = service.sign_document(
        tenant_id=str(workflow_env["tenant_id"]),
        document_id=str(document["id"]),
        payload={"signerName": "Patient One", "signature": "captured"},
        current_user=workflow_env["user"],
    )
    assert signed["generationStatus"] == "signed"
    assert signed["signedStatus"] is True

    financial = service.generate_form(
        tenant_id=str(workflow_env["tenant_id"]),
        case_id=str(workflow_env["case_id"]),
        form_type="financial_responsibility_notice",
        payload=_decision_payload(),
        current_user=workflow_env["user"],
    )["document"]
    sent = service.send_document_otp(
        tenant_id=str(workflow_env["tenant_id"]),
        document_id=str(financial["id"]),
        payload={"phoneNumber": "+966500000000"},
        current_user=workflow_env["user"],
    )
    verified = service.verify_document_otp(
        tenant_id=str(workflow_env["tenant_id"]),
        document_id=str(financial["id"]),
        payload={"otpCode": sent["otpDebugCode"]},
        current_user=workflow_env["user"],
    )
    assert verified["verified"] is True

    bundle = generate_evidence_bundle(str(workflow_env["case_id"]), actor_user_id="user-1")
    assert bundle["bundle_file"].endswith(".zip")

    bundle_path = Path(bundle["bundle_path"])
    assert bundle_path.exists()
    with zipfile.ZipFile(bundle_path, "r") as archive:
        members = set(archive.namelist())
        assert "case_summary.json" in members
        assert "audit_logs.json" in members
        assert "signatures.json" in members
        assert "chain_of_custody.json" in members
        assert "timestamps.json" in members
        assert "court_admissible_index.json" in members
        assert "manifest.json" in members

        manifest = json.loads(archive.read("manifest.json").decode("utf-8"))
        assert manifest["schema"] == "wathiqcare.evidence_bundle.manifest.v2"
        assert manifest["bundle_root_hash"]
        assert manifest["integrity"]["audit_chain_root"]
        assert manifest["integrity"]["custody_chain_root"]

    docs = service.list_case_documents(
        tenant_id=str(workflow_env["tenant_id"]),
        case_id=str(workflow_env["case_id"]),
    )["documents"]
    assert any(item["archivedStatus"] is True for item in docs)

    snapshot = get_workflow_snapshot(
        tenant_id=str(workflow_env["tenant_id"]),
        case_id=str(workflow_env["case_id"]),
    )
    assert snapshot["lifecycle_status"] in {"ARCHIVED", "SIGNED_OR_VERIFIED"}

    logs = list_audit_logs_for_case(str(workflow_env["tenant_id"]), str(workflow_env["case_id"]))
    assert logs is not None
    actions = {item["action"] for item in logs}
    assert "generate_refusal_form" in actions
    assert "generate_financial_notice" in actions
    assert "document_signed" in actions
    assert "document_otp_sent" in actions
    assert "document_otp_verified" in actions
    assert "archive_case_documents" in actions


def _rewrite_bundle_entries(source_zip: Path, target_zip: Path, replacements: dict[str, bytes], removals: set[str] | None = None) -> None:
    removals = removals or set()
    with zipfile.ZipFile(source_zip, "r") as source:
        with zipfile.ZipFile(target_zip, "w", zipfile.ZIP_DEFLATED) as target:
            for member in source.infolist():
                if member.filename in removals:
                    continue
                payload = replacements.get(member.filename)
                if payload is None:
                    payload = source.read(member.filename)
                target.writestr(member.filename, payload)


def _generate_bundle_for_verification(workflow_env: dict[str, object]) -> Path:
    _run_core_flow(workflow_env)
    service = FormsEngineService()
    service.generate_form(
        tenant_id=str(workflow_env["tenant_id"]),
        case_id=str(workflow_env["case_id"]),
        form_type="discharge_refusal_form",
        payload={
            **_decision_payload(),
            "witness1_name": "Witness One",
            "witness2_name": "Witness Two",
        },
        current_user=workflow_env["user"],
    )
    bundle = generate_evidence_bundle(str(workflow_env["case_id"]), actor_user_id="user-1")
    return Path(bundle["bundle_path"])


def test_bundle_verifier_success(workflow_env: dict[str, object]):
    bundle_path = _generate_bundle_for_verification(workflow_env)
    result = verify_evidence_bundle(bundle_path)
    assert result["valid"] is True, result
    assert result["cover_page_valid"] is True
    assert result["errors"] == []
    assert result["computed_root_hash"] == result["manifest_root_hash"]


def test_cover_page_exists(workflow_env: dict[str, object]):
    bundle_path = _generate_bundle_for_verification(workflow_env)
    with zipfile.ZipFile(bundle_path, "r") as archive:
        members = set(archive.namelist())
        assert "00_evidence_cover_certificate.pdf" in members


def test_cover_page_in_manifest(workflow_env: dict[str, object]):
    bundle_path = _generate_bundle_for_verification(workflow_env)
    with zipfile.ZipFile(bundle_path, "r") as archive:
        manifest = json.loads(archive.read("manifest.json").decode("utf-8"))
        entries = {item["name"]: item for item in manifest["files"]}
        assert "00_evidence_cover_certificate.pdf" in entries
        cover_hash_actual = hashlib.sha256(archive.read("00_evidence_cover_certificate.pdf")).hexdigest()
        assert entries["00_evidence_cover_certificate.pdf"]["sha256"] == cover_hash_actual


def test_cover_page_verification(workflow_env: dict[str, object]):
    bundle_path = _generate_bundle_for_verification(workflow_env)
    result = verify_evidence_bundle(bundle_path)
    assert result["cover_page_valid"] is True


def test_cover_page_tamper_detection(workflow_env: dict[str, object], tmp_path: Path):
    bundle_path = _generate_bundle_for_verification(workflow_env)
    tampered_bundle = tmp_path / "cover-tampered.zip"

    with zipfile.ZipFile(bundle_path, "r") as archive:
        cover_pdf = archive.read("00_evidence_cover_certificate.pdf")

    tampered_cover = cover_pdf + b"\n%tampered\n"
    _rewrite_bundle_entries(bundle_path, tampered_bundle, {"00_evidence_cover_certificate.pdf": tampered_cover})

    result = verify_evidence_bundle(tampered_bundle)
    assert result["valid"] is False
    assert result["cover_page_valid"] is False
    assert any("00_evidence_cover_certificate.pdf" in error for error in result["errors"])


def test_bundle_verifier_detects_tampered_file(workflow_env: dict[str, object], tmp_path: Path):
    bundle_path = _generate_bundle_for_verification(workflow_env)
    tampered_bundle = tmp_path / "tampered.zip"

    with zipfile.ZipFile(bundle_path, "r") as archive:
        payload = archive.read("case_summary.json")
    tampered_payload = payload + b"\n{\"tampered\":true}\n"

    _rewrite_bundle_entries(bundle_path, tampered_bundle, {"case_summary.json": tampered_payload})
    result = verify_evidence_bundle(tampered_bundle)
    assert result["valid"] is False
    assert any("Hash mismatch for case_summary.json" in error for error in result["errors"])


def test_bundle_verifier_detects_missing_required_file(workflow_env: dict[str, object], tmp_path: Path):
    bundle_path = _generate_bundle_for_verification(workflow_env)
    missing_file_bundle = tmp_path / "missing-file.zip"

    _rewrite_bundle_entries(bundle_path, missing_file_bundle, {}, removals={"signatures.json"})
    result = verify_evidence_bundle(missing_file_bundle)
    assert result["valid"] is False
    assert any("Missing required files" in error for error in result["errors"])


def test_bundle_verifier_detects_broken_custody_chain(workflow_env: dict[str, object], tmp_path: Path):
    bundle_path = _generate_bundle_for_verification(workflow_env)
    broken_chain_bundle = tmp_path / "broken-chain.zip"

    with zipfile.ZipFile(bundle_path, "r") as archive:
        custody = json.loads(archive.read("chain_of_custody.json").decode("utf-8"))
        manifest = json.loads(archive.read("manifest.json").decode("utf-8"))

    assert custody["events"]
    custody["events"][0]["previous_hash"] = "00" * 32
    custody_bytes = json.dumps(custody, ensure_ascii=False, indent=2).encode("utf-8")
    custody_sha = hashlib.sha256(custody_bytes).hexdigest()

    for item in manifest["files"]:
        if item["name"] == "chain_of_custody.json":
            item["sha256"] = custody_sha
            item["size_bytes"] = len(custody_bytes)

    manifest["bundle_root_hash"] = hashlib.sha256(
        "|".join(
            f"{item['name']}:{item['sha256']}" for item in sorted(manifest["files"], key=lambda value: value["name"])
        ).encode("utf-8")
    ).hexdigest()
    manifest_bytes = json.dumps(manifest, ensure_ascii=False, indent=2).encode("utf-8")

    _rewrite_bundle_entries(
        bundle_path,
        broken_chain_bundle,
        {
            "chain_of_custody.json": custody_bytes,
            "manifest.json": manifest_bytes,
        },
    )

    result = verify_evidence_bundle(broken_chain_bundle)
    assert result["valid"] is False
    assert any("Chain of custody invalid" in error for error in result["errors"])


def test_bundle_verifier_detects_malformed_timestamp(workflow_env: dict[str, object], tmp_path: Path):
    bundle_path = _generate_bundle_for_verification(workflow_env)
    malformed_timestamp_bundle = tmp_path / "malformed-timestamp.zip"

    with zipfile.ZipFile(bundle_path, "r") as archive:
        timestamps = json.loads(archive.read("timestamps.json").decode("utf-8"))
        manifest = json.loads(archive.read("manifest.json").decode("utf-8"))

    timestamps["assertions"][0]["timestamp_utc"] = "not-a-valid-time"
    timestamps_bytes = json.dumps(timestamps, ensure_ascii=False, indent=2).encode("utf-8")
    timestamps_sha = hashlib.sha256(timestamps_bytes).hexdigest()

    for item in manifest["files"]:
        if item["name"] == "timestamps.json":
            item["sha256"] = timestamps_sha
            item["size_bytes"] = len(timestamps_bytes)

    manifest["bundle_root_hash"] = hashlib.sha256(
        "|".join(
            f"{item['name']}:{item['sha256']}" for item in sorted(manifest["files"], key=lambda value: value["name"])
        ).encode("utf-8")
    ).hexdigest()
    manifest_bytes = json.dumps(manifest, ensure_ascii=False, indent=2).encode("utf-8")

    _rewrite_bundle_entries(
        bundle_path,
        malformed_timestamp_bundle,
        {
            "timestamps.json": timestamps_bytes,
            "manifest.json": manifest_bytes,
        },
    )

    result = verify_evidence_bundle(malformed_timestamp_bundle)
    assert result["valid"] is False
    assert any("invalid UTC ISO-8601 timestamp" in error for error in result["errors"])


def test_bundle_verifier_detects_invalid_pdf_profile(workflow_env: dict[str, object], tmp_path: Path):
    bundle_path = _generate_bundle_for_verification(workflow_env)
    invalid_pdf_profile_bundle = tmp_path / "invalid-pdf-profile.zip"

    with zipfile.ZipFile(bundle_path, "r") as archive:
        manifest = json.loads(archive.read("manifest.json").decode("utf-8"))

    manifest["integrity"]["pdf_profiles"][0]["structure_checks"]["has_valid_pdf_header"] = "true"
    manifest_bytes = json.dumps(manifest, ensure_ascii=False, indent=2).encode("utf-8")

    _rewrite_bundle_entries(
        bundle_path,
        invalid_pdf_profile_bundle,
        {
            "manifest.json": manifest_bytes,
        },
    )

    result = verify_evidence_bundle(invalid_pdf_profile_bundle)
    assert result["valid"] is False
    assert any("Invalid PDF profile field has_valid_pdf_header" in error for error in result["errors"])