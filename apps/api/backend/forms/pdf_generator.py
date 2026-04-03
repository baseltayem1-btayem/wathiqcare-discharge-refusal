"""
WathiqCare — Court-ready discharge refusal PDF generator.

Generates A4 PDFs via ReportLab that comply with:
  • Saudi MOH document standards
  • CBAHI / JCI audit requirements
  • Saudi Electronic Transactions Law (section 5/1444H)

Layout per page:
  ┌─────────────────────────────────────┐
  │  HEADER: logo | facility | MOH lic  │
  │  Document title | Date | Case ID    │
  ├─────────────────────────────────────┤
  │  BODY (case data, refusal reason,   │
  │  signer info, acknowledgment)       │
  ├─────────────────────────────────────┤
  │  SIGNATURE BLOCK (patient +         │
  │  physician + witness + timestamp)   │
  ├─────────────────────────────────────┤
  │  FOOTER: CR# | address | email |    │
  │  phone | legal & medical disclaimers│
  └─────────────────────────────────────┘
"""

from __future__ import annotations

import base64
import io
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

GENERATED_DIR = Path("backend/generated")
GENERATED_DIR.mkdir(parents=True, exist_ok=True)

# ──────────────────────────────────────────────
# Legal disclaimer text (Saudi Electronic Transactions Law)
# ──────────────────────────────────────────────
LEGAL_DISCLAIMER_EN = (
    "This document is electronically generated and signed in accordance with the Saudi "
    "Electronic Transactions Law (Resolution No. M/18, 1428H)."
)
MEDICAL_CONFIDENTIALITY_EN = (
    "This document contains confidential medical information protected under the Saudi Health "
    "Information and Privacy Regulations.  Unauthorized disclosure is prohibited."
)

# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_payload(data: Optional[Dict[str, Any]], kwargs: Dict[str, Any]) -> Dict[str, Any]:
    payload: Dict[str, Any] = dict(data or {})
    payload.update(kwargs)
    if not payload.get("discharge_case_id"):
        payload["discharge_case_id"] = payload.get("order_id") or _utc_now().strftime("%Y%m%d%H%M%S")
    return payload


@dataclass
class TenantBranding:
    """Tenant legal identity used in document header/footer."""
    facility_name: str = "WathiqCare Medical Facility"
    moh_license: str = ""
    cr_number: str = ""
    city: str = ""
    address: str = ""
    po_box: str = ""
    postal_code: str = ""
    contact_email: str = ""
    contact_phone: str = ""
    logo_data: Optional[bytes] = field(default=None, repr=False)  # raw PNG/JPEG bytes

    @classmethod
    def from_payload(cls, payload: Dict[str, Any]) -> "TenantBranding":
        logo_data: Optional[bytes] = None
        raw_logo = payload.get("tenant_logo")
        if raw_logo:
            try:
                # Strip data URI prefix if present
                if "," in raw_logo:
                    raw_logo = raw_logo.split(",", 1)[1]
                logo_data = base64.b64decode(raw_logo)
            except Exception:
                logo_data = None

        return cls(
            facility_name=payload.get("tenant_name") or payload.get("facility_name") or "WathiqCare Medical Facility",
            moh_license=payload.get("moh_license") or "",
            cr_number=payload.get("cr_number") or "",
            city=payload.get("city") or "",
            address=payload.get("address") or "",
            po_box=payload.get("po_box") or "",
            postal_code=payload.get("postal_code") or "",
            contact_email=payload.get("contact_email") or "",
            contact_phone=payload.get("contact_phone") or "",
            logo_data=logo_data,
        )


# ──────────────────────────────────────────────
# Page layout constants (mm → points auto-conversion via reportlab)
# ──────────────────────────────────────────────
MARGIN_L = 18 * mm
MARGIN_R = 18 * mm
MARGIN_TOP = 10 * mm
MARGIN_BOT = 32 * mm   # tall footer area

