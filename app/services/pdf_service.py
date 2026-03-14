"""
PDF Service
===========
Renders bilingual (Arabic/English) hospital refusal forms as printable PDFs
using Jinja2 HTML templates and WeasyPrint.

Validation rules
----------------
A PDF is only generated when the following data is present in form_data:
- Patient identity: patient_name, national_id
- Clinical content: procedure_description, refusal_reason
- Physician identity: physician_name

Template registry
-----------------
medical_discharge_refusal       → medical_discharge_refusal.html
procedure_refusal               → procedure_refusal.html
financial_responsibility_notice → financial_responsibility_notice.html
"""

from pathlib import Path
from typing import Any, Dict, List

from jinja2 import Environment, FileSystemLoader, select_autoescape

TEMPLATES_DIR = Path(__file__).parent.parent / "templates" / "refusal_forms"

# Fields required per validation category
REQUIRED_PATIENT_FIELDS: List[str] = ["patient_name", "national_id"]
REQUIRED_CLINICAL_FIELDS: List[str] = ["procedure_description", "refusal_reason"]

# Maps form_type → Jinja2 template filename
TEMPLATE_FILES: Dict[str, str] = {
    "medical_discharge_refusal": "medical_discharge_refusal.html",
    "procedure_refusal": "procedure_refusal.html",
    "financial_responsibility_notice": "financial_responsibility_notice.html",
}

# Module-level cached Jinja2 environment (lazy-initialised)
_jinja_env: "Environment | None" = None


def _get_env() -> Environment:
    global _jinja_env
    if _jinja_env is None:
        _jinja_env = Environment(
            loader=FileSystemLoader(str(TEMPLATES_DIR)),
            autoescape=select_autoescape(["html"]),
        )
    return _jinja_env


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


def validate_form_data(form_data: Dict[str, Any], form_type: str) -> None:
    """
    Validate that all required fields are present before generating a PDF.

    Raises
    ------
    ValueError
        A descriptive message listing every failed constraint.
    """
    errors: List[str] = []

    for field in REQUIRED_PATIENT_FIELDS:
        if not form_data.get(field):
            errors.append(f"Missing required patient field: '{field}'")

    for field in REQUIRED_CLINICAL_FIELDS:
        if not form_data.get(field):
            errors.append(f"Missing required clinical field: '{field}'")

    if not form_data.get("physician_name"):
        errors.append(
            "Missing required field: 'physician_name'. "
            "Provide the attending physician's name when generating the form."
        )

    if form_type not in TEMPLATE_FILES:
        known = ", ".join(TEMPLATE_FILES.keys())
        errors.append(f"No PDF template registered for form_type '{form_type}'. Known: {known}")

    if errors:
        raise ValueError("PDF generation validation failed: " + "; ".join(errors))


# ---------------------------------------------------------------------------
# Context builder
# ---------------------------------------------------------------------------


def _build_template_context(form_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Build a nested template context from the flat form_data dict.

    Supports both flat access (``{{ patient_name }}``) and nested access
    (``{{ patient.full_name }}``) as specified in the template contract.
    """
    return {
        # ── flat keys (backward-compatible) ─────────────────────────────────
        **form_data,
        # ── top-level metadata ───────────────────────────────────────────────
        "hospital_name": form_data.get("hospital_name", "WathiqCare Hospital"),
        "hospital_logo": form_data.get("hospital_logo", ""),
        "form_number": form_data.get("form_number", ""),
        "generated_date": form_data.get("generated_date", ""),
        "generated_time": form_data.get("generated_time", ""),
        "form_version": form_data.get("form_version", "v1.0"),
        # ── nested: patient ──────────────────────────────────────────────────
        "patient": {
            "full_name": form_data.get("patient_name", ""),
            "mrn": form_data.get("mrn", ""),
            "national_id": form_data.get("national_id", ""),
            "date_of_birth": form_data.get("date_of_birth", ""),
            "gender": form_data.get("gender", ""),
            "phone": form_data.get("patient_phone", ""),
        },
        # ── nested: physician ────────────────────────────────────────────────
        "physician": {
            "full_name": form_data.get("physician_name", ""),
            "specialty": form_data.get("physician_specialty", ""),
            "license_number": form_data.get("physician_license_number", ""),
            "department": form_data.get("department", ""),
        },
        # ── nested: consent ──────────────────────────────────────────────────
        "consent": {
            "diagnosis": form_data.get("procedure_description", ""),
            "recommended_plan": form_data.get("procedure_description", ""),
            "icd11_codes": form_data.get("icd11_codes", []),
            "consent_type": form_data.get("consent_type", ""),
        },
        # ── nested: refusal ──────────────────────────────────────────────────
        "refusal": {
            "reason": form_data.get("refusal_reason", ""),
            "date": form_data.get("refusal_date", ""),
            "observation_hours": form_data.get("observation_hours_required", ""),
            "risk_summary": form_data.get("risk_summary", ""),
            "alternatives_offered": form_data.get("alternatives_offered", ""),
            "patient_declaration": form_data.get("patient_declaration", ""),
        },
        # ── nested: witness ──────────────────────────────────────────────────
        "witness": {
            "statement": form_data.get("witness_statement", ""),
        },
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def render_html(form_type: str, form_data: Dict[str, Any]) -> str:
    """
    Render the Jinja2 HTML template for the given form_type using form_data.

    Does *not* validate required fields — call :func:`validate_form_data`
    first when generating PDFs for hospital use.

    Returns
    -------
    str
        UTF-8 HTML string ready for display or WeasyPrint rendering.
    """
    template_file = TEMPLATE_FILES.get(form_type)
    if not template_file:
        known = ", ".join(TEMPLATE_FILES.keys())
        raise ValueError(f"No template registered for form_type '{form_type}'. Known: {known}")

    env = _get_env()
    template = env.get_template(template_file)
    context = _build_template_context(form_data)
    return template.render(**context)


def render_pdf(form_type: str, form_data: Dict[str, Any]) -> bytes:
    """
    Validate form_data, render the HTML template, and convert to PDF bytes.

    Uses WeasyPrint for HTML→PDF conversion.  The ``base_url`` is set to the
    templates directory so that any future embedded assets (logos, fonts) are
    resolved correctly.

    Returns
    -------
    bytes
        Raw PDF bytes suitable for returning as an HTTP response
        (``application/pdf``).

    Raises
    ------
    ValueError
        If required fields are missing (see :func:`validate_form_data`).
    """
    validate_form_data(form_data, form_type)
    html_content = render_html(form_type, form_data)

    from weasyprint import HTML  # lazy import — keeps tests fast when mocked

    return HTML(
        string=html_content,
        base_url=str(TEMPLATES_DIR),
    ).write_pdf()
