"""
discharge_engine.py
Clinical discharge workflow engine for WathiqCare.
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
from backend.audit.audit_logger import AuditLogger


# -------------------------------------------------------
# Status
# -------------------------------------------------------

class DischargeStatus(str, Enum):
    ORDERED = "ORDERED"
    REFUSED = "REFUSED"
    ACCEPTED = "ACCEPTED"
    ESCALATED = "ESCALATED"
    RESOLVED = "RESOLVED"


# -------------------------------------------------------
# Data Models
# -------------------------------------------------------

@dataclass
class DischargeOrder:
    order_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str = ""
    physician_id: str = ""
    diagnosis_codes: List[str] = field(default_factory=list)
    discharge_notes: str = ""
    ordered_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    status: DischargeStatus = DischargeStatus.ORDERED


@dataclass
class RefusalRecord:
    refusal_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str = ""
    patient_id: str = ""
    reason: str = ""
    refused_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    witness_id: Optional[str] = None
    nurse_id: Optional[str] = None
    pdf_path: Optional[str] = None


# -------------------------------------------------------
# Engine
# -------------------------------------------------------

class DischargeEngine:

    def __init__(self, icd11_validator: Optional[ICD11Validator] = None):
        self._validator = icd11_validator or ICD11Validator()

        self._orders: dict[str, DischargeOrder] = {}
        self._refusals: dict[str, RefusalRecord] = {}

        # Append-only, hash-chained audit log
        self._audit = AuditLogger()

    # ---------------------------------------------------
    # Create discharge order
    # ---------------------------------------------------

    def create_discharge_order(
        self,
        patient_id: str,
        physician_id: str,
        diagnosis_codes: List[str],
        discharge_notes: str = "",
    ) -> DischargeOrder:

        invalid = [c for c in diagnosis_codes if not self._validator.is_valid(c)]
        if invalid:
            raise ValueError(f"Invalid ICD-11 code(s): {invalid}")

        order = DischargeOrder(
            patient_id=patient_id,
            physician_id=physician_id,
            diagnosis_codes=diagnosis_codes,
            discharge_notes=discharge_notes,
        )

        self._orders[order.order_id] = order

        # Audit
        self._audit.log_event(
            event_type="discharge_order_created",
            actor_role="DOCTOR",
            actor_id=physician_id,
            patient_id=patient_id,
            order_id=order.order_id,
            refusal_id=None,
            payload={
                "diagnosis_codes": diagnosis_codes,
                "notes_len": len(discharge_notes or ""),
            },
        )

        return order

    # ---------------------------------------------------
    # Get order
    # ---------------------------------------------------

    def get_order(self, order_id: str) -> DischargeOrder:
        try:
            return self._orders[order_id]
        except KeyError:
            raise KeyError(f"Discharge order not found: {order_id}") from None

    # ---------------------------------------------------
    # Record refusal
    # ---------------------------------------------------

    def record_patient_refusal(
        self,
        order_id: str,
        patient_id: str,
        reason: str,
        witness_id: Optional[str] = None,
        nurse_id: Optional[str] = None,
    ) -> RefusalRecord:

        order = self.get_order(order_id)

        if order.patient_id != patient_id:
            raise ValueError("Patient ID mismatch.")

        refusal = RefusalRecord(
            order_id=order_id,
            patient_id=patient_id,
            reason=reason,
            witness_id=witness_id,
            nurse_id=nurse_id,
        )

        self._refusals[refusal.refusal_id] = refusal
        order.status = DischargeStatus.REFUSED

        # Audit: refusal recorded
        self._audit.log_event(
            event_type="patient_refusal_recorded",
            actor_role="NURSE" if nurse_id else "SYSTEM",
            actor_id=nurse_id or "system",
            patient_id=patient_id,
            order_id=order_id,
            refusal_id=refusal.refusal_id,
            payload={
                "reason_len": len(reason or ""),
                "has_witness": bool(witness_id),
            },
        )

        # ------------------------------------------------
        # Generate refusal PDF
        # ------------------------------------------------

        pdf_path = generate_discharge_refusal_pdf(
            order_id=order.order_id,
            patient_id=order.patient_id,
            physician_id=order.physician_id,
            diagnosis=", ".join(order.diagnosis_codes),
            refusal_reason=reason,
        )

        refusal.pdf_path = pdf_path

        # Audit: PDF generated
        self._audit.log_event(
            event_type="refusal_pdf_generated",
            actor_role="SYSTEM",
            actor_id="system",
            patient_id=patient_id,
            order_id=order_id,
            refusal_id=refusal.refusal_id,
            payload={"pdf_path": pdf_path},
        )

        # ------------------------------------------------
        # Build legal evidence bundle
        # ------------------------------------------------

        build_discharge_refusal_bundle(
            order=order,
            refusal=refusal,
            pdf_path=pdf_path,
        )

        # Audit: bundle built
        self._audit.log_event(
            event_type="legal_bundle_built",
            actor_role="SYSTEM",
            actor_id="system",
            patient_id=patient_id,
            order_id=order_id,
            refusal_id=refusal.refusal_id,
            payload={"bundle": "generated"},
        )

        return refusal

    # ---------------------------------------------------
    # Get refusal
    # ---------------------------------------------------

    def get_refusal(self, refusal_id: str) -> RefusalRecord:
        try:
            return self._refusals[refusal_id]
        except KeyError:
            raise KeyError(f"Refusal record not found: {refusal_id}") from None

    # ---------------------------------------------------
    # Update order status
    # ---------------------------------------------------

    def update_order_status(
        self,
        order_id: str,
        status: DischargeStatus
    ) -> DischargeOrder:

        order = self.get_order(order_id)
        order.status = status

        # Audit: status updated
        self._audit.log_event(
            event_type="order_status_updated",
            actor_role="SYSTEM",
            actor_id="system",
            patient_id=order.patient_id,
            order_id=order_id,
            refusal_id=None,
            payload={"new_status": status.value},
        )

        return order
