from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

HOME_HEALTHCARE_MODEL_VALUE = "home_healthcare_agreement"

POST_DISCHARGE_CARE_MODELS: List[Dict[str, str]] = [
    {"value": "home_medical_equipment_support", "label": "Home Medical Equipment Support"},
    {"value": "family_care_undertaking", "label": "Family Care Undertaking"},
    {"value": HOME_HEALTHCARE_MODEL_VALUE, "label": "Home Health Care Agreement"},
    {"value": "extended_care_transfer", "label": "Extended Care Transfer"},
]

HOMECARE_RECORDS_DIR = Path("backend/generated/home_healthcare_records")
HOMECARE_RECORDS_DIR.mkdir(parents=True, exist_ok=True)


def is_home_healthcare_model(value: str | None) -> bool:
    normalized = (value or "").strip().lower()
    return normalized == HOME_HEALTHCARE_MODEL_VALUE


def persist_homecare_case_record(case_id: str, record: Dict[str, Any]) -> str:
    case_dir = HOMECARE_RECORDS_DIR / case_id
    case_dir.mkdir(parents=True, exist_ok=True)
    target = case_dir / "agreement_record.json"

    serialized = {
        "case_id": case_id,
        **record,
    }
    target.write_text(json.dumps(serialized, indent=2, ensure_ascii=True), encoding="utf-8")
    return str(target)
