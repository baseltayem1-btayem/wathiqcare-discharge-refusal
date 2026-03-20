from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict


def stable_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


class EvidenceBundleBuilder:
    def __init__(self, base_dir: Path | None = None):
        self._base_dir = base_dir or Path("backend/generated/signature_evidence")
        self._base_dir.mkdir(parents=True, exist_ok=True)

    def build(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        canonical = json.dumps(payload, sort_keys=True, ensure_ascii=True)
        bundle = {
            **payload,
            "bundle_generated_at": datetime.now(timezone.utc).isoformat(),
            "bundle_hash": stable_hash(canonical),
        }
        return bundle

    def persist(self, *, case_id: str, session_id: str, evidence: Dict[str, Any]) -> str:
        case_dir = self._base_dir / case_id
        case_dir.mkdir(parents=True, exist_ok=True)
        output_path = case_dir / f"evidence_{session_id}.json"
        output_path.write_text(
            json.dumps(evidence, indent=2, ensure_ascii=True),
            encoding="utf-8",
        )
        return str(output_path)
