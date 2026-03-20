from __future__ import annotations

from typing import Dict

# Keep IMC legal wording aligned with existing approved policy template.
IMC_FINANCIAL_NOTICE_BODY = (
    "This is to formally notify you that despite completion of medical discharge criteria, "
    "discharge has been refused. You acknowledge that continued stay or refusal-related "
    "delay may result in financial responsibility according to applicable regulations, "
    "payer policies, and hospital policy."
)


def build_financial_liability_payload(context: Dict[str, str]) -> Dict[str, str]:
    return {
        "title": "Financial Liability Notice for Refusal of Medical Discharge",
        "policy_body": IMC_FINANCIAL_NOTICE_BODY,
        "patient_name": context.get("patient_name", ""),
        "patient_id_number": context.get("patient_id_number", ""),
        "medical_record_number": context.get("medical_record_number", ""),
        "room_number": context.get("room_number", ""),
        "attending_physician": context.get("attending_physician", ""),
        "discharge_decision_at": context.get("discharge_decision_at", ""),
    }
