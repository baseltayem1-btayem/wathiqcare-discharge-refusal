from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, Tuple

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from backend.forms.workflow_templates import render_financial_responsibility_notice

DOCUMENTS_DIR = Path("documents")


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _draw_lines(c: canvas.Canvas, lines: Iterable[str], *, x: float, y: float) -> float:
    for line in lines:
        c.drawString(x, y, line)
        y -= 7 * mm
    return y


def generate_pdf_document(case_id: str, file_name: str, title: str, fields: Dict[str, str]) -> str:
    case_dir = DOCUMENTS_DIR / case_id
    case_dir.mkdir(parents=True, exist_ok=True)
    output_path = case_dir / file_name

    pdf = canvas.Canvas(str(output_path), pagesize=A4)
    width, height = A4
    y = height - 20 * mm

    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(15 * mm, y, title)
    y -= 10 * mm

    pdf.setFont("Helvetica", 10)
    y = _draw_lines(
        pdf,
        [
            f"Case ID: {case_id}",
            f"Generated At (UTC): {_utc_now().strftime('%Y-%m-%d %H:%M:%S')}",
        ],
        x=15 * mm,
        y=y,
    )

    y -= 5 * mm
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(15 * mm, y, "Details")
    y -= 8 * mm
    pdf.setFont("Helvetica", 10)

    detail_lines = [f"{key}: {value}" for key, value in fields.items()]
    _draw_lines(pdf, detail_lines, x=15 * mm, y=y)

    pdf.showPage()
    pdf.save()
    return str(output_path)


def build_refusal_of_discharge(case_id: str, fields: Dict[str, str]) -> str:
    return generate_pdf_document(
        case_id,
        "refusal_of_discharge_form.pdf",
        "Refusal of Discharge Form",
        fields,
    )


def build_homecare_agreement(case_id: str, fields: Dict[str, str]) -> str:
    return generate_pdf_document(
        case_id,
        "home_care_agreement.pdf",
        "Home Care Agreement",
        fields,
    )


def build_transfer_authorization(case_id: str, fields: Dict[str, str]) -> str:
    return generate_pdf_document(
        case_id,
        "transfer_authorization.pdf",
        "Transfer Authorization",
        fields,
    )


def build_patient_rights_acknowledgment(case_id: str, fields: Dict[str, str]) -> str:
    return generate_pdf_document(
        case_id,
        "patient_rights_acknowledgment.pdf",
        "Patient Rights & Responsibilities Acknowledgment",
        fields,
    )


def build_equipment_request(case_id: str, fields: Dict[str, str]) -> Tuple[str, str | None]:
    request_path = generate_pdf_document(
        case_id,
        "equipment_request_form.pdf",
        "Equipment Request Form",
        fields,
    )

    temporary_approval_path = None
    if fields.get("status") == "unavailable":
        temporary_approval_path = generate_pdf_document(
            case_id,
            "temporary_equipment_approval.pdf",
            "Temporary Equipment Approval",
            fields,
        )

    return request_path, temporary_approval_path


def build_financial_liability_notice(case_id: str, context: Dict[str, str]) -> str:
    # Reuse approved policy template renderer to preserve legal wording.
    html = render_financial_responsibility_notice(context)
    return generate_pdf_document(
        case_id,
        "financial_liability_notice.pdf",
        "Financial Liability Notice for Refusal of Medical Discharge",
        {"approved_template_html": html[:2000]},
    )
