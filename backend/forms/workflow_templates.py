from dataclasses import dataclass
from datetime import datetime
from typing import Callable, Dict, List, Optional


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
    return f"""
<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\" />
  <title>Medical Discharge Refusal Form</title>
  <style>
    body {{ font-family: Arial, sans-serif; color: #0f172a; margin: 24px; line-height: 1.45; }}
    h1, h2 {{ margin: 0; }}
    .muted {{ color: #475569; }}
    .section {{ margin-top: 20px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; }}
    .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; }}
    .label {{ font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em; }}
    .value {{ font-size: 14px; font-weight: 600; margin-top: 2px; }}
    .line {{ margin-top: 18px; border-top: 1px solid #64748b; min-height: 24px; }}
  </style>
</head>
<body>
  <h1>Medical Discharge Refusal Form</h1>
  <p class=\"muted\">Document Code: <strong>IMC-PAT-DIS-REF-01</strong></p>

  <div class=\"section\">
    <h2>Patient Information</h2>
    <div class=\"grid\">
      <div><div class=\"label\">Full Name</div><div class=\"value\">{_safe(context.get("patient_name"))}</div></div>
      <div><div class=\"label\">ID / Iqama Number</div><div class=\"value\">{_safe(context.get("patient_id_number"))}</div></div>
      <div><div class=\"label\">Medical Record Number</div><div class=\"value\">{_safe(context.get("medical_record_number"))}</div></div>
      <div><div class=\"label\">Room Number</div><div class=\"value\">{_safe(context.get("room_number"))}</div></div>
    </div>
  </div>

  <div class=\"section\">
    <h2>Medical Decision</h2>
    <div class=\"grid\">
      <div><div class=\"label\">Attending Physician</div><div class=\"value\">{_safe(context.get("attending_physician"))}</div></div>
      <div><div class=\"label\">Discharge Decision Date</div><div class=\"value\">{_fmt_date(context.get("discharge_decision_at"))}</div></div>
    </div>
    <div style=\"margin-top: 10px;\"><div class=\"label\">Case Details / Explanation</div><div class=\"value\">{_safe(context.get("discussion_summary"))}</div></div>
    <div style=\"margin-top: 10px;\"><div class=\"label\">Reasons for Refusal</div><div class=\"value\">{_safe(context.get("refusal_reason"))}</div></div>
  </div>

  <div class=\"section\">
    <h2>Patient Acknowledgment</h2>
    <p>
      I acknowledge that I have received and understood the medical discharge decision,
      and I choose to refuse discharge at this time. I understand potential medical,
      legal, and financial implications as explained by the care team.
    </p>
    <div class=\"grid\" style=\"margin-top: 10px;\">
      <div><div class=\"label\">Patient / Legal Representative Signature</div><div class=\"line\"></div></div>
      <div><div class=\"label\">Date</div><div class=\"line\"></div></div>
      <div><div class=\"label\">Witness 1 Signature</div><div class=\"line\"></div></div>
      <div><div class=\"label\">Witness 2 Signature</div><div class=\"line\"></div></div>
    </div>
  </div>

  <div class=\"section\">
    <h2>Social Services / Patient Affairs</h2>
    <div><div class=\"label\">Intervention Summary</div><div class=\"value\">{_safe(context.get("social_administrative_interventions"))}</div></div>
    <div class=\"grid\" style=\"margin-top: 10px;\">
      <div><div class=\"label\">Social Services / Patient Affairs Representative</div><div class=\"line\"></div></div>
      <div><div class=\"label\">Signature / Stamp</div><div class=\"line\"></div></div>
    </div>
  </div>
</body>
</html>
""".strip()


def render_financial_responsibility_notice(context: Dict[str, str]) -> str:
    return f"""
<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\" />
  <title>Notification and Acknowledgment of Financial Responsibility</title>
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
  <h1>Notification and Acknowledgment of Financial Responsibility for Refusal of Medical Discharge</h1>
  <p class=\"muted\">Date: <strong>{_fmt_date(context.get("financial_notice_generated_at") or context.get("generated_at"))}</strong></p>
  <p class=\"muted\">Ref: <strong>{_safe(context.get("reference_number"))}</strong></p>

  <div class=\"section\">
    <div class=\"grid\">
      <div><div class=\"label\">Patient / Legal Guardian Name</div><div class=\"value\">{_safe(context.get("patient_name"))}</div></div>
      <div><div class=\"label\">National ID Number</div><div class=\"value\">{_safe(context.get("patient_id_number"))}</div></div>
      <div><div class=\"label\">Medical Record Number</div><div class=\"value\">{_safe(context.get("medical_record_number"))}</div></div>
      <div><div class=\"label\">Room Number</div><div class=\"value\">{_safe(context.get("room_number"))}</div></div>
      <div><div class=\"label\">Date of Medical Discharge Decision</div><div class=\"value\">{_fmt_date(context.get("discharge_decision_at"))}</div></div>
      <div><div class=\"label\">Attending Physician</div><div class=\"value\">{_safe(context.get("attending_physician"))}</div></div>
    </div>
  </div>

  <div class=\"section\">
    <p>
      This is to formally notify you that despite completion of medical discharge criteria,
      discharge has been refused. You acknowledge that continued stay or refusal-related
      delay may result in financial responsibility according to applicable regulations,
      payer policies, and hospital policy.
    </p>
    <p>
      You also acknowledge receiving explanation from the clinical team and Patient Affairs
      regarding available support, consequences of continued refusal, and escalation process.
    </p>
    <p>
      Documented interventions: <strong>{_safe(context.get("social_administrative_interventions"))}</strong>
    </p>
    <p>
      Forms already issued in this case: <strong>{_safe(context.get("forms_issued"))}</strong>
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
        <div class=\"label\">Patient Affairs Representative</div>
        <div class=\"line\"></div>
      </div>
      <div>
        <div class=\"label\">Signature / Stamp</div>
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
}