HEADER_HEIGHT = 28 * mm
FOOTER_HEIGHT = 28 * mm

LINE_HEIGHT_SM = 5.5 * mm
LINE_HEIGHT_MD = 7 * mm

PAGE_W, PAGE_H = A4


# ──────────────────────────────────────────────
# Drawing helpers
# ──────────────────────────────────────────────

def _draw_hline(c: canvas.Canvas, y: float, *, width: float | None = None, color=colors.HexColor("#94a3b8")) -> None:
    c.setStrokeColor(color)
    c.setLineWidth(0.5)
    x1 = MARGIN_L
    x2 = (width or PAGE_W) - MARGIN_R
    c.line(x1, y, x2, y)


def _draw_header(c: canvas.Canvas, branding: TenantBranding, doc_title: str, payload: Dict[str, Any]) -> float:
    """Draw facility header; returns the Y position just below the separator line."""
    y_top = PAGE_H - MARGIN_TOP

    # ── Logo (if available) ──────────────────────────────────
    logo_x = MARGIN_L
    logo_w = 22 * mm
    logo_h = 22 * mm
    if branding.logo_data:
        try:
            img = ImageReader(io.BytesIO(branding.logo_data))
            c.drawImage(img, logo_x, y_top - logo_h, width=logo_w, height=logo_h, preserveAspectRatio=True, mask="auto")
        except Exception:
            pass  # silently skip broken logo

    # ── Facility info (center column) ────────────────────────
    cx = MARGIN_L + logo_w + 4 * mm
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.drawString(cx, y_top - 7 * mm, branding.facility_name)

    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#475569"))
    y_info = y_top - 12 * mm
    if branding.moh_license:
        c.drawString(cx, y_info, f"MOH License: {branding.moh_license}")
        y_info -= LINE_HEIGHT_SM

    # ── Document title + meta (right column) ─────────────────
    right_x = PAGE_W - MARGIN_R
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(colors.HexColor("#1e293b"))
    c.drawRightString(right_x, y_top - 7 * mm, doc_title)

    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#64748b"))
    generated_at = _utc_now().strftime("%Y-%m-%d %H:%M UTC")
    case_id = payload.get("discharge_case_id", "")
    c.drawRightString(right_x, y_top - 12 * mm, f"Date: {generated_at}")
    if case_id:
        c.drawRightString(right_x, y_top - 17 * mm, f"Case ID: {case_id}")

    # Separator
    sep_y = y_top - HEADER_HEIGHT
    _draw_hline(c, sep_y, color=colors.HexColor("#334155"))

    return sep_y - 4 * mm  # usable body Y start


def _draw_footer(c: canvas.Canvas, branding: TenantBranding, page_num: int = 1) -> None:
    """Draw legal footer at the bottom of the page."""
    foot_y = MARGIN_BOT

    _draw_hline(c, foot_y + 24 * mm, color=colors.HexColor("#334155"))

    c.setFont("Helvetica", 7)
    c.setFillColor(colors.HexColor("#475569"))

    # Row 1 — facility identity
    parts = []
    if branding.cr_number:
        parts.append(f"CR: {branding.cr_number}")
    if branding.address:
        parts.append(branding.address)
    if branding.city:
        parts.append(branding.city)
    if branding.po_box:
        parts.append(f"PO Box {branding.po_box}")
    if branding.postal_code:
        parts.append(f"Postal: {branding.postal_code}")
    row1 = "  |  ".join(parts) if parts else branding.facility_name
    c.drawString(MARGIN_L, foot_y + 20 * mm, row1)

    # Row 2 — contact
    contact_parts = []
    if branding.contact_email:
        contact_parts.append(f"Email: {branding.contact_email}")
    if branding.contact_phone:
        contact_parts.append(f"Tel: {branding.contact_phone}")
    if contact_parts:
        c.drawString(MARGIN_L, foot_y + 15 * mm, "  |  ".join(contact_parts))

    # Row 3 — legal disclaimer
    c.setFont("Helvetica-Oblique", 6.5)
    c.setFillColor(colors.HexColor("#64748b"))
    c.drawString(MARGIN_L, foot_y + 10 * mm, LEGAL_DISCLAIMER_EN)

    # Row 4 — confidentiality
    c.drawString(MARGIN_L, foot_y + 5.5 * mm, MEDICAL_CONFIDENTIALITY_EN)

    # Page number
    c.setFont("Helvetica", 7)
    c.setFillColor(colors.HexColor("#94a3b8"))
    c.drawRightString(PAGE_W - MARGIN_R, foot_y + 5 * mm, f"Page {page_num}")


