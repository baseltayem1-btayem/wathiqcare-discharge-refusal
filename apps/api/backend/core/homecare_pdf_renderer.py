from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path
from typing import Dict

from backend.core.pdf_renderer import PdfRenderError


def _render_with_wkhtmltopdf(*, html_content: str, output_path: Path) -> Dict[str, str]:
    html_file: Path | None = None
    try:
        with tempfile.NamedTemporaryFile("w", suffix=".html", encoding="utf-8", delete=False) as temp_html:
            temp_html.write(html_content)
            html_file = Path(temp_html.name)

        command = [
            "wkhtmltopdf",
            "--encoding",
            "utf-8",
            "--enable-local-file-access",
            str(html_file),
            str(output_path),
        ]
        result = subprocess.run(command, capture_output=True, text=True, check=False)
        if result.returncode != 0:
            stderr = (result.stderr or "").strip()
            raise PdfRenderError(f"wkhtmltopdf failed with exit code {result.returncode}: {stderr}")

        return {"engine": "wkhtmltopdf"}
    except FileNotFoundError as exc:
        raise PdfRenderError("wkhtmltopdf backend is unavailable") from exc
    finally:
        if html_file and html_file.exists():
            html_file.unlink(missing_ok=True)


def _render_with_weasyprint(*, html_content: str, output_path: Path) -> Dict[str, str]:
    try:
        from weasyprint import HTML
    except Exception as exc:  # pragma: no cover - dependency import branch
        raise PdfRenderError("WeasyPrint backend is unavailable") from exc

    try:
        HTML(string=html_content, base_url=str(Path.cwd())).write_pdf(str(output_path))
    except Exception as exc:  # pragma: no cover - runtime branch
        raise PdfRenderError("WeasyPrint failed to render PDF") from exc

    return {"engine": "weasyprint"}


def render_homecare_html_to_pdf(*, html_content: str, output_path: Path) -> Dict[str, str]:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    wkhtml_error = None
    try:
        return _render_with_wkhtmltopdf(html_content=html_content, output_path=output_path)
    except PdfRenderError as exc:
        wkhtml_error = str(exc)

    try:
        result = _render_with_weasyprint(html_content=html_content, output_path=output_path)
        result["fallback_reason"] = wkhtml_error or "unknown"
        return result
    except PdfRenderError as exc:
        raise PdfRenderError(
            "No layout-faithful PDF renderer available for Home Healthcare Agreement. "
            "Install wkhtmltopdf or WeasyPrint runtime dependencies."
        ) from exc
