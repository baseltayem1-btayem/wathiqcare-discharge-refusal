from __future__ import annotations

from typing import Any

from .document_generator import DocumentGenerator


class AgreementEngine:
    """Additive agreement engine for production SaaS module layer."""

    @staticmethod
    def execute(*, payload: dict[str, Any], actor_user_id: str, signature_method: str, signature_record: str, ip_address: str | None, device_info: str | None):
        template = "medical_equipment_agreement" if payload.get("agreement_type") == "medical_equipment" else "home_care_agreement"
        return DocumentGenerator.generate(
            template_key=template,  # type: ignore[arg-type]
            title="Medico-Legal Agreement",
            payload=payload,
            actor_user_id=actor_user_id,
            signature_method=signature_method,
            signature_record=signature_record,
            ip_address=ip_address,
            device_info=device_info,
        )
