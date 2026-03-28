_case_store = None
_case_store_lock = None
from backend.audit.audit_logger import AuditLogger
from backend.services.pdf.legal_case_package_pdf import generate_legal_case_pdf
from datetime import datetime, timedelta

# Simulated imports for patient info, signatures, documents, etc.
# In real system, import actual services or DB accessors

def build_case_package(case_id, tenant_id, case_store, case_store_lock):
    with case_store_lock:
        case = case_store.get(case_id)
    if not case:
        raise ValueError(f"Case {case_id} not found")

    # Simulate patient info, signatures, documents
    patient_info = {
        "mrn": case.get("mrn"),
        "name": "John Doe",
        "dob": "1980-01-01",
        "gender": "M"
    }
    signatures = [
        {"role": "DOCTOR", "name": case.get("physician"), "signed_at": case.get("created_at")}
    ]
    documents = [
        {"type": "refusal_form", "url": f"/docs/{case_id}/refusal.pdf"}
    ]

    # Simulate audit log timeline (in real: query audit logger)
    audit_logger = AuditLogger()  # In real: use shared instance
    timeline = []
    # For demo, fake timeline from case creation and escalation
    timeline.append({
        "timestamp": case.get("created_at"),
        "action": "CASE_CREATED",
        "actor": case.get("physician"),
        "role": "DOCTOR",
        "metadata": {"diagnosis": case.get("diagnosis")}
    })
    if case.get("escalation_level"):
        timeline.append({
            "timestamp": case.get("escalation_timestamp"),
            "action": "ESCALATED",
            "actor": "system",
            "role": "ADMIN",
            "metadata": {"level": case.get("escalation_level")}
        })

    # Legal classification
    legal_classification = "STANDARD"
    if case.get("escalation_level") and case.get("escalation_timestamp"):
        # Simulate 24h check
        created = datetime.fromisoformat(case["created_at"])
        escalated = datetime.fromisoformat(case["escalation_timestamp"])
        if (escalated - created) >= timedelta(hours=24):
            legal_classification = "URGENT"
        else:
            legal_classification = "COMPLEX"
    elif case.get("status") == "formal_refusal":
        legal_classification = "COMPLEX"

    package = {
        "case": case,
        "patient_info": patient_info,
        "signatures": signatures,
        "documents": documents,
        "timeline": sorted(timeline, key=lambda x: x["timestamp"]),
        "legal_classification": legal_classification,
        "version": 1,
        "generated_at": datetime.utcnow().isoformat(),
        "generated_by": "system"
    }
    return package
