"""
Discharge Form PDF Service
===========================
Renders the Hospital Discharge Form as a printable A4 PDF using
Jinja2 templates and WeasyPrint.

Validation rules
----------------
Before generating a PDF the following fields must be present:
- Patient identity:  patient_first_name, patient_last_name
- Clinical dates:    admission_date, date_services_should_end
- Clinical content:  diagnosis
- Physician:         attending_physician_first_name, attending_physician_last_name
"""

from pathlib import Path
from typing import Any, Dict, List

from jinja2 import Environment, FileSystemLoader, select_autoescape

TEMPLATES_DIR = Path(__file__).parent.parent / "templates" / "discharge_forms"

TEMPLATE_FILE = "inpatient_care_discharge.html"

REQUIRED_PATIENT_FIELDS: List[str] = ["patient_first_name", "patient_last_name"]
REQUIRED_DATE_FIELDS: List[str] = ["admission_date", "date_services_should_end"]
REQUIRED_CLINICAL_FIELDS: List[str] = ["diagnosis"]
REQUIRED_PHYSICIAN_FIELDS: List[str] = [
    "attending_physician_first_name",
    "attending_physician_last_name",
]

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


def validate_discharge_form_data(form_data: Dict[str, Any]) -> None:
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

    for field in REQUIRED_DATE_FIELDS:
        if not form_data.get(field):
            errors.append(f"Missing required date field: '{field}'")

    for field in REQUIRED_CLINICAL_FIELDS:
        if not form_data.get(field):
            errors.append(f"Missing required clinical field: '{field}'")

    for field in REQUIRED_PHYSICIAN_FIELDS:
        if not form_data.get(field):
            errors.append(f"Missing required physician field: '{field}'")

    if errors:
        raise ValueError("PDF generation validation failed: " + "; ".join(errors))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def render_html(form_data: Dict[str, Any]) -> str:
    """
    Render the Jinja2 HTML template using form_data context.

    Does *not* validate required fields — call :func:`validate_discharge_form_data`
    before generating PDFs for hospital use.
    """
    env = _get_env()
    template = env.get_template(TEMPLATE_FILE)
    return template.render(**form_data)


def render_pdf(form_data: Dict[str, Any]) -> bytes:
    """
    Validate form_data, render the HTML template, and convert to PDF bytes.

    Returns
    -------
    bytes
        Raw PDF bytes (``application/pdf``).

    Raises
    ------
    ValueError
        If required fields are missing.
    """
    validate_discharge_form_data(form_data)
    html_content = render_html(form_data)

    from weasyprint import HTML  # lazy import — keeps tests fast when mocked

    return HTML(
        string=html_content,
        base_url=str(TEMPLATES_DIR),
    ).write_pdf()
