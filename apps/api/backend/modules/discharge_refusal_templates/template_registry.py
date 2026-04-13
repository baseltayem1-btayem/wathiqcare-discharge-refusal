from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List


@dataclass(frozen=True)
class TemplateDefinition:
    template_id: str
    template_key: str
    title: str
    stage_code: str
    required_fields: List[str]
    signature_required: bool = True
    locked_template: bool = True


TEMPLATE_REGISTRY: Dict[str, TemplateDefinition] = {
    "IMC-DIS-REF-01": TemplateDefinition(
        template_id="IMC-DIS-REF-01",
        template_key="discharge_refusal_form",
        title="Medical Discharge Refusal Form / نموذج رفض الخروج الطبي",
        stage_code="stage_4_refusal_documentation",
        required_fields=[
            "patient_name",
            "patient_id_number",
            "medical_record_number",
            "room_number",
            "attending_physician",
            "discharge_decision_at",
            "refusal_reason",
        ],
    ),
    "IMC-DIS-NOT-01": TemplateDefinition(
        template_id="IMC-DIS-NOT-01",
        template_key="financial_responsibility_notice",
        title="Notification and Acknowledgment of Financial Responsibility",
        stage_code="stage_5_financial_liability",
        required_fields=[
            "date",
            "ref_no",
            "patient_name",
            "national_id",
            "mrn",
            "room_number",
            "discharge_date",
            "physician_name",
            "ack_date",
            "staff_name",
        ],
    ),
    "IMC-PN-01": TemplateDefinition(
        template_id="IMC-PN-01",
        template_key="promissory_note",
        title="Promissory Note / سند لأمر",
        stage_code="stage_6_financial_enforcement",
        required_fields=[
            "debtor_name",
            "debtor_id",
            "case_id",
            "mrn",
            "amount",
            "issue_date",
            "city",
        ],
    ),
    "IMC-COM-01": TemplateDefinition(
        template_id="IMC-COM-01",
        template_key="communication_log",
        title="Initial Communication Documentation",
        stage_code="stage_2_initial_communication",
        required_fields=[
            "case_id",
            "communication_date_time",
            "explained_by",
            "explanation_summary",
            "risks_explained",
            "patient_response",
            "next_action",
        ],
    ),
    "IMC-SOC-01": TemplateDefinition(
        template_id="IMC-SOC-01",
        template_key="social_intervention_form",
        title="Social / Patient Affairs Intervention",
        stage_code="stage_3_social_intervention",
        required_fields=[
            "case_id",
            "referred_to_social_services",
            "intervention_details",
            "support_provided",
            "intervention_result",
            "staff_name",
            "date",
            "signature",
        ],
    ),
    "IMC-ESC-01": TemplateDefinition(
        template_id="IMC-ESC-01",
        template_key="escalation_compliance_form",
        title="Legal Escalation and Compliance",
        stage_code="stage_7_escalation",
        required_fields=[
            "case_id",
            "escalation_date_time",
            "refusal_duration",
            "escalation_reason",
            "notified_department",
            "current_status",
            "notes",
        ],
    ),
    "IMC-WIT-01": TemplateDefinition(
        template_id="IMC-WIT-01",
        template_key="witness_confirmation_form",
        title="Witness Confirmation",
        stage_code="stage_4_refusal_documentation",
        required_fields=[
            "case_id",
            "witness_1_name",
            "witness_1_title",
            "witness_1_signature",
            "witness_2_name",
            "witness_2_title",
            "witness_2_signature",
        ],
    ),
    "IMC-TIME-01": TemplateDefinition(
        template_id="IMC-TIME-01",
        template_key="timeline_report",
        title="Chronological Timeline Report",
        stage_code="stage_8_evidence_closure",
        required_fields=["case_id"],
        signature_required=False,
    ),
    "IMC-LEGAL-01": TemplateDefinition(
        template_id="IMC-LEGAL-01",
        template_key="legal_summary",
        title="Legal Summary",
        stage_code="stage_8_evidence_closure",
        required_fields=["case_id"],
        signature_required=False,
    ),
    "IMC-CLOSE-01": TemplateDefinition(
        template_id="IMC-CLOSE-01",
        template_key="closure_summary",
        title="Case Closure Summary",
        stage_code="stage_8_evidence_closure",
        required_fields=["case_id"],
        signature_required=False,
    ),
}

TEMPLATE_REGISTRY_BY_KEY: Dict[str, TemplateDefinition] = {
    item.template_key: item for item in TEMPLATE_REGISTRY.values()
}

STAGE_TEMPLATE_MAPPING: Dict[str, Dict[str, List[str]]] = {
    "stage_1_discharge_decision": {"required": [], "conditional": []},
    "stage_2_initial_communication": {"required": ["IMC-COM-01"], "conditional": []},
    "stage_3_social_intervention": {"required": [], "conditional": ["IMC-SOC-01"]},
    "stage_4_refusal_documentation": {"required": ["IMC-DIS-REF-01", "IMC-WIT-01"], "conditional": []},
    "stage_5_financial_liability": {"required": ["IMC-DIS-NOT-01"], "conditional": []},
    "stage_6_financial_enforcement": {"required": [], "conditional": ["IMC-PN-01"]},
    "stage_7_escalation": {"required": ["IMC-ESC-01"], "conditional": []},
    "stage_8_evidence_closure": {"required": ["IMC-TIME-01", "IMC-LEGAL-01", "IMC-CLOSE-01"], "conditional": []},
}
