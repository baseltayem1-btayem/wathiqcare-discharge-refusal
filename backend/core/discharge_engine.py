"""
discharge_engine.py
-------------------
Clinical discharge decision workflow for the WathiqCare Discharge Refusal Module.

Responsibilities:
- Capture physician discharge order
- Record patient refusal
- Capture and persist reason for refusal
- Coordinate with the ICD-11 validator for diagnosis code verification
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from backend.icd11.validator import ICD11Validator
from backend.forms.pdf_generator import generate_discharge_refusal_pdf
from backend.legal.evidence_bundle import build_discharge_refusal_bundle
class DischargeStatus(str, Enum):
    ORDERED = "ORDERED"
    REFUSED = "REFUSED"
    ACCEPTED = "ACCEPTED"
    ESCALATED = "ESCALATED"
    RESOLVED = "RESOLVED"


@dataclass
class DischargeOrder:
    """Represents a physician-issued discharge order."""

    order_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str = ""
    physician_id: str = ""
    diagnosis_codes: List[str] = field(default_factory=list)
    discharge_notes: str = ""
    ordered_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    status: DischargeStatus = DischargeStatus.ORDERED


@dataclass
class RefusalRecord:
    """Captures a patient's refusal of a discharge order."""

    refusal_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str = ""
    patient_id: str = ""
    reason: str = ""
    refused_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    witness_id: Optional[str] = None
    nurse_id: Optional[str] = None


class DischargeEngine:
    """
    Orchestrates the clinical discharge decision workflow.

    Usage::

        engine = DischargeEngine()
        order = engine.create_discharge_order(
            patient_id="P-001",
            physician_id="DR-042",
            diagnosis_codes=["XY8Z.1"],
            discharge_notes="Patient stable, ready for discharge.",
        )
        refusal = engine.record_patient_refusal(
            order_id=order.order_id,
            patient_id="P-001",
            reason="Concerned about home care support.",
        )
    """

    def __init__(self, icd11_validator: Optional[ICD11Validator] = None) -> None:
        self._validator = icd11_validator or ICD11Validator()
        self._orders: dict[str, DischargeOrder] = {}
        self._refusals: dict[str, RefusalRecord] = {}

    # ------------------------------------------------------------------
    # Discharge order management
    # ------------------------------------------------------------------

    def create_discharge_order(
        self,
        patient_id: str,
        physician_id: str,
        diagnosis_codes: List[str],
        discharge_notes: str = "",
    ) -> DischargeOrder:
        """Validate diagnosis codes and persist a new discharge order."""
        invalid = [c for c in diagnosis_codes if not self._validator.is_valid(c)]
        if invalid:
            raise ValueError(f"Invalid ICD-11 diagnosis code(s): {invalid}")

        order = DischargeOrder(
            patient_id=patient_id,
            physician_id=physician_id,
            diagnosis_codes=diagnosis_codes,
            discharge_notes=discharge_notes,
        )
        self._orders[order.order_id] = order
        return order

    def get_order(self, order_id: str) -> DischargeOrder:
        """Return the discharge order with the given ID."""
        try:
            return self._orders[order_id]
        except KeyError:
            raise KeyError(f"Discharge order not found: {order_id}") from None

    # ------------------------------------------------------------------
    # Patient refusal management
    # ------------------------------------------------------------------

    def record_patient_refusal(
        self,
        order_id: str,
        patient_id: str,
        reason: str,
        witness_id: Optional[str] = None,
        nurse_id: Optional[str] = None,
    ) -> RefusalRecord:
        """
        Record a patient's refusal of a discharge order.

        Updates the associated order status to REFUSED.
        """
        order = self.get_order(order_id)
        if order.patient_id != patient_id:
            raise ValueError("Patient ID does not match the discharge order.")

        refusal = RefusalRecord(
            order_id=order_id,
            patient_id=patient_id,
            reason=reason,
            witness_id=witness_id,
            nurse_id=nurse_id,
        )
        self._refusals[refusal.refusal_id] = refusal
       order.status = DischargeStatus.REFUSED

pdf_path = generate_discharge_refusal_pdf(
    order_id=order_id,
    patient_id=patient_id,
    physician_id=order.physician_id,
    diagnosis=order.diagnosis_code,
    refusal_reason=reason
)

refusal.pdf_path = pdf_path
build_discharge_refusal_bundle(
    order=order,
    refusal=refusal,
    pdf_path=refusal.pdf_path
)
return refusall

    def get_refusal(self, refusal_id: str) -> RefusalRecord:
        """Return the refusal record with the given ID."""
        try:
            return self._refusals[refusal_id]
        except KeyError:
            raise KeyError(f"Refusal record not found: {refusal_id}") from None

    def update_order_status(self, order_id: str, status: DischargeStatus) -> DischargeOrder:
        """Update the status of an existing discharge order."""
        order = self.get_order(order_id)
        order.status = status
        return order
