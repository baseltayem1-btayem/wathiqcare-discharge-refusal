from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal

SignatureMethod = Literal["SMS_OTP", "TABLET_SIGNATURE", "NAFATH"]


@dataclass(slots=True)
class SignatureEvidence:
    signature_record: str
    verification_timestamp: str
    verification_method: SignatureMethod
    ip_address: str | None
    device_info: str | None


class SignatureEvidenceBuilder:
    """Builds signature evidence objects for medico-legal traceability."""

    @staticmethod
    def build(
        *,
        signature_record: str,
        verification_method: SignatureMethod,
        ip_address: str | None,
        device_info: str | None,
    ) -> SignatureEvidence:
        return SignatureEvidence(
            signature_record=signature_record,
            verification_timestamp=datetime.now(timezone.utc).isoformat(),
            verification_method=verification_method,
            ip_address=ip_address,
            device_info=device_info,
        )
