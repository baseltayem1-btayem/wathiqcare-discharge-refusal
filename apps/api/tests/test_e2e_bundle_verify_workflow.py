from __future__ import annotations

import hashlib
import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.api.deps import get_current_user
from backend.api.routers.discharge import router


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def _chain_entries(seed: str, base_entries: list[dict]) -> tuple[list[dict], str]:
    previous_hash = _sha256_bytes(seed.encode("utf-8"))
    chained: list[dict] = []

    for index, raw in enumerate(base_entries, start=1):
        item = dict(raw)
        item["sequence"] = index

        canonical = json.dumps(item, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
        entry_hash = _sha256_bytes(previous_hash.encode("utf-8") + canonical)

        item["previous_hash"] = previous_hash
        item["entry_hash"] = entry_hash
        chained.append(item)
        previous_hash = entry_hash

    return chained, previous_hash


def _build_valid_bundle(bundle_path: Path, tenant_id: str) -> None:
    now = _iso_now()
    case_pdf_name = "discharge_case.pdf"
    case_pdf_bytes = b"%PDF-1.4\n1 0 obj\n<< /Type /Page >>\nendobj\nxref\n0 1\n0000000000 65535 f\ntrailer\n<<>>\nstartxref\n0\n%%EOF"
    cover_pdf_bytes = b"%PDF-1.4\ncover-page\n/Type /Page\nxref\n%%EOF"

    case_summary = {
        "bundle_id": "evidence_bundle_case-e2e-1",
        "generated_at": now,
        "tenant": {"id": tenant_id},
    }

    audit_seed = "evidence_bundle_case-e2e-1:audit"
    audit_entries, audit_root = _chain_entries(
        audit_seed,
        [
            {
                "id": "audit-1",
                "action": "bundle_generated",
                "details": "bundle generation completed",
                "created_at": now,
            }
        ],
    )
    audit_logs = {
        "chain_algorithm": "sha256",
        "seed": audit_seed,
        "chain_root": audit_root,
        "entries": audit_entries,
    }

    custody_seed = "evidence_bundle_case-e2e-1:custody"
    custody_events, custody_root = _chain_entries(
        custody_seed,
        [
            {
                "event": "bundle_generation_started",
                "timestamp": now,
                "actor_user_id": "user-e2e",
                "case_id": "case-e2e-1",
                "tenant_id": tenant_id,
            }
        ],
    )
    custody = {
        "chain_algorithm": "sha256",
        "seed": custody_seed,
        "chain_root": custody_root,
        "events": custody_events,
    }

    timestamps = {
        "profile": "phase2-evidence-timestamp-v1",
        "timestamp_mode": "utc_internal",
        "assertions": [
            {
                "assertion": "bundle_generation_time",
                "timestamp_utc": now,
            }
        ],
    }

    signatures = {
        "snapshot_at": now,
        "documents": [],
    }

    court_index = {
        "schema": "wathiqcare.evidence_bundle.court_admissible.v1",
        "bundle_id": "evidence_bundle_case-e2e-1",
        "case_id": "case-e2e-1",
        "tenant_id": tenant_id,
        "created_at": now,
    }

    evidence_cover_sheet = {
        "schema": "wathiqcare.evidence_bundle.cover_sheet.v1",
        "case_id": "case-e2e-1",
        "generated_at": now,
    }

    signing_metadata = {
        "schema": "wathiqcare.evidence_bundle.signing.v1",
        "status": "fallback_internal",
        "enabled": False,
        "configured": False,
        "algorithm": "sha256",
        "manifest_sha256": "",
        "signature_file": "manifest.sig",
        "signature_present": True,
    }

    timestamp_token = {
        "schema": "wathiqcare.evidence_bundle.timestamp_token.v1",
        "mode": "internal",
        "generated_at": now,
        "hash_algorithm": "sha256",
        "payload_hash": "seed",
    }

    staging: dict[str, bytes] = {
        "00_evidence_cover_certificate.pdf": cover_pdf_bytes,
        case_pdf_name: case_pdf_bytes,
        "case_summary.json": json.dumps(case_summary, ensure_ascii=False, indent=2).encode("utf-8"),
        "audit_logs.json": json.dumps(audit_logs, ensure_ascii=False, indent=2).encode("utf-8"),
        "signatures.json": json.dumps(signatures, ensure_ascii=False, indent=2).encode("utf-8"),
        "chain_of_custody.json": json.dumps(custody, ensure_ascii=False, indent=2).encode("utf-8"),
        "timestamps.json": json.dumps(timestamps, ensure_ascii=False, indent=2).encode("utf-8"),
        "court_admissible_index.json": json.dumps(court_index, ensure_ascii=False, indent=2).encode("utf-8"),
        "evidence_cover_sheet.json": json.dumps(evidence_cover_sheet, ensure_ascii=False, indent=2).encode("utf-8"),
        "signing_metadata.json": json.dumps(signing_metadata, ensure_ascii=False, indent=2).encode("utf-8"),
        "manifest.sig": b'{"schema":"fallback","signature":"ok"}',
        "timestamp.tsr": json.dumps(timestamp_token, ensure_ascii=True, sort_keys=True).encode("utf-8"),
    }

    file_digests = []
    for name, payload in staging.items():
        if name in {"manifest.sig", "timestamp.tsr"}:
            continue
        file_digests.append(
            {
                "name": name,
                "sha256": _sha256_bytes(payload),
                "size_bytes": len(payload),
            }
        )

    bundle_root_hash = _sha256_bytes(
        "|".join(f"{item['name']}:{item['sha256']}" for item in sorted(file_digests, key=lambda i: i["name"])).encode("utf-8")
    )

    manifest = {
        "schema": "wathiqcare.evidence_bundle.manifest.v2",
        "bundle_id": "evidence_bundle_case-e2e-1",
        "generated_at": now,
        "discharge_case_id": "case-e2e-1",
        "bundle_root_hash": bundle_root_hash,
        "integrity": {
            "algorithm": "sha256",
            "audit_chain_root": audit_root,
            "custody_chain_root": custody_root,
            "pdf_profiles": [
                {
                    "file_name": case_pdf_name,
                    "sha256": _sha256_bytes(case_pdf_bytes),
                    "structure_checks": {
                        "has_valid_pdf_header": True,
                        "has_eof_marker": True,
                        "has_cross_reference": True,
                    },
                }
            ],
        },
        "external_trust": {
            "timestamp_authority": {
                "status": "fallback_internal",
                "configured": False,
                "token_present": True,
                "timestamp_file": "timestamp.tsr",
            }
        },
        "files": file_digests,
    }

    manifest_bytes = json.dumps(manifest, ensure_ascii=False, indent=2).encode("utf-8")
    staging["manifest.json"] = manifest_bytes

    bundle_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(bundle_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, payload in staging.items():
            archive.writestr(name, payload)


def _client_for_user(user: dict) -> TestClient:
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_current_user] = lambda: user
    return TestClient(app)


def test_e2e_create_case_generate_bundle_and_verify(monkeypatch, tmp_path: Path):
    monkeypatch.chdir(tmp_path)

    monkeypatch.setattr("backend.api.routers.discharge.require_permission", lambda *_args, **_kwargs: None)
    monkeypatch.setattr("backend.api.routers.discharge.require_case_access", lambda *_args, **_kwargs: None)
    monkeypatch.setattr("backend.api.routers.discharge.require_any_permission", lambda *_args, **_kwargs: None)

    monkeypatch.setattr(
        "backend.api.routers.discharge.create_discharge_refusal",
        lambda **_kwargs: {"id": "case-e2e-1", "status": "created"},
    )

    def _fake_generate(discharge_case_id: str, tenant_id: str | None = None, actor_user_id: str | None = None):
        bundle_name = f"evidence_bundle_{discharge_case_id}.zip"
        bundle_path = tmp_path / "backend" / "generated" / "bundles" / bundle_name
        _build_valid_bundle(bundle_path, tenant_id or "tenant-e2e")
        return {
            "message": "Evidence bundle generated successfully",
            "bundle_id": f"evidence_bundle_{discharge_case_id}",
            "bundle_file": bundle_name,
            "bundle_path": str(bundle_path),
        }

    monkeypatch.setattr("backend.api.routers.discharge.generate_evidence_bundle", _fake_generate)

    user = {
        "id": "user-e2e",
        "tenant_id": "tenant-e2e",
        "tenant_code": "TENANT_E2E",
        "email": "legal@tenant.test",
        "role": "tenant_admin",
    }

    client = _client_for_user(user)

    create_response = client.post(
        "/api/discharge/refusal",
        json={
            "patient_mrn": "MRN-E2E-1",
            "patient_name": "E2E Patient",
            "refusal_reason": "Integration test",
            "signer_name": "Dr. E2E",
            "signer_role": "doctor",
            "signature_text": "Signed",
        },
    )
    assert create_response.status_code == 200
    case_id = create_response.json()["id"]

    bundle_response = client.post(f"/api/discharge/evidence-bundle/{case_id}")
    assert bundle_response.status_code == 200
    bundle_file = bundle_response.json()["bundle_file"]

    verify_response = client.get(f"/api/discharge/verify?bundleId={bundle_file}")
    assert verify_response.status_code == 200
    verification = verify_response.json()

    assert verification["success"] is True
    assert verification["valid"] is True
    assert verification["bundleId"] == bundle_file
