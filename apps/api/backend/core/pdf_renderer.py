from __future__ import annotations

import re
import textwrap
import importlib
from pathlib import Path
from typing import Dict


class PdfRenderError(Exception):
    pass


def _html_to_text(html_content: str) -> str:
    normalized = html_content.replace("\r", " ").replace("\n", " ")
    normalized = re.sub(r"<\s*br\s*/?\s*>", "\n", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"</\s*p\s*>", "\n\n", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"</\s*div\s*>", "\n", normalized, flags=re.IGNORECASE)
    normalized = re.sub(r"<[^>]+>", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized)
    return normalized.strip()


def _render_with_reportlab(html_content: str, output_path: Path, *, title: str) -> Dict[str, str]:
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
    except Exception as exc:  # pragma: no cover - dependency import branch
        raise PdfRenderError("ReportLab PDF backend is unavailable") from exc

    text_only = _html_to_text(html_content)

    c = canvas.Canvas(str(output_path), pagesize=A4)
    _, height = A4
    x = 40
    y = height - 40

    c.setFont("Helvetica-Bold", 11)
    c.drawString(x, y, title)
    y -= 22

    c.setFont("Helvetica", 9)
    for line in textwrap.wrap(text_only, width=110):
        if y < 40:
            c.showPage()
            c.setFont("Helvetica", 9)
            y = height - 40
        c.drawString(x, y, line)
        y -= 12

    c.save()
    return {"engine": "reportlab"}


def _render_with_weasyprint(html_content: str, output_path: Path) -> Dict[str, str]:
    try:
        HTML = importlib.import_module("weasyprint").HTML
    except Exception as exc:  # pragma: no cover - dependency import branch
        raise PdfRenderError("WeasyPrint backend is unavailable") from exc

    try:
        HTML(string=html_content, base_url=str(Path.cwd())).write_pdf(str(output_path))
    except Exception as exc:  # pragma: no cover - runtime branch
        raise PdfRenderError("WeasyPrint failed to render PDF") from exc

    return {"engine": "weasyprint"}


def render_html_to_pdf(
    *,
    html_content: str,
    output_path: Path,
    title: str,
) -> Dict[str, str]:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    weasy_error = None
    try:
        return _render_with_weasyprint(html_content, output_path)
    except PdfRenderError as exc:
        weasy_error = str(exc)

    try:
        result = _render_with_reportlab(html_content, output_path, title=title)
        result["fallback_reason"] = weasy_error or "unknown"
        return result
    except PdfRenderError as exc:
        raise PdfRenderError(
            "No available PDF renderer backend. Install WeasyPrint or ensure ReportLab is installed."
        ) from exc
