from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from backend.models.financial_guarantee import FinancialGuarantee
from backend.models.financial_liability_record import FinancialLiabilityRecord


ALLOWED_GUARANTEE_TYPES = {
    "promissory_note",
    "deposit",
    "insurance_guarantee",
    "bank_guarantee",
    "corporate_undertaking",
}


class FinancialGuaranteeService:
    def __init__(self, db: Session):
        self.db = db

    def create_liability_record(
        self,
        *,
        tenant_id: str,
        patient_id: str,
        admission_id: Optional[str],
        case_id: Optional[str],
        amount: Optional[Decimal],
        currency: str,
        reason: Optional[str],
        metadata_json: Optional[Dict[str, Any]] = None,
    ) -> FinancialLiabilityRecord:
        row = FinancialLiabilityRecord(
            tenant_id=tenant_id,
            patient_id=patient_id,
            admission_id=admission_id,
            case_id=case_id,
            amount=amount,
            currency=currency,
            reason=reason,
            status="open",
            metadata_json=metadata_json,
        )
        self.db.add(row)
        self.db.flush()
        return row

    def create_guarantee(
        self,
        *,
        tenant_id: str,
        patient_id: str,
        amount: Decimal,
        currency: str,
        guarantee_type: str,
        admission_id: Optional[str] = None,
        refusal_case_id: Optional[str] = None,
        financial_liability_record_id: Optional[str] = None,
        issue_date: Optional[datetime] = None,
        expiry_date: Optional[datetime] = None,
        issuing_authority: Optional[str] = None,
        obligor: Optional[str] = None,
        status: str = "draft",
        reference_number: Optional[str] = None,
        metadata_json: Optional[Dict[str, Any]] = None,
    ) -> FinancialGuarantee:
        normalized_type = guarantee_type.strip().lower()
        if normalized_type not in ALLOWED_GUARANTEE_TYPES:
            raise ValueError("Unsupported guarantee type")

        row = FinancialGuarantee(
            tenant_id=tenant_id,
            patient_id=patient_id,
            admission_id=admission_id,
            refusal_case_id=refusal_case_id,
            financial_liability_record_id=financial_liability_record_id,
            guarantee_type=normalized_type,
            amount=amount,
            currency=currency,
            issue_date=issue_date,
            expiry_date=expiry_date,
            issuing_authority=issuing_authority,
            obligor=obligor,
            status=status,
            reference_number=reference_number,
            metadata_json=metadata_json,
        )
        self.db.add(row)
        self.db.flush()
        return row

    def list_guarantees(
        self,
        *,
        tenant_id: str,
        patient_id: Optional[str] = None,
        refusal_case_id: Optional[str] = None,
    ) -> list[FinancialGuarantee]:
        query = self.db.query(FinancialGuarantee).filter(FinancialGuarantee.tenant_id == tenant_id)
        if patient_id:
            query = query.filter(FinancialGuarantee.patient_id == patient_id)
        if refusal_case_id:
            query = query.filter(FinancialGuarantee.refusal_case_id == refusal_case_id)
        return query.order_by(FinancialGuarantee.created_at.desc()).all()
