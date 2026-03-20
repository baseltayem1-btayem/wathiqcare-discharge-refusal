from __future__ import annotations

import textwrap
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, Tuple

from .homecare_agreement_engine import load_homecare_template


def _draw_wrapped_lines(c, text: str, *, x: int, y: float, width: int, line_gap: int = 11) -> float:
    lines = []
    for block in str(text or "").split("\n"):
        block = block.strip()
        if not block:
            lines.append("")
            continue
        lines.extend(textwrap.wrap(block, width=width) or [""])

    for line in lines:
        if y < 60:
            c.showPage()
            c.setFont("Helvetica", 9)
            y = 800
        c.drawString(x, y, line)
        y -= line_gap
    return y


def _utc_stamp() -> str:
    return datetime.utcnow().strftime("%Y%m%d%H%M%S")


def generate_homecare_agreement_pdf(
    *,
    case_id: str,
    output_root: str,
    context: Dict[str, str],
) -> Optional[Tuple[str, str]]:
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
    except Exception:
        return None

    target_dir = Path(output_root) / case_id
    target_dir.mkdir(parents=True, exist_ok=True)
    file_name = f"home_healthcare_agreement_{_utc_stamp()}.pdf"
    file_path = target_dir / file_name

    template = load_homecare_template()

    c = canvas.Canvas(str(file_path), pagesize=A4)
    width, height = A4
    x = 40
    y = height - 45

    c.setFont("Helvetica-Bold", 13)
    c.drawString(x, y, str(template.get("title_en") or "ACKNOWLEDGMENT & INFORMED CONSENT"))
    y -= 16
    c.setFont("Helvetica", 10)
    for line in [template.get("subtitle_en") or "", f"Date: {context.get('date', '')}"]:
        if not line:
            continue
        c.drawString(x, y, line)
        y -= 13

    y -= 8
    c.setFont("Helvetica-Bold", 10)
    c.drawString(x, y, "Patient / Guardian Details")
    y -= 14
    c.setFont("Helvetica", 9)

    meta_lines = [
        f"Patient Name: {context.get('patient_name', '')}",
        f"URN / MRN: {context.get('urn') or context.get('medical_record_number') or ''}",
        f"Current Location: {context.get('current_location', '')}",
        f"Room Number: {context.get('room_number', '')}",
        f"Legal Guardian: {context.get('legal_guardian', '')}",
        f"Relationship: {context.get('relationship', '')}",
        f"Date: {context.get('date', '')}",
        f"Case ID: {context.get('case_id', '')}",
    ]

    for line in meta_lines:
        c.drawString(x, y, line)
        y -= 12

    y -= 6
    c.setFont("Helvetica-Bold", 10)
    c.drawString(x, y, "Legal Sections")
    y -= 14

    for section in template.get("sections", []):
        heading_en = str(section.get("heading_en") or "").strip()
        body_ar = str(section.get("body_ar") or "").strip()
        body_en = str(section.get("body_en") or "").strip()
        if y < 60:
            c.showPage()
            y = height - 45
        c.setFont("Helvetica-Bold", 9)
        c.drawString(x, y, heading_en)
        y -= 12
        c.setFont("Helvetica", 9)
        # Arabic text is preserved in source and included in output lines.
        y = _draw_wrapped_lines(c, body_ar, x=x, y=y, width=100)
        y = _draw_wrapped_lines(c, body_en, x=x, y=y, width=100)
        y -= 6

    y -= 6
    c.setFont("Helvetica-Bold", 10)
    c.drawString(x, y, "Signature Block")
    y -= 14
    c.setFont("Helvetica", 9)
    c.drawString(x, y, f"Guardian Name: {context.get('legal_guardian', '')}")
    y -= 12
    c.drawString(x, y, f"Verification Method: {context.get('verification_method', '')}")
    y -= 12
    c.drawString(x, y, f"Timestamp: {context.get('timestamp', '')}")

    c.save()
    return file_name, str(file_path)
