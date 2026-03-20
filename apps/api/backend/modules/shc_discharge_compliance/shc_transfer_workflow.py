from __future__ import annotations

from dataclasses import dataclass


@dataclass
class TransferRequest:
    receiving_hospital: str
    transfer_reason: str
    medical_stability_confirmation: bool


def validate_transfer_request(request: TransferRequest) -> None:
    if not request.receiving_hospital.strip():
        raise ValueError("Receiving hospital is required")
    if not request.transfer_reason.strip():
        raise ValueError("Transfer reason is required")
    if request.medical_stability_confirmation is not True:
        raise ValueError("Medical stability confirmation is required")
