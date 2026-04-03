"""Case orchestration layer that composes existing engines without modifying them."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Mapping, Optional

from backend.audit.audit_logger import AuditLogger, UserRole
from backend.core.discharge_engine import DischargeEngine
from backend.forms.refusal_form import RefusalFormService
from backend.legal.escalation_engine import EscalationEngine, EscalationTier
from backend.workflow.workflow_registry import WorkflowRegistry, WorkflowState


@dataclass
class OrchestratedCase:
    case_id: str
    patient_data: Dict[str, Any]
    discharge_order_input: Dict[str, Any]
    order_id: str
    created_at: datetime
    updated_at: datetime
    state: WorkflowState = WorkflowState.CASE_CREATED
    state_history: List[WorkflowState] = field(default_factory=lambda: [WorkflowState.CASE_CREATED])
    refusal_id: Optional[str] = None
    legal_case_id: Optional[str] = None
    refusal_form_id: Optional[str] = None


class CaseOrchestrator:
    """Coordinates discharge, legal escalation, documentation, and audit events."""

    def __init__(
        self,
        discharge_engine: Optional[DischargeEngine] = None,
        escalation_engine: Optional[EscalationEngine] = None,
        refusal_form_service: Optional[RefusalFormService] = None,
        audit_logger: Optional[AuditLogger] = None,
        workflow_registry: Optional[WorkflowRegistry] = None,
    ) -> None:
        self._discharge = discharge_engine or DischargeEngine()
        self._escalation = escalation_engine or EscalationEngine()
        self._forms = refusal_form_service or RefusalFormService()
        self._audit = audit_logger or AuditLogger()
        self._registry = workflow_registry or WorkflowRegistry()
        self._cases: Dict[str, OrchestratedCase] = {}

    def create_case(self, patient_data: Mapping[str, Any], discharge_order: Mapping[str, Any]) -> Dict[str, Any]:
        """Initialize a discharge refusal case and create discharge order via DischargeEngine."""

        patient_id = str(patient_data.get("patient_id", "")).strip()
        physician_id = str(discharge_order.get("physician_id", "")).strip()
        diagnosis_codes = list(discharge_order.get("diagnosis_codes", []))
        discharge_notes = str(discharge_order.get("discharge_notes", ""))

        if not patient_id:
            raise ValueError("patient_data.patient_id is required")
        if not physician_id:
            raise ValueError("discharge_order.physician_id is required")
        if not diagnosis_codes:
            raise ValueError("discharge_order.diagnosis_codes is required")

        order = self._discharge.create_discharge_order(
            patient_id=patient_id,
            physician_id=physician_id,
            diagnosis_codes=diagnosis_codes,
            discharge_notes=discharge_notes,
        )

        now = datetime.now(timezone.utc)
        case_id = str(uuid.uuid4())
        case = OrchestratedCase(
            case_id=case_id,
            patient_data=dict(patient_data),
            discharge_order_input=dict(discharge_order),
            order_id=order.order_id,
            created_at=now,
            updated_at=now,
        )

        self._advance_state(case, WorkflowState.DISCHARGE_ORDERED)
        self._cases[case_id] = case

        self._audit.log(
            actor_id=physician_id,
            actor_role=UserRole.DOCTOR,
            event_category="LEGAL_CASE",
            event_action="CASE_CREATED",
            resource_id=case_id,
            resource_type="CaseOrchestrator",
            details=f"order_id={order.order_id}",
        )

        return self._to_dict(case)

    def record_refusal(self, case_id: str, refusal_data: Mapping[str, Any]) -> Dict[str, Any]:
        """Call DischargeEngine for refusal recording and generate refusal form."""

        case = self._get_case(case_id)
        patient_id = str(case.patient_data.get("patient_id", "")).strip()
        reason = str(refusal_data.get("reason", "")).strip()
        witness_id = refusal_data.get("witness_id")
        nurse_id = refusal_data.get("nurse_id")

        if not reason:
            raise ValueError("refusal_data.reason is required")

        refusal = self._discharge.record_patient_refusal(
            order_id=case.order_id,
            patient_id=patient_id,
            reason=reason,
            witness_id=str(witness_id) if witness_id else None,
            nurse_id=str(nurse_id) if nurse_id else None,
        )

        case.refusal_id = refusal.refusal_id
        self._advance_state(case, WorkflowState.REFUSAL_RECORDED)

        form = self._forms.create_form(
            order_id=case.order_id,
            patient_id=patient_id,
            reason_for_refusal=reason,
            additional_comments=str(refusal_data.get("additional_comments", "")),
            nurse_id=str(nurse_id) if nurse_id else None,
        )
        case.refusal_form_id = form.form_id

        self._audit.log(
            actor_id=str(nurse_id or "SYSTEM"),
            actor_role=UserRole.NURSE,
            event_category="REFUSAL_RECORD",
            event_action="REFUSAL_RECORDED",
            resource_id=case.case_id,
            resource_type="CaseOrchestrator",
            details=f"refusal_id={refusal.refusal_id}; form_id={form.form_id}",
        )

        if bool(refusal_data.get("social_review")):
            self._advance_state(case, WorkflowState.SOCIAL_REVIEW)

        if bool(refusal_data.get("trigger_escalation")):
            tier_value = str(refusal_data.get("escalation_tier", EscalationTier.TIER_24H.value)).strip()
            tier = EscalationTier(tier_value)
            self.escalate_case(case_id=case_id, tier=tier)

        return self._to_dict(case)

    def escalate_case(self, case_id: str, tier: EscalationTier = EscalationTier.TIER_24H) -> Dict[str, Any]:
        """Call EscalationEngine and transition workflow state."""

        case = self._get_case(case_id)
        patient_id = str(case.patient_data.get("patient_id", "")).strip()
        physician_id = str(case.discharge_order_input.get("physician_id", "")).strip()

        if not case.refusal_id:
            raise ValueError("Cannot escalate case before refusal is recorded")

        if not case.legal_case_id:
            legal_case = self._escalation.open_case(
                order_id=case.order_id,
                refusal_id=case.refusal_id,
                patient_id=patient_id,
                physician_id=physician_id,
            )
            case.legal_case_id = legal_case.case_id

        if tier != EscalationTier.INITIAL:
            self._escalation.escalate(case.legal_case_id, tier)

        self._advance_state(case, WorkflowState.ESCALATION_TRIGGERED)
        self._advance_state(case, WorkflowState.LEGAL_REVIEW)

        self._audit.log(
            actor_id="SYSTEM",
            actor_role=UserRole.LEGAL_OFFICER,
            event_category="ESCALATION",
            event_action=f"ESCALATED_{tier.value}",
            resource_id=case.case_id,
            resource_type="CaseOrchestrator",
            details=f"legal_case_id={case.legal_case_id}",
        )

        return self._to_dict(case)

    def generate_documents(self, case_id: str) -> Dict[str, Any]:
        """Use refusal_form module and escalation package generation."""

        case = self._get_case(case_id)
        if not case.refusal_form_id:
            raise ValueError("Refusal form has not been generated yet")

        refusal_form = self._forms.to_dict(case.refusal_form_id)
        legal_package = (
            self._escalation.generate_refusal_documentation(case.legal_case_id)
            if case.legal_case_id
            else None
        )

        self._audit.log(
            actor_id="SYSTEM",
            actor_role=UserRole.ADMIN,
            event_category="REFUSAL_DOCUMENTATION",
            event_action="GENERATE",
            resource_id=case.case_id,
            resource_type="CaseOrchestrator",
            details=f"form_id={case.refusal_form_id}",
        )

        return {
            "case_id": case.case_id,
            "refusal_form": refusal_form,
            "legal_package": legal_package,
        }

    def _get_case(self, case_id: str) -> OrchestratedCase:
        try:
            return self._cases[case_id]
        except KeyError:
            raise KeyError(f"Case not found: {case_id}") from None

    def _advance_state(self, case: OrchestratedCase, target: WorkflowState) -> None:
        self._registry.ensure_transition(case.state, target)
        case.state = target
        case.state_history.append(target)
        case.updated_at = datetime.now(timezone.utc)

    @staticmethod
    def _to_dict(case: OrchestratedCase) -> Dict[str, Any]:
        return {
            "case_id": case.case_id,
            "order_id": case.order_id,
            "state": case.state.value,
            "state_history": [item.value for item in case.state_history],
            "refusal_id": case.refusal_id,
            "legal_case_id": case.legal_case_id,
            "refusal_form_id": case.refusal_form_id,
            "patient_data": dict(case.patient_data),
            "discharge_order": dict(case.discharge_order_input),
            "created_at": case.created_at.isoformat(),
            "updated_at": case.updated_at.isoformat(),
        }
