from __future__ import annotations

import html
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

HOMECARE_TEMPLATE_KEY = "home_healthcare_agreement"

_LOCKED_CONTRACT_PATH = Path(__file__).with_name("HHC_Contract.locked.txt")


def _safe(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _today() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d")


def _load_locked_contract_text() -> str:
  return _LOCKED_CONTRACT_PATH.read_text(encoding="utf-8")


def _apply_line_value(text: str, label: str, value: str) -> str:
  if not value:
    return text
  pattern = rf"(^\s*{re.escape(label)}\s*)(?:$|\t.*$)"
  return re.sub(pattern, lambda m: f"{m.group(1)}{value}", text, count=1, flags=re.MULTILINE)


def _apply_dynamic_fields(locked_text: str, context: Dict[str, str]) -> str:
  mappings = [
    ("Name of Patient:", _safe(context.get("patient_name"))),
    ("Contact Numbers:", _safe(context.get("contact_numbers"))),
    ("Date:", _safe(context.get("date"))),
    ("Time:", _safe(context.get("time"))),
    ("Name of Guardian / Representative (Print):", _safe(context.get("legal_guardian"))),
    ("Relationship to Patient", _safe(context.get("relationship"))),
    ("Interpreter Name (Print):", _safe(context.get("interpreter_name"))),
    ("Name (Print):", _safe(context.get("hhc_representative_name"))),
    ("Designation:", _safe(context.get("hhc_representative_designation"))),
    ("Care Partner (if identified):", _safe(context.get("care_partner_name"))),
    ("Relationship:", _safe(context.get("care_partner_relationship") or context.get("relationship"))),
  ]

  result = locked_text
  for label, value in mappings:
    result = _apply_line_value(result, label, value)
  return result


def _locked_text_to_html(text: str) -> str:
  return f"<pre class=\"contract-text\">{html.escape(text)}</pre>"


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
        "time": _safe(payload.get("time")),
        "contact_numbers": _safe(payload.get("contact_numbers")),
        "interpreter_name": _safe(payload.get("interpreter_name")),
        "hhc_representative_name": _safe(payload.get("hhc_representative_name")),
        "hhc_representative_designation": _safe(payload.get("hhc_representative_designation")),
        "care_partner_name": _safe(payload.get("care_partner_name")),
        "care_partner_relationship": _safe(payload.get("care_partner_relationship")),
        "verification_method": _safe(payload.get("verification_method")),
        "timestamp": _safe(payload.get("timestamp")),
    }


def render_homecare_agreement_html(context: Dict[str, str]) -> str:
    locked_text = _load_locked_contract_text()
    rendered_text = _apply_dynamic_fields(locked_text, context)
    contract_html = _locked_text_to_html(rendered_text)

    return f"""
<!DOCTYPE html>
<html lang=\"ar\">
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <title>Home Healthcare Agreement</title>
  <style>
    body {{
      font-family: "Noto Naskh Arabic", "Amiri", "Tahoma", "Arial", sans-serif;
      margin: 20px;
      color: #0f172a;
      line-height: 1.55;
      font-size: 13px;
      direction: rtl;
    }}
    .contract-text {{
      white-space: pre-wrap;
      word-break: break-word;
      margin: 0;
      font-family: inherit;
      font-size: 13px;
      direction: rtl;
      unicode-bidi: plaintext;
    }}
  </style>
</head>
<body>
  {contract_html}
</body>
</html>
""".strip()
