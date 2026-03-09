from dataclasses import dataclass


@dataclass
class ProcedureProfile:
    code: str
    high_risk: bool = False
    requires_anesthesia: bool = False
    requires_blood_products: bool = False
    service_model: str | None = None


class ProcedureMappingService:
    """In-memory mapping service used as safe fallback in local/staging."""

    def map_procedure(self, code: str) -> ProcedureProfile:
        normalized = code.strip().upper()
        if normalized.startswith("SRG"):
            return ProcedureProfile(
                code=normalized,
                high_risk=True,
                requires_anesthesia=True,
                service_model="inpatient",
            )
        return ProcedureProfile(code=normalized)
