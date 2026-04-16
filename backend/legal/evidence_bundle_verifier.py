import argparse
import hashlib
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import zipfile


logger = logging.getLogger(__name__)

REQUIRED_FILES = {
    "00_evidence_cover_certificate.pdf",
    "case_summary.json",
    "audit_logs.json",
    "signatures.json",
    "chain_of_custody.json",
    "timestamps.json",
    "court_admissible_index.json",
    "manifest.json",
}


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _read_json_from_zip(archive: zipfile.ZipFile, name: str) -> dict[str, Any]:
    return json.loads(archive.read(name).decode("utf-8"))


def _is_utc_iso8601(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    if not parsed.tzinfo:
        return False
    return parsed.astimezone(timezone.utc).utcoffset() == timezone.utc.utcoffset(parsed)


def _validate_hash_chain(entries: Any, seed: str, expected_chain_root: str) -> tuple[bool, str | None]:
    if not isinstance(entries, list):
        return False, "entries is not a list"

    previous_hash = _sha256_bytes(seed.encode("utf-8"))
    for index, item in enumerate(entries, start=1):
        if not isinstance(item, dict):
            return False, f"entry {index} is not an object"

        sequence = item.get("sequence")
        if sequence != index:
            return False, f"entry {index} has invalid sequence"

        prev = item.get("previous_hash")
        if prev != previous_hash:
            return False, f"entry {index} previous_hash mismatch"

        normalized = dict(item)
        entry_hash = normalized.pop("entry_hash", None)
        normalized.pop("previous_hash", None)
        if not isinstance(entry_hash, str):
            return False, f"entry {index} missing entry_hash"

        canonical = json.dumps(normalized, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
        computed = _sha256_bytes(previous_hash.encode("utf-8") + canonical)
        if computed != entry_hash:
            return False, f"entry {index} entry_hash mismatch"

        previous_hash = entry_hash

    if previous_hash != expected_chain_root:
        return False, "chain root mismatch"

    return True, None


def verify_evidence_bundle(bundle_zip_path: str | Path) -> dict[str, Any]:
    bundle_path = Path(bundle_zip_path)
    result: dict[str, Any] = {
        "valid": True,
        "errors": [],
        "warnings": [],
        "computed_root_hash": None,
        "manifest_root_hash": None,
        "cover_page_valid": False,
        "tsa": {
            "present": False,
            "configured": False,
            "status": "missing",
            "verification": "not_yet_verifiable",
        },
        "detached_signature": {
            "present": False,
            "configured": False,
            "status": "missing",
            "verification": "not_yet_verifiable",
        },
    }

    if not bundle_path.exists():
        result["valid"] = False
        result["errors"].append(f"Bundle file not found: {bundle_path}")
        return result

    try:
        with zipfile.ZipFile(bundle_path, "r") as archive:
            members = set(archive.namelist())

            missing = sorted(REQUIRED_FILES.difference(members))
            if missing:
                result["valid"] = False
                result["errors"].append(f"Missing required files: {', '.join(missing)}")
                return result

            manifest = _read_json_from_zip(archive, "manifest.json")
            manifest_files = manifest.get("files")
            if not isinstance(manifest_files, list):
                result["valid"] = False
                result["errors"].append("manifest.files is missing or invalid")
                return result

            expected_hashes: dict[str, str] = {}
            for item in manifest_files:
                if not isinstance(item, dict):
                    result["valid"] = False
                    result["errors"].append("manifest.files contains a non-object entry")
                    continue
                name = item.get("name")
                digest = item.get("sha256")
                if not isinstance(name, str) or not isinstance(digest, str):
                    result["valid"] = False
                    result["errors"].append("manifest.files entry missing name or sha256")
                    continue
                expected_hashes[name] = digest

            for name, expected in expected_hashes.items():
                if name not in members:
                    result["valid"] = False
                    result["errors"].append(f"Referenced file missing from bundle: {name}")
                    continue
                actual = _sha256_bytes(archive.read(name))
                if actual != expected:
                    result["valid"] = False
                    result["errors"].append(f"Hash mismatch for {name}")

            cover_hash_manifest = expected_hashes.get("00_evidence_cover_certificate.pdf")
            if not cover_hash_manifest:
                result["valid"] = False
                result["errors"].append("Cover page hash missing from manifest")
            elif "00_evidence_cover_certificate.pdf" not in members:
                result["valid"] = False
                result["errors"].append("Cover page file missing from bundle")
            else:
                cover_hash_actual = _sha256_bytes(archive.read("00_evidence_cover_certificate.pdf"))
                if cover_hash_actual == cover_hash_manifest:
                    result["cover_page_valid"] = True
                else:
                    result["valid"] = False
                    result["cover_page_valid"] = False
                    result["errors"].append("Hash mismatch for 00_evidence_cover_certificate.pdf")

            computed_root_hash = _sha256_bytes(
                "|".join(
                    f"{name}:{digest}" for name, digest in sorted(expected_hashes.items(), key=lambda pair: pair[0])
                ).encode("utf-8")
            )
            result["computed_root_hash"] = computed_root_hash
            result["manifest_root_hash"] = manifest.get("bundle_root_hash")
            if result["manifest_root_hash"] != computed_root_hash:
                result["valid"] = False
                result["errors"].append("bundle_root_hash mismatch")

            audit_payload = _read_json_from_zip(archive, "audit_logs.json")
            audit_ok, audit_error = _validate_hash_chain(
                entries=audit_payload.get("entries"),
                seed=str(audit_payload.get("seed")),
                expected_chain_root=str(audit_payload.get("chain_root")),
            )
            if not audit_ok:
                result["valid"] = False
                result["errors"].append(f"Audit hash chain invalid: {audit_error}")

            custody_payload = _read_json_from_zip(archive, "chain_of_custody.json")
            custody_ok, custody_error = _validate_hash_chain(
                entries=custody_payload.get("events"),
                seed=str(custody_payload.get("seed")),
                expected_chain_root=str(custody_payload.get("chain_root")),
            )
            if not custody_ok:
                result["valid"] = False
                result["errors"].append(f"Chain of custody invalid: {custody_error}")

            timestamps_payload = _read_json_from_zip(archive, "timestamps.json")
            assertions = timestamps_payload.get("assertions")
            if not isinstance(assertions, list) or not assertions:
                result["valid"] = False
                result["errors"].append("timestamps assertions missing")
            else:
                for idx, assertion in enumerate(assertions, start=1):
                    timestamp_value = assertion.get("timestamp_utc") if isinstance(assertion, dict) else None
                    if not _is_utc_iso8601(timestamp_value):
                        result["valid"] = False
                        result["errors"].append(f"timestamps assertion #{idx} has invalid UTC ISO-8601 timestamp")

            integrity = manifest.get("integrity") if isinstance(manifest, dict) else None
            if not isinstance(integrity, dict):
                result["valid"] = False
                result["errors"].append("manifest.integrity missing")
            else:
                profiles = integrity.get("pdf_profiles")
                if not isinstance(profiles, list) or not profiles:
                    fallback_profile = integrity.get("pdf_integrity")
                    profiles = [fallback_profile] if isinstance(fallback_profile, dict) else []

                pdf_files = [
                    name for name in expected_hashes
                    if name.lower().endswith(".pdf") and name != "00_evidence_cover_certificate.pdf"
                ]
                for pdf_name in pdf_files:
                    profile = next((p for p in profiles if isinstance(p, dict) and p.get("file_name") == pdf_name), None)
                    if not profile:
                        result["valid"] = False
                        result["errors"].append(f"PDF integrity profile missing for {pdf_name}")
                        continue

                    if profile.get("sha256") != expected_hashes[pdf_name]:
                        result["valid"] = False
                        result["errors"].append(f"PDF integrity hash mismatch for {pdf_name}")

                    structure = profile.get("structure_checks")
                    if not isinstance(structure, dict):
                        result["valid"] = False
                        result["errors"].append(f"PDF structure checks missing for {pdf_name}")
                        continue

                    required_bool_fields = ("has_valid_pdf_header", "has_eof_marker", "has_cross_reference")
                    for field in required_bool_fields:
                        if not isinstance(structure.get(field), bool):
                            result["valid"] = False
                            result["errors"].append(f"Invalid PDF profile field {field} for {pdf_name}")

            external_trust = manifest.get("external_trust") if isinstance(manifest, dict) else None
            tsa_meta = external_trust.get("timestamp_authority") if isinstance(external_trust, dict) else None
            if isinstance(tsa_meta, dict):
                tsa_status = tsa_meta.get("status")
                tsa_configured = bool(tsa_meta.get("configured"))
                tsa_token_present = "tsa_token.tsr" in members
                result["tsa"] = {
                    "present": tsa_token_present,
                    "configured": tsa_configured,
                    "status": tsa_status,
                    "verification": "not_yet_verifiable",
                }
                if tsa_status == "enabled" and not tsa_token_present:
                    result["valid"] = False
                    result["errors"].append("TSA status is enabled but tsa_token.tsr is missing")
                if tsa_status in {"fallback_internal", "unavailable"}:
                    result["warnings"].append(f"TSA status is {tsa_status}")
            else:
                result["warnings"].append("TSA metadata missing in manifest")

            if "signing_metadata.json" in members:
                signing_meta = _read_json_from_zip(archive, "signing_metadata.json")
                sig_status = signing_meta.get("status")
                sig_configured = bool(signing_meta.get("configured"))
                sig_present = "manifest.sig" in members
                result["detached_signature"] = {
                    "present": sig_present,
                    "configured": sig_configured,
                    "status": sig_status,
                    "verification": "not_yet_verifiable",
                }
                if sig_status == "signed" and not sig_present:
                    result["valid"] = False
                    result["errors"].append("Detached signature status is signed but manifest.sig is missing")
                if sig_status in {"not_configured", "unavailable"}:
                    result["warnings"].append(f"Manifest signature status is {sig_status}")
            else:
                result["warnings"].append("signing_metadata.json is missing")

    except zipfile.BadZipFile:
        result["valid"] = False
        result["errors"].append("Invalid ZIP bundle")

    if result["errors"]:
        result["valid"] = False

    return result


def _main() -> int:
    parser = argparse.ArgumentParser(description="Verify a WathiqCare evidence bundle ZIP file")
    parser.add_argument("bundle", help="Path to the evidence bundle ZIP")
    args = parser.parse_args()

    verification = verify_evidence_bundle(args.bundle)
    print(json.dumps(verification, ensure_ascii=False, indent=2))
    return 0 if verification.get("valid") else 1


if __name__ == "__main__":
    raise SystemExit(_main())
