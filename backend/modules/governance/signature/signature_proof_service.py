from dataclasses import dataclass
from datetime import datetime, timezone

from .providers.sms_otp_provider import SmsOtpProvider
from .providers.nafath_provider import NafathProvider
from .providers.tablet_signature_provider import TabletSignatureProvider


@dataclass
class SignatureProofResult:
    method: str
    status: str
    summary: dict
    verified_at: datetime | None = None


class SignatureProofService:
    def __init__(self) -> None:
        self.sms = SmsOtpProvider()
        self.nafath = NafathProvider()
        self.tablet = TabletSignatureProvider()

    def start_sms(self, mobile_number: str) -> SignatureProofResult:
        session = self.sms.send_otp(mobile_number)
        return SignatureProofResult(
            method="SMS_OTP",
            status="pending",
            summary={
                "reference": session.reference,
                "phone_masked": session.phone_masked,
            },
        )

    def verify_sms(self, expected_code: str, provided_code: str) -> SignatureProofResult:
        verified = self.sms.verify(expected_code, provided_code)
        return SignatureProofResult(
            method="SMS_OTP",
            status="verified" if verified else "failed",
            summary={"verified": verified},
            verified_at=datetime.now(timezone.utc) if verified else None,
        )

    def start_nafath(self, user_identifier: str) -> SignatureProofResult:
        return SignatureProofResult(
            method="NAFATH",
            status="pending",
            summary=self.nafath.start(user_identifier),
        )

    def capture_tablet(self, signature_data_url: str) -> SignatureProofResult:
        capture = self.tablet.capture(signature_data_url)
        return SignatureProofResult(
            method="TABLET",
            status="signed",
            summary=capture,
            verified_at=datetime.now(timezone.utc),
        )
