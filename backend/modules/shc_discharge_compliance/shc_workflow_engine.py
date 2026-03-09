from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Literal, Optional

from backend.modules.shc_discharge_compliance.shc_equipment_request import (
    EquipmentRequest,
    requires_temporary_approval,
    validate_equipment_request,
)
from backend.modules.shc_discharge_compliance.shc_financial_liability import (
    build_financial_liability_payload,
)
from backend.modules.shc_discharge_compliance.shc_forms_generator import (
    build_equipment_request,
    build_financial_liability_notice,
    build_homecare_agreement,
    build_patient_rights_acknowledgment,
    build_refusal_of_discharge,
    build_transfer_authorization,
)
from backend.modules.shc_discharge_compliance.shc_homecare_workflow import (
    HomeCarePlan,
    validate_homecare_plan,
)
from backend.modules.shc_discharge_compliance.shc_transfer_workflow import (
    TransferRequest,
    validate_transfer_request,
)

Alternative = Literal["home_care", "transfer_hospital", "financial_responsibility"]
SignatureMethod = Literal["sms_otp", "nafath", "tablet_signature"]


@dataclass
class SHCWorkflowInput:
    case_id: str
    tenant_id: str
    user_id: str
    patient_name: str
    patient_id_number: str
    medical_record_number: str
    room_number: str
    attending_physician: str
    discharge_status: Literal["accept_discharge", "refuse_discharge"]
    discharge_alternative: Optional[Alternative] = None
    homecare_plan: Optional[HomeCarePlan] = None
    transfer_request: Optional[TransferRequest] = None
    financial_acknowledgment: Optional[Dict[str, str]] = None
    equipment_request: Optional[EquipmentRequest] = None
    signature_method: Optional[SignatureMethod] = None
    signature_device: Optional[str] = None
    ip_address: Optional[str] = None


@dataclass
class SHCDischargeComplianceEngine:
    audit_events: List[Dict[str, object]] = field(default_factory=list)

    def _utc_now(self) -> datetime:
        return datetime.now(timezone.utc)

    def _audit(self, *, case_id: str, action: str, details: Dict[str, object]) -> None:
        self.audit_events.append(
            {
                "case_id": case_id,
                "action": action,
                "details": details,
                "timestamp": self._utc_now().isoformat(),
            }
        )

    def _signature_hash(self, payload: Dict[str, str]) -> str:
        encoded = json.dumps(payload, sort_keys=True, ensure_ascii=True).encode("utf-8")
        return hashlib.sha256(encoded).hexdigest()

    def run(self, data: SHCWorkflowInput) -> Dict[str, object]:
        generated_forms: Dict[str, str] = {}
        context = {
            "patient_name": data.patient_name,
            "patient_id_number": data.patient_id_number,
            "medical_record_number": data.medical_record_number,
            "room_number": data.room_number,
            "attending_physician": data.attending_physician,
            "discharge_decision_at": self._utc_now().isoformat(),
        }

        # Patient rights acknowledgment is generated at case creation.
        generated_forms["patient_rights_acknowledgment"] = build_patient_rights_acknowledgment(
            data.case_id,
            context,
        )

        if data.discharge_status == "accept_discharge":
            self._audit(
                case_id=data.case_id,
                action="shc_discharge_accepted",
                details={"decision": "accept_discharge"},
            )
            return {
                "decision": "accept_discharge",
                "forms_generated": generated_forms,
                "audit": self.audit_events,
            }

        generated_forms["refusal_of_discharge_form"] = build_refusal_of_discharge(data.case_id, context)

        if not data.discharge_alternative:
            raise ValueError("Discharge alternative is required for refusal")

        if data.discharge_alternative == "home_care":
            if not data.homecare_plan:
                raise ValueError("Home care plan is required")
            validate_homecare_plan(data.homecare_plan)
            generated_forms["home_care_agreement"] = build_homecare_agreement(
                data.case_id,
                {
                    **context,
                    "care_type": data.homecare_plan.care_type,
                    "equipment_required": ", ".join(data.homecare_plan.equipment_required),
                    "care_provider": data.homecare_plan.care_provider,
                },
            )

        if data.discharge_alternative == "transfer_hospital":
            if not data.transfer_request:
                raise ValueError("Transfer request is required")
            validate_transfer_request(data.transfer_request)
            generated_forms["transfer_authorization"] = build_transfer_authorization(
                data.case_id,
                {
                    **context,
                    "receiving_hospital": data.transfer_request.receiving_hospital,
                    "transfer_reason": data.transfer_request.transfer_reason,
                    "medical_stability_confirmation": str(
                        data.transfer_request.medical_stability_confirmation
                    ),
                },
            )

        if data.discharge_alternative == "financial_responsibility":
            financial_payload = build_financial_liability_payload(context)
            generated_forms["financial_liability_notice"] = build_financial_liability_notice(
                data.case_id,
                {**context, **financial_payload},
            )

        equipment_outcome: Dict[str, object] | None = None
        if data.equipment_request:
            validate_equipment_request(data.equipment_request)
            request_path, temporary_approval = build_equipment_request(
                data.case_id,
                {
                    **context,
                    "requested_equipment": data.equipment_request.requested_equipment,
                    "department": data.equipment_request.department,
                    "status": data.equipment_request.status,
                },
            )
            equipment_outcome = {
                "request_form": request_path,
                "status": data.equipment_request.status,
                "temporary_approval": temporary_approval,
                "temporary_approval_required": requires_temporary_approval(
                    data.equipment_request.status
                ),
            }

        signature_payload = None
        if data.signature_method:
            signature_payload = {
                "method": data.signature_method,
                "timestamp": self._utc_now().isoformat(),
                "device": data.signature_device or "unknown",
                "ip_address": data.ip_address or "unknown",
            }
            signature_payload["signature_hash"] = self._signature_hash(signature_payload)

        self._audit(
            case_id=data.case_id,
            action="shc_refusal_workflow_processed",
            details={
                "decision": "refuse_discharge",
                "forms_generated": sorted(generated_forms.keys()),
                "signature_method": data.signature_method,
                "equipment_requests": equipment_outcome,
            },
        )

        self._audit(
            case_id=data.case_id,
            action="shc_escalation_to_legal",
            details={"reason": "refusal_after_stabilization", "module": "SHC"},
        )

        return {
            "decision": "refuse_discharge",
            "forms_generated": generated_forms,
            "signature": signature_payload,
            "equipment_request": equipment_outcome,
            "audit": self.audit_events,
            "escalated_to_legal": True,
        }
