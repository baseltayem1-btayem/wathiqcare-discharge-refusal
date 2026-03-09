from dataclasses import dataclass, field
from typing import List


@dataclass
class ConsentContext:
    high_risk: bool = False
    anesthesia: bool = False
    blood_products: bool = False
    service_model: str | None = None
    release_request_submitted: bool = False
    capacity_status: str | None = None
    signed_codes: List[str] = field(default_factory=list)
    expired_codes: List[str] = field(default_factory=list)


@dataclass
class ConsentRecommendation:
    required_consents: List[str]
    recommended_consents: List[str]
    missing_consents: List[str]
    expired_consents: List[str]


class ConsentIntelligenceEngine:
    def recommend(self, context: ConsentContext) -> ConsentRecommendation:
        required = {"GENERAL_TREATMENT"}
        recommended = {"ADMISSION"}

        if context.high_risk:
            required.add("SURGERY_INVASIVE")
        if context.anesthesia:
            required.add("SEDATION_ANESTHESIA")
        if context.blood_products:
            required.add("BLOOD_TRANSFUSION")

        service_model = (context.service_model or "").lower()
        if "home" in service_model:
            required.add("HOME_HEALTHCARE")
        if "transfer" in service_model or "extended" in service_model:
            required.add("SPECIAL_PROCEDURE")

        capacity = (context.capacity_status or "").upper()
        if capacity in {"MINOR", "LACKS_CAPACITY"}:
            required.add("GUARDIAN_AUTHORIZATION")

        if context.release_request_submitted:
            required.add("ROI_AUTH")

        missing = [code for code in required if code not in set(context.signed_codes)]

        return ConsentRecommendation(
            required_consents=sorted(required),
            recommended_consents=sorted(recommended),
            missing_consents=sorted(missing),
            expired_consents=sorted(context.expired_codes),
        )
