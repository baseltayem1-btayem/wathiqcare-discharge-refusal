"""Optional rules-based risk engine for discharge refusal cases."""

from __future__ import annotations

from typing import Any, Mapping


def _as_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "y"}
    return False


def evaluate(case_data: Mapping[str, Any]) -> str:
    """Evaluate a case and return LOW, MEDIUM, HIGH, or CRITICAL risk."""

    score = 0

    if _as_bool(case_data.get("patient_refusal")):
        score += 1
    if _as_bool(case_data.get("suicide_threat")):
        score += 4
    if _as_bool(case_data.get("no_payer")):
        score += 2
    if _as_bool(case_data.get("no_accepting_facility")):
        score += 3

    if score >= 7:
        return "CRITICAL"
    if score >= 4:
        return "HIGH"
    if score >= 2:
        return "MEDIUM"
    return "LOW"
