from dataclasses import dataclass
from datetime import datetime
from typing import Callable, Dict, List, Optional

from backend.discharge.home_healthcare.homecare_agreement_engine import render_homecare_agreement_html
from backend.forms.medical_legal_forms_library import render_form_by_key


TemplateRenderer = Callable[[Dict[str, str]], str]


@dataclass(frozen=True)
class WorkflowTemplate:
    key: str
    title: str
    document_code: Optional[str]
    required_fields: List[str]
    renderer: TemplateRenderer


def _safe(value: Optional[str]) -> str:
    return (value or "").strip()


def _fmt_date(value: Optional[str]) -> str:
    if not value:
        return ""

    try:
        parsed = datetime.fromisoformat(value)
        return parsed.strftime("%Y-%m-%d %H:%M")
    except Exception:
        return value


def render_discharge_refusal_form(context: Dict[str, str]) -> str:
    return render_form_by_key("discharge_refusal_form", context)


def render_financial_responsibility_notice(context: Dict[str, str]) -> str:
    return render_form_by_key("financial_responsibility_notice", context)


def render_informed_consent(context: Dict[str, str]) -> str:
    return f"""
<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\" />
  <title>Acknowledgment and Informed Consent</title>
  <style>
    body {{ font-family: Arial, sans-serif; color: #0f172a; margin: 24px; line-height: 1.5; }}
    h1 {{ margin: 0; }}
    .muted {{ color: #475569; }}
    .section {{ margin-top: 18px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; }}
    .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; }}
    .label {{ font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em; }}
    .value {{ font-size: 14px; font-weight: 600; margin-top: 2px; }}
    .line {{ margin-top: 20px; border-top: 1px solid #64748b; min-height: 24px; }}
  </style>
</head>
<body>
  <h1>Acknowledgment & Informed Consent</h1>
  <p class=\"muted\">Reference: <strong>{_safe(context.get("reference_number"))}</strong></p>

  <div class=\"section\">
    <div class=\"grid\">
      <div><div class=\"label\">Patient Name</div><div class=\"value\">{_safe(context.get("patient_name"))}</div></div>
      <div><div class=\"label\">ID Number</div><div class=\"value\">{_safe(context.get("patient_id_number"))}</div></div>
      <div><div class=\"label\">Medical Record Number</div><div class=\"value\">{_safe(context.get("medical_record_number"))}</div></div>
      <div><div class=\"label\">Room Number</div><div class=\"value\">{_safe(context.get("room_number"))}</div></div>
      <div><div class=\"label\">Attending Physician</div><div class=\"value\">{_safe(context.get("attending_physician"))}</div></div>
      <div><div class=\"label\">Decision Date</div><div class=\"value\">{_fmt_date(context.get("discharge_decision_at"))}</div></div>
    </div>
  </div>

  <div class=\"section\">
    <p>
      I acknowledge that the care team provided clear information about my medical condition,
      recommended discharge plan, expected outcomes, potential risks of refusal, and available alternatives.
    </p>
    <p>
      I confirm that my questions were answered and I understand the implications of the decision.
    </p>
    <p>
      Documented summary: <strong>{_safe(context.get("discussion_summary") or context.get("refusal_reason"))}</strong>
    </p>
  </div>

  <div class=\"section\">
    <div class=\"grid\">
      <div>
        <div class=\"label\">Patient / Legal Guardian Signature</div>
        <div class=\"line\"></div>
      </div>
      <div>
        <div class=\"label\">Date</div>
        <div class=\"line\"></div>
      </div>
      <div>
        <div class=\"label\">Witness Name</div>
        <div class=\"line\"></div>
      </div>
      <div>
        <div class=\"label\">Witness Signature</div>
        <div class=\"line\"></div>
      </div>
    </div>
  </div>
</body>
</html>
""".strip()


WORKFLOW_TEMPLATES: Dict[str, WorkflowTemplate] = {
    "discharge_refusal_form": WorkflowTemplate(
        key="discharge_refusal_form",
        title="Medical Discharge Refusal Form",
        document_code="IMC-PAT-DIS-REF-01",
        required_fields=[
            "patient_name",
            "patient_id_number",
            "medical_record_number",
            "room_number",
            "discharge_decision_at",
            "attending_physician",
        "refusal_reason_or_summary",
        ],
        renderer=render_discharge_refusal_form,
    ),
    "financial_responsibility_notice": WorkflowTemplate(
        key="financial_responsibility_notice",
        title="Notification and Acknowledgment of Financial Responsibility for Refusal of Medical Discharge",
        document_code="IMC-PAT-DIS-NOT-01",
        required_fields=[
            "patient_name",
            "patient_id_number",
            "medical_record_number",
            "room_number",
            "discharge_decision_at",
            "attending_physician",
            "refusal_reason_or_summary",
        ],
        renderer=render_financial_responsibility_notice,
    ),
    "informed_consent": WorkflowTemplate(
        key="informed_consent",
        title="Acknowledgment & Informed Consent",
        document_code="IMC-PAT-CONS-01",
        required_fields=[
            "patient_name",
            "patient_id_number",
            "medical_record_number",
            "room_number",
            "attending_physician",
            "discharge_decision_at",
        ],
        renderer=render_informed_consent,
    ),
    "home_healthcare_agreement": WorkflowTemplate(
        key="home_healthcare_agreement",
        title="Acknowledgment & Informed Consent",
        document_code="IMC-HHC-PDN-01",
        required_fields=[
            "patient_name",
            "medical_record_number",
            "room_number",
            "legal_guardian",
            "relationship",
            "date",
            "case_id",
        ],
        renderer=render_homecare_agreement_html,
    ),
}
