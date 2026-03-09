from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any, Literal

from .signature_evidence import SignatureEvidenceBuilder

TemplateKey = Literal[
    "refusal_of_discharge",
    "financial_liability_notice",
    "home_care_agreement",
    "medical_equipment_agreement",
    "roi_authorization",
]


@dataclass(slots=True)
class LegalEvidenceChain:
    document_hash: str
    audit_log: list[dict[str, str]]
    signature_evidence: dict[str, Any]


@dataclass(slots=True)
class GeneratedDocument:
    template_key: TemplateKey
    title: str
    final_signed_pdf_name: str
    html_preview: str
    legal_evidence_chain: LegalEvidenceChain


class DocumentGenerator:
    """Generates legally-structured document payloads for platform modules."""

    @staticmethod
    def generate(
        *,
        template_key: TemplateKey,
        title: str,
        payload: dict[str, Any],
        actor_user_id: str,
        signature_method: str,
        signature_record: str,
        ip_address: str | None,
        device_info: str | None,
    ) -> GeneratedDocument:
        serialized = json.dumps(payload, sort_keys=True).encode("utf-8")
        document_hash = hashlib.sha256(serialized).hexdigest()

        signature_evidence = SignatureEvidenceBuilder.build(
            signature_record=signature_record,
            verification_method=signature_method,  # type: ignore[arg-type]
            ip_address=ip_address,
            device_info=device_info,
        )

        chain = LegalEvidenceChain(
            document_hash=document_hash,
            audit_log=[
                {
                    "action": "document_created",
                    "at": datetime.now(timezone.utc).isoformat(),
                    "actor_user_id": actor_user_id,
                }
            ],
            signature_evidence=asdict(signature_evidence),
        )

        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        file_name = f"{template_key}_{timestamp}.pdf"

        html_preview = "\n".join(
            [
                f"<h1>{title}</h1>",
                f"<p><strong>Template:</strong> {template_key}</p>",
                f"<p><strong>Generated:</strong> {datetime.now(timezone.utc).isoformat()}</p>",
                "<pre>",
                json.dumps(payload, indent=2),
                "</pre>",
            ]
        )

        return GeneratedDocument(
            template_key=template_key,
            title=title,
            final_signed_pdf_name=file_name,
            html_preview=html_preview,
            legal_evidence_chain=chain,
        )
