from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict


DEFAULT_RULES = {
    "require_refusal_form": True,
    "require_financial_notice": True,
    "require_two_witnesses": True,
    "block_case_completion_if_missing_required_documents": True,
    "escalate_after_24h": True,
    "require_promissory_note_if_uninsured": True,
    "require_promissory_note_if_uncovered_stay": True,
}


@dataclass(frozen=True)
class DischargeTemplateRules:
    require_refusal_form: bool = True
    require_financial_notice: bool = True
    require_two_witnesses: bool = True
    block_case_completion_if_missing_required_documents: bool = True
    escalate_after_24h: bool = True
    require_promissory_note_if_uninsured: bool = True
    require_promissory_note_if_uncovered_stay: bool = True


def _read_rules_yaml() -> Dict[str, Any]:
    config_path = Path("config/rules.yaml")
    if not config_path.exists():
        return {}

    try:
        import yaml  # type: ignore
    except Exception:
        return {}

    try:
        loaded = yaml.safe_load(config_path.read_text(encoding="utf-8"))
    except Exception:
        return {}

    if not isinstance(loaded, dict):
        return {}

    section = loaded.get("discharge_refusal_templates")
    if not isinstance(section, dict):
        return {}

    return section


def load_discharge_template_rules() -> DischargeTemplateRules:
    loaded = _read_rules_yaml()
    merged = {**DEFAULT_RULES, **loaded}
    return DischargeTemplateRules(
        require_refusal_form=bool(merged.get("require_refusal_form", True)),
        require_financial_notice=bool(merged.get("require_financial_notice", True)),
        require_two_witnesses=bool(merged.get("require_two_witnesses", True)),
        block_case_completion_if_missing_required_documents=bool(
            merged.get("block_case_completion_if_missing_required_documents", True)
        ),
        escalate_after_24h=bool(merged.get("escalate_after_24h", True)),
        require_promissory_note_if_uninsured=bool(merged.get("require_promissory_note_if_uninsured", True)),
        require_promissory_note_if_uncovered_stay=bool(merged.get("require_promissory_note_if_uncovered_stay", True)),
    )


def should_require_promissory_note(*, rules: DischargeTemplateRules, insurance_coverage_status: str, payload: Dict[str, Any]) -> bool:
    coverage = (insurance_coverage_status or "").strip().lower()
    if rules.require_promissory_note_if_uninsured and coverage in {"uninsured", "not_covered", "self_pay"}:
        return True

    uncovered_flag = bool(payload.get("uncovered_stay") or payload.get("has_uncovered_stay"))
    if rules.require_promissory_note_if_uncovered_stay and uncovered_flag:
        return True

    risk_level = str(payload.get("risk_level") or "").strip().lower()
    return risk_level == "high"
