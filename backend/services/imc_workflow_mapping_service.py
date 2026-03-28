from typing import Dict, Any
from datetime import datetime

class IMCWorkflowMappingService:
    @staticmethod
    def derive_fields(case: dict, legal_package_meta: dict, encounter: dict) -> Dict[str, Any]:
        ready_for_legal = case.get("status") == "escalated"
        legal_package_generated = bool(legal_package_meta)
        legal_package_version = legal_package_meta.get("version") if legal_package_meta else None
        last_generated_at = legal_package_meta.get("generated_at") if legal_package_meta else None
        pushed_to_trakcare = legal_package_meta.get("pushed_to_trakcare", False)
        workflow_stage = "draft"
        if pushed_to_trakcare:
            workflow_stage = "pushed_to_trakcare"
        elif ready_for_legal:
            workflow_stage = "ready_for_legal"
        elif legal_package_generated:
            workflow_stage = "package_generated"
        elif case.get("status") == "escalated":
            workflow_stage = "escalated"
        return {
            "ready_for_legal": ready_for_legal,
            "legal_package_generated": legal_package_generated,
            "legal_package_version": legal_package_version,
            "last_generated_at": last_generated_at,
            "encounter_id": encounter.get("encounter_id"),
            "patient_name": encounter.get("patient_name", case.get("mrn")),
            "attending_physician": encounter.get("attending_physician"),
            "workflow_stage": workflow_stage,
            "pushed_to_trakcare": pushed_to_trakcare,
        }
