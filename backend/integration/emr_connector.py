"""
emr_connector.py
----------------
Integration layer for the WathiqCare Discharge Refusal Module.

Provides:
- A FHIR-compatible data builder (R4 / HL7 FHIR structures)
- An abstract EMR/HIS connector interface for hospital system integration
- A reference in-memory implementation suitable for testing and development
"""

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# FHIR-compatible resource builders
# ---------------------------------------------------------------------------

class FHIRBuilder:
    """
    Builds FHIR R4-compatible resource dictionaries from WathiqCare domain
    objects.

    References:
        - https://www.hl7.org/fhir/R4/
    """

    @staticmethod
    def build_patient(patient_id: str, name: str = "", birth_date: str = "") -> Dict[str, Any]:
        """Build a minimal FHIR Patient resource."""
        return {
            "resourceType": "Patient",
            "id": patient_id,
            "identifier": [{"system": "urn:wathiqcare:patient", "value": patient_id}],
            "name": [{"text": name}] if name else [],
            "birthDate": birth_date,
        }

    @staticmethod
    def build_service_request(
        order_id: str,
        patient_id: str,
        physician_id: str,
        diagnosis_codes: List[str],
        notes: str = "",
        status: str = "active",
    ) -> Dict[str, Any]:
        """
        Build a FHIR ServiceRequest resource representing a discharge order.
        """
        return {
            "resourceType": "ServiceRequest",
            "id": order_id,
            "status": status,
            "intent": "order",
            "code": {
                "coding": [
                    {
                        "system": "http://snomed.info/sct",
                        "code": "308252001",
                        "display": "Discharge from hospital",
                    }
                ]
            },
            "subject": {"reference": f"Patient/{patient_id}"},
            "requester": {"reference": f"Practitioner/{physician_id}"},
            "reasonCode": [
                {
                    "coding": [
                        {"system": "http://id.who.int/icd/release/11/mms", "code": c}
                    ]
                }
                for c in diagnosis_codes
            ],
            "note": [{"text": notes}] if notes else [],
            "authoredOn": datetime.now(timezone.utc).isoformat(),
        }

    @staticmethod
    def build_communication(
        case_id: str,
        patient_id: str,
        reason: str,
        status: str = "completed",
    ) -> Dict[str, Any]:
        """
        Build a FHIR Communication resource representing the patient refusal.
        """
        return {
            "resourceType": "Communication",
            "id": str(uuid.uuid4()),
            "status": status,
            "subject": {"reference": f"Patient/{patient_id}"},
            "topic": {
                "coding": [
                    {
                        "system": "urn:wathiqcare:communication-topic",
                        "code": "discharge-refusal",
                        "display": "Patient Discharge Refusal",
                    }
                ]
            },
            "payload": [{"contentString": reason}],
            "identifier": [{"system": "urn:wathiqcare:case", "value": case_id}],
            "sent": datetime.now(timezone.utc).isoformat(),
        }

    @staticmethod
    def build_consent(
        form_id: str,
        patient_id: str,
        status: str = "rejected",
    ) -> Dict[str, Any]:
        """
        Build a FHIR Consent resource representing the signed refusal form.

        ``status="rejected"`` indicates the patient has refused the proposed
        care (discharge).
        """
        return {
            "resourceType": "Consent",
            "id": form_id,
            "status": status,
            "scope": {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/consentscope",
                        "code": "treatment",
                    }
                ]
            },
            "category": [
                {
                    "coding": [
                        {
                            "system": "http://loinc.org",
                            "code": "59284-0",
                            "display": "Consent Document",
                        }
                    ]
                }
            ],
            "patient": {"reference": f"Patient/{patient_id}"},
            "dateTime": datetime.now(timezone.utc).isoformat(),
        }


# ---------------------------------------------------------------------------
# Abstract EMR / HIS connector
# ---------------------------------------------------------------------------

class EMRConnectorBase(ABC):
    """
    Abstract base class for hospital EMR / HIS connectors.

    Subclass this to implement a real integration with a specific hospital
    information system (e.g. Epic, Cerner, Mediware).
    """

    @abstractmethod
    def push_discharge_order(self, fhir_service_request: Dict[str, Any]) -> Dict[str, Any]:
        """Send a discharge order to the EMR/HIS system."""

    @abstractmethod
    def push_refusal_communication(
        self, fhir_communication: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Record a patient refusal communication in the EMR/HIS system."""

    @abstractmethod
    def push_consent(self, fhir_consent: Dict[str, Any]) -> Dict[str, Any]:
        """Upload a signed consent/refusal document to the EMR/HIS system."""

    @abstractmethod
    def fetch_patient(self, patient_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve patient data from the EMR/HIS system."""


# ---------------------------------------------------------------------------
# In-memory EMR connector (reference implementation)
# ---------------------------------------------------------------------------

@dataclass
class _Record:
    resource_type: str
    resource_id: str
    payload: Dict[str, Any]
    stored_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class InMemoryEMRConnector(EMRConnectorBase):
    """
    In-memory reference implementation of :class:`EMRConnectorBase`.

    Suitable for development, testing, and demo environments.  All resources
    are stored in local dictionaries and are lost when the process exits.
    """

    def __init__(self) -> None:
        self._store: List[_Record] = []
        self._patients: Dict[str, Dict[str, Any]] = {}

    # ------------------------------------------------------------------
    # EMRConnectorBase implementation
    # ------------------------------------------------------------------

    def push_discharge_order(self, fhir_service_request: Dict[str, Any]) -> Dict[str, Any]:
        self._store.append(
            _Record(
                resource_type="ServiceRequest",
                resource_id=fhir_service_request.get("id", str(uuid.uuid4())),
                payload=fhir_service_request,
            )
        )
        return {"status": "accepted", "resource": fhir_service_request}

    def push_refusal_communication(
        self, fhir_communication: Dict[str, Any]
    ) -> Dict[str, Any]:
        self._store.append(
            _Record(
                resource_type="Communication",
                resource_id=fhir_communication.get("id", str(uuid.uuid4())),
                payload=fhir_communication,
            )
        )
        return {"status": "accepted", "resource": fhir_communication}

    def push_consent(self, fhir_consent: Dict[str, Any]) -> Dict[str, Any]:
        self._store.append(
            _Record(
                resource_type="Consent",
                resource_id=fhir_consent.get("id", str(uuid.uuid4())),
                payload=fhir_consent,
            )
        )
        return {"status": "accepted", "resource": fhir_consent}

    def fetch_patient(self, patient_id: str) -> Optional[Dict[str, Any]]:
        return self._patients.get(patient_id)

    # ------------------------------------------------------------------
    # Helper methods
    # ------------------------------------------------------------------

    def seed_patient(self, patient: Dict[str, Any]) -> None:
        """Pre-populate a patient record (useful in tests)."""
        self._patients[patient["id"]] = patient

    def list_records(self, resource_type: Optional[str] = None) -> List[_Record]:
        """Return stored records, optionally filtered by resource type."""
        if resource_type:
            return [r for r in self._store if r.resource_type == resource_type]
        return list(self._store)
