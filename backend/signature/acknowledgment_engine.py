from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Dict, Protocol


class AcknowledgmentMethod(str, Enum):
    SMS_OTP = "SMS_OTP"
    NAFATH = "NAFATH"
    TABLET_SIGNATURE = "TABLET_SIGNATURE"

    @classmethod
    def parse(cls, value: str) -> "AcknowledgmentMethod":
        normalized = (value or "").strip()
        aliases = {
            "sms_otp": cls.SMS_OTP,
            "SMS_OTP": cls.SMS_OTP,
            "nafath": cls.NAFATH,
            "NAFATH": cls.NAFATH,
            "tablet_signature": cls.TABLET_SIGNATURE,
            "TABLET_SIGNATURE": cls.TABLET_SIGNATURE,
        }
        method = aliases.get(normalized)
        if not method:
            raise ValueError(f"Unsupported acknowledgment method: {value}")
        return method


class SignatureMethodProvider(Protocol):
    method: AcknowledgmentMethod

    def is_available(self) -> bool:
        ...

    def availability_reason(self) -> str | None:
        ...


@dataclass(frozen=True)
class MethodAvailability:
    method: AcknowledgmentMethod
    available: bool
    label_ar: str
    reason: str | None = None


class AcknowledgmentEngine:
    def __init__(self, providers: Dict[AcknowledgmentMethod, SignatureMethodProvider]):
        self._providers = providers

    def get_provider(self, method: AcknowledgmentMethod) -> SignatureMethodProvider:
        provider = self._providers.get(method)
        if not provider:
            raise ValueError(f"Unsupported acknowledgment method: {method}")
        return provider

    def list_methods(self) -> list[MethodAvailability]:
        labels = {
            AcknowledgmentMethod.SMS_OTP: "رسالة نصية",
            AcknowledgmentMethod.NAFATH: "نفاذ",
            AcknowledgmentMethod.TABLET_SIGNATURE: "توقيع على التابلت",
        }
        methods: list[MethodAvailability] = []
        for method in AcknowledgmentMethod:
            provider = self._providers.get(method)
            if not provider:
                methods.append(
                    MethodAvailability(
                        method=method,
                        available=False,
                        label_ar=labels[method],
                        reason="Provider not registered",
                    )
                )
                continue

            methods.append(
                MethodAvailability(
                    method=method,
                    available=provider.is_available(),
                    label_ar=labels[method],
                    reason=provider.availability_reason(),
                )
            )

        return methods
