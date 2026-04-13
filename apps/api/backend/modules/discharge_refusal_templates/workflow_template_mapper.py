from __future__ import annotations

from typing import Dict, List

from backend.modules.discharge_refusal_templates.template_registry import STAGE_TEMPLATE_MAPPING
from backend.modules.discharge_refusal_templates.template_rules import (
    DischargeTemplateRules,
    should_require_promissory_note,
)


def list_stage_requirements() -> Dict[str, Dict[str, List[str]]]:
    return STAGE_TEMPLATE_MAPPING


def resolve_required_templates(*, rules: DischargeTemplateRules, insurance_coverage_status: str, payload: Dict[str, object]) -> List[str]:
    required = [
        "discharge_refusal_form" if rules.require_refusal_form else "",
        "financial_responsibility_notice" if rules.require_financial_notice else "",
        "witness_confirmation_form" if rules.require_two_witnesses else "",
        "timeline_report",
        "legal_summary",
        "closure_summary",
    ]

    if should_require_promissory_note(
        rules=rules,
        insurance_coverage_status=insurance_coverage_status,
        payload=payload,
    ):
        required.append("promissory_note")

    return [item for item in required if item]
