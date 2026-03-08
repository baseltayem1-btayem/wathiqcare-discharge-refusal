from __future__ import annotations

import base64
import hashlib
from datetime import datetime, timezone

from backend.signature.acknowledgment_engine import AcknowledgmentMethod


class TabletSignatureProvider:
    method = AcknowledgmentMethod.TABLET_SIGNATURE

    def is_available(self) -> bool:
        return True

    def availability_reason(self) -> str | None:
        return None

    def capture_signature(self, *, signature_payload: str, witness_name: str | None, operator_id: str | None) -> dict:
        if not signature_payload:
            raise ValueError("Signature payload is required")

        try:
            base64.b64decode(signature_payload, validate=True)
        except Exception as exc:
            raise ValueError("Signature payload must be base64-encoded") from exc

        return {
            "verified": True,
            "signature_hash": hashlib.sha256(signature_payload.encode("utf-8")).hexdigest(),
            "signed_at": datetime.now(timezone.utc).isoformat(),
            "witness_name": witness_name,
            "operator_id": operator_id,
            "device_source": "TABLET",
        }