def _draw_section_title(c: canvas.Canvas, y: float, title: str) -> float:
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(colors.HexColor("#1e293b"))
    c.drawString(MARGIN_L, y, title)
    _draw_hline(c, y - 2 * mm, color=colors.HexColor("#e2e8f0"))
    return y - LINE_HEIGHT_MD


def _draw_field(c: canvas.Canvas, y: float, label: str, value: str) -> float:
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(colors.HexColor("#64748b"))
    c.drawString(MARGIN_L, y, label + ":")

    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#0f172a"))
    c.drawString(MARGIN_L + 55 * mm, y, value or "—")
    return y - LINE_HEIGHT_SM


def _draw_signature_block(c: canvas.Canvas, y: float, payload: Dict[str, Any]) -> float:
    """Draw patient + physician + witness signature fields with timestamp."""
    y = _draw_section_title(c, y, "SIGNATURES & ACKNOWLEDGMENT")

    sig_items = [
        ("Patient / Legal Representative", payload.get("patient_signature") or ""),
        ("Attending Physician", payload.get("physician_signature") or ""),
        ("Witness", payload.get("witness_signature") or ""),
    ]

    sig_line_w = 70 * mm
    col1_x = MARGIN_L
    col2_x = col1_x + 90 * mm

    for i, (role, sig_value) in enumerate(sig_items):
        col_x = col1_x if i % 2 == 0 else col2_x
        if i == 2:
            col_x = col1_x

        c.setFont("Helvetica", 7.5)
        c.setFillColor(colors.HexColor("#475569"))
        c.drawString(col_x, y, role)

        if sig_value:
            # Render stored signature text / hash
            c.setFont("Courier", 8)
            c.setFillColor(colors.HexColor("#0f172a"))
            display = sig_value[:60] + ("..." if len(sig_value) > 60 else "")
            c.drawString(col_x, y - LINE_HEIGHT_SM, display)
        else:
            c.setStrokeColor(colors.HexColor("#94a3b8"))
            c.setLineWidth(0.5)
            c.line(col_x, y - LINE_HEIGHT_SM - 1 * mm, col_x + sig_line_w, y - LINE_HEIGHT_SM - 1 * mm)

        if i % 2 == 1 or i == 2:
            y -= LINE_HEIGHT_MD * 2

    # Timestamp + device metadata
    y -= 2 * mm
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#64748b"))
    signed_at = payload.get("signed_at") or _utc_now().isoformat()
    c.drawString(MARGIN_L, y, f"Timestamp: {signed_at}")
    ip_device = payload.get("ip_address") or payload.get("device_id")
    if ip_device:
        c.drawString(MARGIN_L, y - LINE_HEIGHT_SM, f"Device / IP: {ip_device}")
        y -= LINE_HEIGHT_SM
    y -= LINE_HEIGHT_SM

    _draw_hline(c, y - 1 * mm)
    return y - LINE_HEIGHT_MD


# ──────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────

