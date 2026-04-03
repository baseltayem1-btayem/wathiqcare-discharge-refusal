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


def render_discharge_decision_record(context: Dict[str, str]) -> str:
  return render_form_by_key("discharge_decision_record", context)


def render_informed_consent(context: Dict[str, str]) -> str:
    facility = _safe(context.get("facility_name") or context.get("tenant_name") or "WathiqCare Medical Facility")
    moh_license = _safe(context.get("moh_license"))
    cr_number = _safe(context.get("cr_number"))
    contact_email = _safe(context.get("contact_email"))
    contact_phone = _safe(context.get("contact_phone"))
    address = _safe(context.get("address"))
    city = _safe(context.get("city"))
    po_box = _safe(context.get("po_box"))
    postal_code = _safe(context.get("postal_code"))
    logo_url = _safe(context.get("logo_url"))

    patient_sig = _safe(context.get("patient_signature"))
    physician_sig = _safe(context.get("physician_signature"))
    physician_name = _safe(context.get("physician_name") or context.get("attending_physician"))
    physician_license = _safe(context.get("physician_license"))
    signed_at = _safe(context.get("signed_at") or context.get("generated_at"))
    witness_name = _safe(context.get("witness_name"))
    witness_sig = _safe(context.get("witness_signature"))
    ip_device = _safe(context.get("ip_address") or context.get("device_id"))

    # Build header identity line
    header_meta = []
    if moh_license:
        header_meta.append(f"MOH License: {moh_license}")
    header_meta_str = "  &bull;  ".join(header_meta) if header_meta else ""

    # Build footer contact line
    footer_parts = []
    if cr_number:
        footer_parts.append(f"CR: {cr_number}")
    if address:
        footer_parts.append(address)
    if city:
        footer_parts.append(city)
    if po_box:
        footer_parts.append(f"P.O. Box {po_box}")
    if postal_code:
        footer_parts.append(f"Postal: {postal_code}")
    footer_address = "  |  ".join(footer_parts)

    contact_parts = []
    if contact_email:
        contact_parts.append(f"Email: {contact_email}")
    if contact_phone:
        contact_parts.append(f"Tel: {contact_phone}")
    footer_contact = "  |  ".join(contact_parts)

    def _sig_line(label: str, value: str, name_hint: str = "", license_hint: str = "") -> str:
        content = f'<span style="font-family:monospace;font-size:12px;">{value}</span>' if value else \
                  '<div style="border-bottom:1px solid #334155;min-height:24px;margin-top:4px;"></div>'
        extras = ""
        if name_hint:
            extras += f'<div style="font-size:11px;color:#475569;">Name: {name_hint}</div>'
        if license_hint:
            extras += f'<div style="font-size:11px;color:#475569;">License/ID: {license_hint}</div>'
        return f"""
        <div style="margin-bottom:16px;">
          <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.04em;">{label}</div>
          {content}
          {extras}
        </div>"""

    logo_html = f'<img src="{logo_url}" alt="logo" style="max-height:50px;max-width:120px;object-fit:contain;" />' \
                if logo_url else '<div style="width:50px;height:50px;background:#e2e8f0;border-radius:6px;"></div>'

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Informed Consent — {facility}</title>
  <style>
    @page {{ size: A4; margin: 18mm 18mm 30mm 18mm; }}
    body {{ font-family: Arial, sans-serif; color: #0f172a; line-height: 1.55; margin: 0; }}
    h1 {{ margin: 0 0 4px; font-size: 17px; }}
    .muted {{ color: #475569; }}
    .section {{ margin-top: 16px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; }}
    .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; }}
    .label {{ font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .03em; }}
    .value {{ font-size: 13px; font-weight: 600; margin-top: 2px; }}
    .sig-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; }}
    .disclaimer {{ font-size: 10px; color: #64748b; font-style: italic; margin-top: 6px; }}
    .header {{ display:flex; align-items:flex-start; justify-content:space-between; padding-bottom:10px; border-bottom:2px solid #334155; margin-bottom:14px; }}
    .header-right {{ text-align:right; }}
    .footer {{ position:fixed; bottom:0; left:0; right:0; padding:8px 18mm 4px; border-top:1px solid #94a3b8; font-size:9.5px; color:#64748b; }}
    .footer .disclaimer {{ color:#8b949e; }}
  </style>
</head>
<body>

  <!-- ──────────── HEADER ──────────── -->
  <div class="header">
    <div style="display:flex;align-items:center;gap:12px;">
      {logo_html}
      <div>
        <div style="font-size:14px;font-weight:700;color:#0f172a;">{facility}</div>
        <div style="font-size:11px;color:#475569;">{header_meta_str}</div>
      </div>
    </div>
    <div class="header-right">
      <div style="font-size:13px;font-weight:700;color:#1e293b;">Acknowledgment &amp; Informed Consent</div>
      <div style="font-size:11px;color:#64748b;">Document Code: IMC-PAT-CONS-01</div>
      <div style="font-size:11px;color:#64748b;">Ref: <strong>{_safe(context.get("reference_number"))}</strong></div>
    </div>
  </div>

  <!-- ──────────── PATIENT INFO ──────────── -->
  <div class="section">
    <div class="grid">
      <div><div class="label">Patient Name</div><div class="value">{_safe(context.get("patient_name"))}</div></div>
      <div><div class="label">ID / Iqama Number</div><div class="value">{_safe(context.get("patient_id_number"))}</div></div>
      <div><div class="label">Medical Record Number</div><div class="value">{_safe(context.get("medical_record_number"))}</div></div>
      <div><div class="label">Room Number</div><div class="value">{_safe(context.get("room_number"))}</div></div>
      <div><div class="label">Attending Physician</div><div class="value">{_safe(context.get("attending_physician"))}</div></div>
      <div><div class="label">Discharge Decision Date</div><div class="value">{_fmt_date(context.get("discharge_decision_at"))}</div></div>
    </div>
  </div>

  <!-- ──────────── CONSENT TEXT ──────────── -->
  <div class="section">
    <p>
      I acknowledge that the care team has provided clear information about my medical condition,
      the recommended discharge plan, expected outcomes, potential risks of refusal, and available
      alternatives.  All my questions were answered to my satisfaction.
    </p>
    <p>
      I confirm that my decision is made voluntarily and without coercion, and I am aware of the
      medical, administrative, and financial implications.
    </p>
    <p>
      <strong>Discussion summary:</strong> {_safe(context.get("discussion_summary") or context.get("refusal_reason"))}
    </p>
  </div>

  <!-- ──────────── SIGNATURE BLOCK ──────────── -->
  <div class="section" style="page-break-inside:avoid;">
    <div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:12px;">
      SIGNATURES &amp; ACKNOWLEDGMENT
    </div>
    <div class="sig-grid">
      {_sig_line("Patient / Legal Guardian Signature", patient_sig,
                 _safe(context.get("patient_name")), _safe(context.get("patient_id_number")))}
      {_sig_line("Attending Physician Acknowledgment", physician_sig,
                 physician_name, physician_license)}
    </div>
    {_sig_line("Witness", witness_sig, witness_name)}

    <div style="margin-top:10px;font-size:11px;color:#475569;">
      <strong>Timestamp:</strong> {signed_at or "—"}
      {"  &bull;  <strong>Device / IP:</strong> " + ip_device if ip_device else ""}
    </div>
  </div>

  <!-- ──────────── FOOTER ──────────── -->
  <div class="footer">
    <div>{footer_address}</div>
    {f"<div>{footer_contact}</div>" if footer_contact else ""}
    <div class="disclaimer">
      This document is electronically generated and signed in accordance with the Saudi Electronic
      Transactions Law (Resolution No. M/18, 1428H).  Contains confidential medical information —
      unauthorized disclosure is prohibited.
    </div>
  </div>

</body>
</html>""".strip()


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
      "discharge_decision_record": WorkflowTemplate(
        key="discharge_decision_record",
        title="Medical Discharge Decision Record",
        document_code="IMC-PAT-DIS-DEC-01",
        required_fields=[
          "patient_name",
          "patient_id_number",
          "medical_record_number",
          "room_number",
          "attending_physician",
          "discharge_decision_at",
        ],
        renderer=render_discharge_decision_record,
      ),
    "home_healthcare_agreement": WorkflowTemplate(
        key="home_healthcare_agreement",
        title="Home Healthcare Agreement",
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
