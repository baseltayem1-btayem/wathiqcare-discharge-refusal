"""
refusal_form.py
---------------
Digital consent & refusal form module for the WathiqCare Discharge Refusal Module.

Responsibilities:
- Patient refusal form data capture and storage
- Witness confirmation
- Electronic signature support (base-64 encoded signature blobs)
"""

from __future__ import annotations

import base64
import hashlib
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional


class FormStatus(str, Enum):
    DRAFT = "DRAFT"
    SIGNED = "SIGNED"
    WITNESSED = "WITNESSED"
    COMPLETED = "COMPLETED"
    VOIDED = "VOIDED"


@dataclass
class ElectronicSignature:
    """Represents an electronic signature on a refusal form."""

    signature_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    signer_id: str = ""
    signer_role: str = ""  # e.g. "PATIENT", "WITNESS", "NURSE"
    # Base-64 encoded signature image or token
    signature_data: str = ""
    signed_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    checksum: str = ""  # SHA-256 of signature_data for integrity verification

    def __post_init__(self) -> None:
        if self.signature_data and not self.checksum:
            self.checksum = self._compute_checksum(self.signature_data)

    @staticmethod
    def _compute_checksum(data: str) -> str:
        return hashlib.sha256(data.encode()).hexdigest()

    def verify(self) -> bool:
        """Return True if the stored checksum matches the signature data."""
        return self.checksum == self._compute_checksum(self.signature_data)


@dataclass
class RefusalForm:
    """
    Digital patient discharge-refusal form.

    A form progresses through the following lifecycle:
    DRAFT → SIGNED (patient) → WITNESSED → COMPLETED
    """

    form_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str = ""
    patient_id: str = ""
    reason_for_refusal: str = ""
    additional_comments: str = ""
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    status: FormStatus = FormStatus.DRAFT
    patient_signature: Optional[ElectronicSignature] = None
    witness_signature: Optional[ElectronicSignature] = None
    nurse_id: Optional[str] = None


class RefusalFormService:
    """
    Service layer for managing digital discharge-refusal forms.

    Usage::

        svc = RefusalFormService()
        form = svc.create_form(
            order_id="ord-123",
            patient_id="P-001",
            reason_for_refusal="Awaiting family arrival.",
        )
        svc.add_patient_signature(form.form_id, "P-001", "<base64-data>")
        svc.add_witness_signature(form.form_id, "NRS-007", "<base64-data>")
        svc.complete_form(form.form_id)
    """

    def __init__(self) -> None:
        self._forms: dict[str, RefusalForm] = {}

    # ------------------------------------------------------------------
    # Form lifecycle
    # ------------------------------------------------------------------

    def create_form(
        self,
        order_id: str,
        patient_id: str,
        reason_for_refusal: str,
        additional_comments: str = "",
        nurse_id: Optional[str] = None,
    ) -> RefusalForm:
        """Create a new draft refusal form."""
        form = RefusalForm(
            order_id=order_id,
            patient_id=patient_id,
            reason_for_refusal=reason_for_refusal,
            additional_comments=additional_comments,
            nurse_id=nurse_id,
        )
        self._forms[form.form_id] = form
        return form

    def get_form(self, form_id: str) -> RefusalForm:
        """Return the form with the given ID."""
        try:
            return self._forms[form_id]
        except KeyError:
            raise KeyError(f"Refusal form not found: {form_id}") from None

    def add_patient_signature(
        self,
        form_id: str,
        patient_id: str,
        signature_data: str,
    ) -> RefusalForm:
        """
        Attach a patient electronic signature to the refusal form.

        *signature_data* should be a base-64 encoded string (image or token).
        """
        form = self.get_form(form_id)
        if form.status not in (FormStatus.DRAFT,):
            raise ValueError(
                f"Cannot add patient signature: form is in status {form.status}."
            )
        if form.patient_id != patient_id:
            raise ValueError("Patient ID does not match the form.")

        # Validate that signature_data is valid base-64
        try:
            base64.b64decode(signature_data, validate=True)
        except Exception as exc:
            raise ValueError("signature_data must be valid base-64 encoded data.") from exc

        form.patient_signature = ElectronicSignature(
            signer_id=patient_id,
            signer_role="PATIENT",
            signature_data=signature_data,
        )
        form.status = FormStatus.SIGNED
        return form

    def add_witness_signature(
        self,
        form_id: str,
        witness_id: str,
        signature_data: str,
        signer_role: str = "WITNESS",
    ) -> RefusalForm:
        """
        Attach a witness / nurse electronic signature to the refusal form.

        The form must already carry a patient signature (status SIGNED).
        """
        form = self.get_form(form_id)
        if form.status not in (FormStatus.SIGNED,):
            raise ValueError(
                f"Cannot add witness signature: form must be SIGNED first "
                f"(current status: {form.status})."
            )

        try:
            base64.b64decode(signature_data, validate=True)
        except Exception as exc:
            raise ValueError("signature_data must be valid base-64 encoded data.") from exc

        form.witness_signature = ElectronicSignature(
            signer_id=witness_id,
            signer_role=signer_role,
            signature_data=signature_data,
        )
        form.status = FormStatus.WITNESSED
        return form

    def complete_form(self, form_id: str) -> RefusalForm:
        """Mark a witnessed form as completed (all signatures collected)."""
        form = self.get_form(form_id)
        if form.status != FormStatus.WITNESSED:
            raise ValueError(
                f"Cannot complete form: must be WITNESSED first "
                f"(current status: {form.status})."
            )
        form.status = FormStatus.COMPLETED
        return form

    def void_form(self, form_id: str) -> RefusalForm:
        """Void a form (e.g. if patient later accepts discharge)."""
        form = self.get_form(form_id)
        form.status = FormStatus.VOIDED
        return form

    def to_dict(self, form_id: str) -> dict:
        """Return a serialisable dictionary representation of the form."""
        form = self.get_form(form_id)
        return {
            "form_id": form.form_id,
            "order_id": form.order_id,
            "patient_id": form.patient_id,
            "reason_for_refusal": form.reason_for_refusal,
            "additional_comments": form.additional_comments,
            "created_at": form.created_at.isoformat(),
            "status": form.status.value,
            "nurse_id": form.nurse_id,
            "patient_signature": (
                {
                    "signer_id": form.patient_signature.signer_id,
                    "signed_at": form.patient_signature.signed_at.isoformat(),
                    "checksum": form.patient_signature.checksum,
                }
                if form.patient_signature
                else None
            ),
            "witness_signature": (
                {
                    "signer_id": form.witness_signature.signer_id,
                    "signer_role": form.witness_signature.signer_role,
                    "signed_at": form.witness_signature.signed_at.isoformat(),
                    "checksum": form.witness_signature.checksum,
                }
                if form.witness_signature
                else None
            ),
        }