def generate_discharge_refusal_pdf(data: Optional[Dict[str, Any]] = None, **kwargs: Any) -> str:
    """
    Generate a court-ready A4 discharge refusal PDF.

    Arguments:
        data   — dict with payload keys (merged with **kwargs)
        kwargs — individual key=value overrides

    Returns the absolute path string of the generated file.
    """
    payload = _normalize_payload(data, kwargs)
    branding = TenantBranding.from_payload(payload)

    filename = f"refusal_{payload['discharge_case_id']}.pdf"
    filepath = GENERATED_DIR / filename

    c = canvas.Canvas(str(filepath), pagesize=A4)
    page_num = 1

    # ── PAGE 1 ──────────────────────────────────────────────────────────
    y = _draw_header(c, branding, "Medical Discharge Refusal Form", payload)

    # Case Information
    y = _draw_section_title(c, y, "CASE INFORMATION")
    for label, key in [
        ("Tenant Code", "tenant_code"),
        ("Patient MRN", "patient_mrn"),
        ("Patient Name", "patient_name"),
        ("User Email", "user_email"),
        ("Discharge Case ID", "discharge_case_id"),
        ("Status", "status"),
    ]:
        y = _draw_field(c, y, label, str(payload.get(key) or ""))
        if y < MARGIN_BOT + FOOTER_HEIGHT + 10 * mm:
            _draw_footer(c, branding, page_num)
            c.showPage()
            page_num += 1
            y = _draw_header(c, branding, "Medical Discharge Refusal Form (cont.)", payload)

    y -= 3 * mm

    # Refusal Reason
    y = _draw_section_title(c, y, "REFUSAL REASON")
    c.setFont("Helvetica", 9)
    c.setFillColor(colors.HexColor("#0f172a"))
    refusal_reason = payload.get("refusal_reason") or ""
    max_chars = 110
    lines: list[str] = []
    words = refusal_reason.split()
    current_line = ""
    for word in words:
        test = (current_line + " " + word).strip()
        if len(test) <= max_chars:
            current_line = test
        else:
            if current_line:
                lines.append(current_line)
            current_line = word
    if current_line:
        lines.append(current_line)

    for text_line in lines:
        c.drawString(MARGIN_L, y, text_line)
        y -= LINE_HEIGHT_SM
        if y < MARGIN_BOT + FOOTER_HEIGHT + 10 * mm:
            _draw_footer(c, branding, page_num)
            c.showPage()
            page_num += 1
            y = _draw_header(c, branding, "Medical Discharge Refusal Form (cont.)", payload)

    y -= 3 * mm

    # Signer Information
    y = _draw_section_title(c, y, "SIGNER INFORMATION")
    for label, key in [
        ("Signer Name", "signer_name"),
        ("Signer Role", "signer_role"),
        ("Signed At", "signed_at"),
        ("Signature Method", "signature_method"),
        ("Signature Text", "signature_text"),
    ]:
        y = _draw_field(c, y, label, str(payload.get(key) or ""))

    y -= 3 * mm

    # Acknowledgment text
    y = _draw_section_title(c, y, "ACKNOWLEDGMENT")
    c.setFont("Helvetica", 8.5)
    c.setFillColor(colors.HexColor("#1e293b"))
    ack_lines = [
        "The patient refused discharge after receiving medical advice regarding the care plan,",
        "benefits, risks of continued hospitalization, and available alternatives.",
        "This PDF is generated by WathiqCare as part of the legal-medical evidence workflow.",
    ]
    for ack_line in ack_lines:
        c.drawString(MARGIN_L, y, ack_line)
        y -= LINE_HEIGHT_SM

    y -= 4 * mm

    # Signature block
    if y < MARGIN_BOT + FOOTER_HEIGHT + 55 * mm:
        _draw_footer(c, branding, page_num)
        c.showPage()
        page_num += 1
        y = _draw_header(c, branding, "Medical Discharge Refusal Form — Signatures", payload)

    _draw_signature_block(c, y, payload)

    _draw_footer(c, branding, page_num)
    c.showPage()
    c.save()

    return str(filepath)

