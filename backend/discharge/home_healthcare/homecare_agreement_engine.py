from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

HOMECARE_TEMPLATE_KEY = "home_healthcare_agreement"

_TEMPLATE_PATH = Path(__file__).with_name("homecare_agreement_template.json")


def _safe(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _today() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d")


def _text_to_html(text: str) -> str:
  parts = [chunk.strip() for chunk in text.split("\n\n") if chunk.strip()]
  rendered: list[str] = []
  for part in parts:
    line_html = "<br/>".join(_safe(line) for line in part.split("\n"))
    rendered.append(f"<p>{line_html}</p>")
  return "".join(rendered)


def load_homecare_template() -> Dict[str, Any]:
    return json.loads(_TEMPLATE_PATH.read_text(encoding="utf-8"))


def build_homecare_context(*, case_id: str, payload: Dict[str, Any]) -> Dict[str, str]:
    return {
        "case_id": case_id,
        "patient_name": _safe(payload.get("patient_name")),
        "urn": _safe(payload.get("urn") or payload.get("medical_record_number")),
        "medical_record_number": _safe(payload.get("medical_record_number") or payload.get("urn")),
        "current_location": _safe(payload.get("current_location")),
        "room_number": _safe(payload.get("room_number")),
        "legal_guardian": _safe(payload.get("legal_guardian")),
        "relationship": _safe(payload.get("relationship")),
        "guardian_id": _safe(payload.get("guardian_id")),
        "ack_homecare_provision": _safe(payload.get("ack_homecare_provision")),
        "ack_discharge_decision_notice": _safe(payload.get("ack_discharge_decision_notice")),
        "date": _safe(payload.get("date")) or _today(),
        "verification_method": _safe(payload.get("verification_method")),
        "timestamp": _safe(payload.get("timestamp")),
    }


def render_homecare_agreement_html(context: Dict[str, str]) -> str:
    template = load_homecare_template()
    title_ar = _safe(template.get("title_ar"))
    title_en = _safe(template.get("title_en"))
    subtitle_ar = _safe(template.get("subtitle_ar"))
    subtitle_en = _safe(template.get("subtitle_en"))
    date_label_ar = _safe(template.get("date_label_ar") or "التاريخ")
    date_label_en = _safe(template.get("date_label_en") or "Date")
    sections = template.get("sections", [])

    section_html = []
    for section in sections:
        heading_ar = _safe(section.get("heading_ar"))
        heading_en = _safe(section.get("heading_en"))
        body_ar = _safe(section.get("body_ar"))
        body_en = _safe(section.get("body_en"))
        section_body = f"{_text_to_html(body_ar)}{_text_to_html(body_en)}"
        section_html.append(
            "".join(
                [
                    "<section class=\"section\">",
                    f"<h2 class=\"heading-ar\">{heading_ar}</h2>",
                    f"<h3 class=\"heading-en\">{heading_en}</h3>",
                    section_body,
                    "</section>",
                ]
            )
        )

    rendered_sections = "\n".join(section_html)

    return f"""
<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\" />
  <title>{title_en}</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 28px; color: #0f172a; line-height: 1.5; }}
    h1 {{ margin: 0; font-size: 24px; }}
    .title-ar {{ direction: rtl; text-align: right; font-weight: 700; }}
    .title-en {{ text-transform: uppercase; }}
    .subtitle {{ margin-top: 6px; font-size: 14px; color: #334155; }}
    .subtitle-ar {{ direction: rtl; text-align: right; }}
    .meta {{ margin-top: 18px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #f8fafc; }}
    .meta-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; }}
    .label {{ font-size: 11px; text-transform: uppercase; color: #64748b; }}
    .value {{ font-size: 13px; font-weight: 600; }}
    .section {{ border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-top: 12px; }}
    .heading-ar {{ margin: 0; font-size: 16px; direction: rtl; text-align: right; }}
    .heading-en {{ margin: 4px 0 0 0; font-size: 14px; color: #334155; }}
    p {{ margin: 10px 0; }}
  </style>
</head>
<body>
  <h1 class=\"title-ar\">{title_ar}</h1>
  <h1 class=\"title-en\">{title_en}</h1>
  <div class=\"subtitle subtitle-ar\">{subtitle_ar}</div>
  <div class=\"subtitle\">{subtitle_en}</div>
  <div class=\"subtitle subtitle-ar\">{date_label_ar}: {_safe(context.get('date'))}</div>
  <div class=\"subtitle\">{date_label_en}: {_safe(context.get('date'))}</div>

  <div class=\"meta\">
    <div class=\"meta-grid\">
      <div><div class=\"label\">Patient Name</div><div class=\"value\">{_safe(context.get('patient_name'))}</div></div>
      <div><div class=\"label\">URN / MRN</div><div class=\"value\">{_safe(context.get('urn') or context.get('medical_record_number'))}</div></div>
      <div><div class=\"label\">Current Location</div><div class=\"value\">{_safe(context.get('current_location'))}</div></div>
      <div><div class=\"label\">Room Number</div><div class=\"value\">{_safe(context.get('room_number'))}</div></div>
      <div><div class=\"label\">Legal Guardian</div><div class=\"value\">{_safe(context.get('legal_guardian'))}</div></div>
      <div><div class=\"label\">Relationship</div><div class=\"value\">{_safe(context.get('relationship'))}</div></div>
      <div><div class=\"label\">Guardian ID</div><div class=\"value\">{_safe(context.get('guardian_id'))}</div></div>
      <div><div class=\"label\">Case ID</div><div class=\"value\">{_safe(context.get('case_id'))}</div></div>
      <div><div class=\"label\">Verification Method</div><div class=\"value\">{_safe(context.get('verification_method'))}</div></div>
      <div><div class=\"label\">Timestamp</div><div class=\"value\">{_safe(context.get('timestamp'))}</div></div>
      <div><div class=\"label\">Acknowledged Home Care Provision</div><div class=\"value\">{_safe(context.get('ack_homecare_provision'))}</div></div>
      <div><div class=\"label\">Notified of Discharge Decision</div><div class=\"value\">{_safe(context.get('ack_discharge_decision_notice'))}</div></div>
    </div>
  </div>

  {rendered_sections}
</body>
</html>
""".strip()
