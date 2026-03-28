from datetime import datetime
import uuid

class TrakCareAdapter:
    def get_patient(self, mrn: str) -> dict:
        return {
            "mrn": mrn,
            "patient_name": f"Patient {mrn}",
            "dob": "1980-01-01",
            "gender": "M",
        }

    def get_encounter(self, mrn: str) -> dict:
        return {
            "encounter_id": f"enc-{mrn}-001",
            "encounter_type": "Inpatient",
            "admission_date": "2026-03-20",
            "discharge_date": None,
            "attending_physician": f"Dr. {mrn}",
        }

    def push_document(self, mrn: str, pdf_path: str) -> dict:
        return {
            "success": True,
            "target_system": "TrakCare",
            "document_id": str(uuid.uuid4()),
            "pushed_at": datetime.utcnow().isoformat(),
        }
