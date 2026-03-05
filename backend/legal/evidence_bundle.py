from __future__ import annotations

import json
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any

BUNDLE_DIR = Path("backend/generated/bundles")
BUNDLE_DIR.mkdir(parents=True, exist_ok=True)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_discharge_refusal_bundle(
    order: Any,
    refusal: Any,
    pdf_path: str | None = None,
) -> Dict[str, Any]:
    """
    Creates a legal evidence bundle for a discharge refusal case.
    Bundle includes:
      - summary.json (structured facts)
      - refusal pdf (if available)
    Returns bundle manifest dict.
    """

    bundle_id = f"bundle_{getattr(order, 'order_id', 'unknown')}"
    bundle_path = BUNDLE_DIR / bundle_id
    bundle_path.mkdir(parents=True, exist_ok=True)

    # Build a structured summary
    payload: Dict[str, Any] = {
        "bundle_id": bundle_id,
        "generated_at": _utc_now_iso(),
        "case_type": "DISCHARGE_REFUSAL",
        "order": asdict(order) if hasattr(order, "__dataclass_fields__") else dict(order),
        "refusal": asdict(refusal) if hasattr(refusal, "__dataclass_fields__") else dict(refusal),
        "artifacts": {
            "refusal_pdf": None,
        },
    }

    # Copy/Reference PDF if exists
    if pdf_path:
        src = Path(pdf_path)
        if src.exists():
            dst = bundle_path / src.name
            # copy bytes
            dst.write_bytes(src.read_bytes())
            payload["artifacts"]["refusal_pdf"] = str(dst)

    # Write summary.json
    summary_file = bundle_path / "summary.json"
    summary_file.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    # Write manifest.json (optional, but useful)
    manifest_file = bundle_path / "manifest.json"
    manifest_file.write_text(json.dumps({
        "bundle_id": bundle_id,
        "bundle_path": str(bundle_path),
        "summary": str(summary_file),
        "generated_at": payload["generated_at"],
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    return payload
