from __future__ import annotations

from dataclasses import dataclass

DEPARTMENTS = ["respiratory_therapy", "physical_therapy", "occupational_therapy"]
REQUEST_STATUSES = ["pending", "approved", "unavailable"]


@dataclass
class EquipmentRequest:
    requested_equipment: str
    department: str
    status: str = "pending"


def validate_equipment_request(request: EquipmentRequest) -> None:
    if not request.requested_equipment.strip():
        raise ValueError("Requested equipment is required")

    if request.department not in DEPARTMENTS:
        raise ValueError("Unsupported department")

    if request.status not in REQUEST_STATUSES:
        raise ValueError("Unsupported status")


def requires_temporary_approval(status: str) -> bool:
    return status == "unavailable"
