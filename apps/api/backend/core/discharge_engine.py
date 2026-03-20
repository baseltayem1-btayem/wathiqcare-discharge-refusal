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

# إذا كان عندك AuditLogger بنفس الاسم في backend/audit/audit_logger.py
from backend.audit.audit_logger import AuditLogger, UserRole


class DischargeStatus(str, Enum):
    ORDERED = "ORDERED"
    REFUSED = "REFUSED"
    ACCEPTED = "ACCEPTED"
    ESCALATED = "ESCALATED"
    RESOLVED = "RESOLVED"


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
    bundle_path: Optional[str] = None


class DischargeEngine:
    def __init__(self, icd11_validator: Optional[ICD11Validator] = None) -> None:
        self._validator = icd11_validator or ICD11Validator()
        self._orders: dict[str, DischargeOrder] = {}
        self._refusals: dict[str, RefusalRecord] = {}

        # Audit logger (append-only, hash-chained)
        self._audit = AuditLogger()

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
        self._audit.log(
            actor_id=physician_id or "SYSTEM",
            actor_role=UserRole.DOCTOR,
            event_category="DISCHARGE_ORDER",
            event_action="CREATE",
            resource_id=order.order_id,
            resource_type="DischargeOrder",
            outcome="SUCCESS",
        )

        return order

    def get_order(self, order_id: str) -> DischargeOrder:
        try:
            return self._orders[order_id]
        except KeyError:
            raise KeyError(f"Discharge order not found: {order_id}") from None

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
            raise ValueError("Patient ID does not match the discharge order.")

        refusal = RefusalRecord(
            order_id=order_id,
            patient_id=patient_id,
            reason=reason,
            witness_id=witness_id,
            nurse_id=nurse_id,
        )
        self._refusals[refusal.refusal_id] = refusal

        # Update order status
        order.status = DischargeStatus.REFUSED

        # 1) Generate refusal PDF
        pdf_path = generate_discharge_refusal_pdf(
            order_id=order.order_id,
            patient_id=order.patient_id,
            physician_id=order.physician_id,
            diagnosis=", ".join(order.diagnosis_codes),
            refusal_reason=reason,
        )
        refusal.pdf_path = pdf_path

        # 2) Build legal evidence bundle
        bundle_path = build_discharge_refusal_bundle(
            order=order,
            refusal=refusal,
            pdf_path=pdf_path,
        )
        refusal.bundle_path = bundle_path

        # 3) Audit log (hash-chain)
        self._audit.log(
            actor_id=nurse_id or "SYSTEM",
            actor_role=UserRole.NURSE,
            event_category="REFUSAL_RECORD",
            event_action="CREATE",
            resource_id=refusal.refusal_id,
            resource_type="RefusalRecord",
            outcome="SUCCESS",
        )

        return refusal

    def get_refusal(self, refusal_id: str) -> RefusalRecord:
        try:
            return self._refusals[refusal_id]
        except KeyError:
            raise KeyError(f"Refusal record not found: {refusal_id}") from None

    def update_order_status(self, order_id: str, status: DischargeStatus) -> DischargeOrder:
        order = self.get_order(order_id)
        order.status = status

        self._audit.log(
            actor_id="SYSTEM",
            actor_role=UserRole.ADMIN,
            event_category="DISCHARGE_ORDER",
            event_action="STATUS_UPDATE",
            resource_id=order.order_id,
            resource_type="DischargeOrder",
            outcome="SUCCESS",
        )

        return order
