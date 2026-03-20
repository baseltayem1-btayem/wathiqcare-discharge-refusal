from __future__ import annotations

from dataclasses import dataclass
from typing import List

CARE_TYPES = ["nursing", "equipment", "family_caregiver_training"]
CARE_PROVIDERS = ["family", "private_nurse", "home_care_company"]
EQUIPMENT_ITEMS = ["oxygen", "portable_ventilator", "hospital_bed", "suction_device"]


@dataclass
class HomeCarePlan:
    care_type: str
    equipment_required: List[str]
    care_provider: str


def validate_homecare_plan(plan: HomeCarePlan) -> None:
    if plan.care_type not in CARE_TYPES:
        raise ValueError("Unsupported care type")

    if plan.care_provider not in CARE_PROVIDERS:
        raise ValueError("Unsupported care provider")

    unsupported = [item for item in plan.equipment_required if item not in EQUIPMENT_ITEMS]
    if unsupported:
        raise ValueError(f"Unsupported equipment: {', '.join(unsupported)}")
