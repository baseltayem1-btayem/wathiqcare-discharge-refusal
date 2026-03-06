import json
import hashlib
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any


BUNDLE_DIR = Path("backend/generated/bundles")
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


def build_discharge_refusal_bundle(
    case_id: str,
    case_summary: Dict[str, Any],
    audit_logs: list[Dict[str, Any]] | None = None,
    pdf_path: str | None = None,
) -> Dict[str, Any]:
    """
    Creates a legal evidence bundle for a discharge refusal case.

    Bundle contents:
      - case_summary.json
      - audit_logs.json
      - refusal pdf (if available)
      - manifest.json
      - evidence_bundle_<case_id>.zip
    """

    bundle_id = f"evidence_bundle_{case_id}"
    bundle_path = BUNDLE_DIR / bundle_id
    bundle_path.mkdir(parents=True, exist_ok=True)

    generated_at = _utc_now_iso()

    artifacts = {
        "refusal_pdf": None,
        "case_summary_json": "case_summary.json",
        "audit_logs_json": "audit_logs.json",
        "manifest_json": "manifest.json",
    }

    if audit_logs is None:
        audit_logs = []

    payload: Dict[str, Any] = {
        "bundle_id": bundle_id,
        "generated_at": generated_at,
        "case_type": "DISCHARGE_REFUSAL",
        "case_summary": case_summary,
        "audit_logs_count": len(audit_logs),
        "artifacts": artifacts,
    }

    pdf_hash = None
    pdf_name = None

    if pdf_path:
        src = Path(pdf_path)
        if src.exists():
            pdf_name = src.name
            dst = bundle_path / pdf_name
            dst.write_bytes(src.read_bytes())
            artifacts["refusal_pdf"] = pdf_name
            pdf_hash = _sha256_file(dst)

    case_summary_file = bundle_path / "case_summary.json"
    case_summary_text = json.dumps(payload, ensure_ascii=False, indent=2)
    case_summary_file.write_text(case_summary_text, encoding="utf-8")

    audit_logs_file = bundle_path / "audit_logs.json"
    audit_logs_text = json.dumps(audit_logs, ensure_ascii=False, indent=2)
    audit_logs_file.write_text(audit_logs_text, encoding="utf-8")

    manifest = {
        "bundle_id": bundle_id,
        "bundle_path": str(bundle_path),
        "generated_at": generated_at,
        "case_id": case_id,
        "files": [
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

    if pdf_name and pdf_hash:
        manifest["files"].append({
            "name": pdf_name,
            "sha256": pdf_hash,
        })

    manifest_file = bundle_path / "manifest.json"
    manifest_text = json.dumps(manifest, ensure_ascii=False, indent=2)
    manifest_file.write_text(manifest_text, encoding="utf-8")

    zip_name = f"{bundle_id}.zip"
    zip_path = BUNDLE_DIR / zip_name

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.write(case_summary_file, arcname="case_summary.json")
        zf.write(audit_logs_file, arcname="audit_logs.json")
        zf.write(manifest_file, arcname="manifest.json")

        if pdf_name:
            zf.write(bundle_path / pdf_name, arcname=pdf_name)

    return {
        "bundle_id": bundle_id,
        "bundle_folder": str(bundle_path),
        "bundle_zip": str(zip_path),
        "generated_at": generated_at,
        "manifest": manifest,
    }
