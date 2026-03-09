from __future__ import annotations

from typing import Any

from .document_generator import DocumentGenerator


class ConsentEngine:
    """Additive consent engine for production SaaS module layer."""

    @staticmethod
    def execute(*, payload: dict[str, Any], actor_user_id: str, signature_method: str, signature_record: str, ip_address: str | None, device_info: str | None):
        return DocumentGenerator.generate(
            template_key="roi_authorization",
            title="Patient Consent Document",
            payload=payload,
            actor_user_id=actor_user_id,
            signature_method=signature_method,
            signature_record=signature_record,
            ip_address=ip_address,
            device_info=device_info,
        )
