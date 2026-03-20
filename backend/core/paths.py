from __future__ import annotations

import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]

_generated_root = os.getenv("WATHIQ_GENERATED_DIR")
if _generated_root:
    GENERATED_ROOT = Path(_generated_root).expanduser().resolve()
else:
    GENERATED_ROOT = (PROJECT_ROOT / "backend" / "generated").resolve()


def ensure_generated_subdir(*parts: str) -> Path:
    target = GENERATED_ROOT.joinpath(*parts)
    target.mkdir(parents=True, exist_ok=True)
    return target


BUNDLES_DIR = ensure_generated_subdir("bundles")
CASE_DOCUMENTS_DIR = ensure_generated_subdir("case_documents")
DOCUMENT_SIGNATURE_DIR = ensure_generated_subdir("document_signature")
DOCUMENT_OTP_DIR = ensure_generated_subdir("document_otp")
HOME_HEALTHCARE_RECORDS_DIR = ensure_generated_subdir("home_healthcare_records")
LEGAL_ESCALATION_DIR = ensure_generated_subdir("legal_escalation")
SIGNED_DOCUMENTS_DIR = ensure_generated_subdir("signed_documents")
SIGNATURE_EVIDENCE_DIR = ensure_generated_subdir("signature_evidence")
SIGNATURE_SESSIONS_DIR = ensure_generated_subdir("signature_sessions")
