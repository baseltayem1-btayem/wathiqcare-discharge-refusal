from dataclasses import dataclass


@dataclass
class SmsOtpSession:
    reference: str
    code: str
    phone_masked: str


class SmsOtpProvider:
    """Safe provider for local/staging; uses deterministic mock code by default."""

    def send_otp(self, mobile_number: str) -> SmsOtpSession:
        masked = "*" * max(0, len(mobile_number) - 4) + mobile_number[-4:]
        return SmsOtpSession(reference="otp-mock", code="123456", phone_masked=masked)

    def verify(self, expected_code: str, provided_code: str) -> bool:
        return expected_code == provided_code
