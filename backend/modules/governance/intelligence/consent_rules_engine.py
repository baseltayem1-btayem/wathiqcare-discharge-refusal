from dataclasses import dataclass


@dataclass
class RuleResult:
    code: str
    required: bool
    reason: str


class ConsentRulesEngine:
    def evaluate_high_risk(self, high_risk: bool) -> RuleResult:
        return RuleResult(
            code="SURGERY_INVASIVE",
            required=high_risk,
            reason="Procedure classified as high risk" if high_risk else "Not high risk",
        )

    def evaluate_anesthesia(self, anesthesia: bool) -> RuleResult:
        return RuleResult(
            code="SEDATION_ANESTHESIA",
            required=anesthesia,
            reason="Anesthesia/sedation involved" if anesthesia else "No anesthesia",
        )

    def evaluate_blood(self, blood_products: bool) -> RuleResult:
        return RuleResult(
            code="BLOOD_TRANSFUSION",
            required=blood_products,
            reason="Blood products involved" if blood_products else "No blood products",
        )
