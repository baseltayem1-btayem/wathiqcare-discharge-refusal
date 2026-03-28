from fastapi import APIRouter, Query, Depends
from backend.models.case_repository import CaseRepository
from backend.adapters.trakcare_adapter import TrakCareAdapter
from backend.services.imc_workflow_mapping_service import IMCWorkflowMappingService
from backend.api.deps import require_roles

router = APIRouter()

@router.get("/cases")
def get_legal_cases(
    ready_for_legal: bool = Query(None),
    package_generated: bool = Query(None),
    current_user=Depends(require_roles("legal", "legal_admin", "legal_officer", "admin", "platform_admin")),
):
    repo = CaseRepository()
    adapter = TrakCareAdapter()
    workflow = IMCWorkflowMappingService()
    cases = repo.list_cases()
    results = []
    for case in cases:
        # Load real legal package metadata
        meta_path = f"/tmp/legal_packages/{case['id']}.json"
        try:
            import json
            with open(meta_path) as f:
                legal_package_meta = json.load(f)
        except Exception:
            legal_package_meta = {}
        encounter = adapter.get_encounter(case["mrn"])
        # Prefer patient_name from TrakCareAdapter.get_patient
        patient_info = adapter.get_patient(case["mrn"])
        mapping = workflow.derive_fields(case, legal_package_meta, encounter)
        # Overwrite mapping fields with real metadata if present
        if legal_package_meta:
            mapping["legal_package_generated"] = True
            mapping["legal_package_version"] = legal_package_meta.get("version")
            mapping["last_generated_at"] = legal_package_meta.get("generated_at")
            mapping["pushed_to_trakcare"] = legal_package_meta.get("pushed_to_trakcare", False)
            if legal_package_meta.get("pushed_to_trakcare"):
                mapping["workflow_stage"] = "pushed_to_trakcare"
            else:
                mapping["workflow_stage"] = "package_generated"
        row = {
            "case_id": case["id"],
            "case_number": case.get("case_number"),
            "mrn": case["mrn"],
            "patient_name": patient_info.get("patient_name") or encounter.get("patient_name") or case["mrn"],
            "physician": case["physician"],
            "status": case["status"],
            **mapping
        }
        if ready_for_legal is not None and row["ready_for_legal"] != ready_for_legal:
            continue
        if package_generated is not None and row["legal_package_generated"] != package_generated:
            continue
        results.append(row)
    return results
