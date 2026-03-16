"""
test_workflow.py
----------------
pytest-based test suite for the WathiqCare Discharge Refusal Module.

Covers:
- Clinical discharge decision workflow (DischargeEngine)
- Legal escalation lifecycle (EscalationEngine)
- Digital refusal form & electronic signatures (RefusalFormService)
- EMR / FHIR integration layer (FHIRBuilder, InMemoryEMRConnector)
- Audit log chain integrity and role-based access control (AuditLogger)
"""

from __future__ import annotations

import base64

import pytest

from backend.audit.audit_logger import AuditLogger, UserRole
from backend.core.discharge_engine import DischargeEngine, DischargeStatus
from backend.forms.refusal_form import FormStatus, RefusalFormService
from backend.integration.emr_connector import FHIRBuilder, InMemoryEMRConnector
from backend.legal.escalation_engine import EscalationEngine, EscalationTier


# ===========================================================================
# Helpers
# ===========================================================================

VALID_CODE = "BA00"
PATIENT_ID = "P-001"
PHYSICIAN_ID = "DR-042"
_SIG = base64.b64encode(b"sample-signature-data").decode()


# ===========================================================================
# Discharge Engine
# ===========================================================================


class TestDischargeEngine:
    def _engine(self):
        return DischargeEngine()

    def test_create_order_valid_codes(self):
        engine = self._engine()
        order = engine.create_discharge_order(
            patient_id=PATIENT_ID,
            physician_id=PHYSICIAN_ID,
            diagnosis_codes=[VALID_CODE],
            discharge_notes="Stable for discharge.",
        )
        assert order.patient_id == PATIENT_ID
        assert order.status == DischargeStatus.ORDERED

    def test_record_refusal(self):
        engine = self._engine()
        order = engine.create_discharge_order(
            patient_id=PATIENT_ID,
            physician_id=PHYSICIAN_ID,
            diagnosis_codes=[VALID_CODE],
        )
        refusal = engine.record_patient_refusal(
            order_id=order.order_id,
            patient_id=PATIENT_ID,
            reason="Needs home care arrangement.",
        )
        assert refusal.order_id == order.order_id
        assert engine.get_order(order.order_id).status == DischargeStatus.REFUSED

    def test_record_refusal_wrong_patient_raises(self):
        engine = self._engine()
        order = engine.create_discharge_order(
            patient_id=PATIENT_ID,
            physician_id=PHYSICIAN_ID,
            diagnosis_codes=[VALID_CODE],
        )
        with pytest.raises(ValueError, match="Patient ID does not match"):
            engine.record_patient_refusal(
                order_id=order.order_id,
                patient_id="WRONG-PATIENT",
                reason="Test",
            )

    def test_get_order_not_found_raises(self):
        engine = self._engine()
        with pytest.raises(KeyError):
            engine.get_order("non-existent-id")

    def test_update_order_status(self):
        engine = self._engine()
        order = engine.create_discharge_order(
            patient_id=PATIENT_ID,
            physician_id=PHYSICIAN_ID,
            diagnosis_codes=[VALID_CODE],
        )
        updated = engine.update_order_status(order.order_id, DischargeStatus.ESCALATED)
        assert updated.status == DischargeStatus.ESCALATED


# ===========================================================================
# Legal Escalation Engine
# ===========================================================================


class TestEscalationEngine:
    def _open_case(self, engine: EscalationEngine) -> object:
        return engine.open_case(
            order_id="ord-001",
            refusal_id="ref-001",
            patient_id=PATIENT_ID,
            physician_id=PHYSICIAN_ID,
        )

    def test_open_case_creates_initial_entry(self):
        engine = EscalationEngine()
        case = self._open_case(engine)
        assert case.tier == EscalationTier.INITIAL
        assert len(case.tier_history) == 1

    def test_escalate_24h(self):
        engine = EscalationEngine()
        case = self._open_case(engine)
        updated = engine.escalate(case.case_id, EscalationTier.TIER_24H)
        assert updated.tier == EscalationTier.TIER_24H

    def test_escalate_skips_tier_allowed(self):
        """Skipping a tier (INITIAL → 48H) should be allowed."""
        engine = EscalationEngine()
        case = self._open_case(engine)
        updated = engine.escalate(case.case_id, EscalationTier.TIER_48H)
        assert updated.tier == EscalationTier.TIER_48H

    def test_backward_escalation_raises(self):
        engine = EscalationEngine()
        case = self._open_case(engine)
        engine.escalate(case.case_id, EscalationTier.TIER_48H)
        with pytest.raises(ValueError, match="only forward escalation"):
            engine.escalate(case.case_id, EscalationTier.TIER_24H)

    def test_resolve_case(self):
        engine = EscalationEngine()
        case = self._open_case(engine)
        resolved = engine.resolve_case(case.case_id, resolution_notes="Patient accepted.")
        assert resolved.tier == EscalationTier.RESOLVED
        assert "accepted" in resolved.resolution_notes

    def test_notifications_dispatched(self):
        received: list = []
        engine = EscalationEngine(notify_callback=received.append)
        case = self._open_case(engine)
        engine.escalate(case.case_id, EscalationTier.TIER_24H)
        assert len(received) == 2  # INITIAL + TIER_24H

    def test_generate_refusal_documentation(self):
        engine = EscalationEngine()
        case = self._open_case(engine)
        engine.attach_document(case.case_id, "doc-ref-001")
        doc = engine.generate_refusal_documentation(case.case_id)
        assert doc["document_type"] == "DISCHARGE_REFUSAL_PACKAGE"
        assert "doc-ref-001" in doc["documents"]

    def test_withdraw_case(self):
        engine = EscalationEngine()
        case = self._open_case(engine)
        withdrawn = engine.withdraw_case(case.case_id)
        assert withdrawn.tier == EscalationTier.WITHDRAWN


# ===========================================================================
# Digital Refusal Form
# ===========================================================================


class TestRefusalFormService:
    def _svc(self):
        return RefusalFormService()

    def test_create_form(self):
        svc = self._svc()
        form = svc.create_form(
            order_id="ord-001",
            patient_id=PATIENT_ID,
            reason_for_refusal="Family not present.",
        )
        assert form.status == FormStatus.DRAFT
        assert form.patient_id == PATIENT_ID

    def test_full_lifecycle(self):
        svc = self._svc()
        form = svc.create_form("ord-001", PATIENT_ID, "Reason A")
        svc.add_patient_signature(form.form_id, PATIENT_ID, _SIG)
        assert svc.get_form(form.form_id).status == FormStatus.SIGNED
        svc.add_witness_signature(form.form_id, "NRS-007", _SIG)
        assert svc.get_form(form.form_id).status == FormStatus.WITNESSED
        svc.complete_form(form.form_id)
        assert svc.get_form(form.form_id).status == FormStatus.COMPLETED

    def test_patient_signature_invalid_base64_raises(self):
        svc = self._svc()
        form = svc.create_form("ord-001", PATIENT_ID, "Reason A")
        with pytest.raises(ValueError, match="base-64"):
            svc.add_patient_signature(form.form_id, PATIENT_ID, "not-base64!!!")

    def test_witness_before_patient_signature_raises(self):
        svc = self._svc()
        form = svc.create_form("ord-001", PATIENT_ID, "Reason B")
        with pytest.raises(ValueError, match="SIGNED first"):
            svc.add_witness_signature(form.form_id, "NRS-007", _SIG)

    def test_void_form(self):
        svc = self._svc()
        form = svc.create_form("ord-001", PATIENT_ID, "Reason C")
        svc.void_form(form.form_id)
        assert svc.get_form(form.form_id).status == FormStatus.VOIDED

    def test_to_dict(self):
        svc = self._svc()
        form = svc.create_form("ord-001", PATIENT_ID, "Reason D")
        svc.add_patient_signature(form.form_id, PATIENT_ID, _SIG)
        svc.add_witness_signature(form.form_id, "NRS-007", _SIG)
        svc.complete_form(form.form_id)
        d = svc.to_dict(form.form_id)
        assert d["status"] == "COMPLETED"
        assert d["patient_signature"] is not None
        assert d["witness_signature"] is not None

    def test_electronic_signature_verify(self):
        from backend.forms.refusal_form import ElectronicSignature
        sig = ElectronicSignature(signer_id="P-001", signer_role="PATIENT", signature_data=_SIG)
        assert sig.verify() is True


# ===========================================================================
# EMR / FHIR Integration
# ===========================================================================


class TestFHIRBuilder:
    def test_build_patient(self):
        p = FHIRBuilder.build_patient("P-001", name="Test Patient")
        assert p["resourceType"] == "Patient"
        assert p["id"] == "P-001"

    def test_build_service_request(self):
        sr = FHIRBuilder.build_service_request(
            order_id="ord-001",
            patient_id=PATIENT_ID,
            physician_id=PHYSICIAN_ID,
            diagnosis_codes=[VALID_CODE],
        )
        assert sr["resourceType"] == "ServiceRequest"
        assert len(sr["reasonCode"]) == 1

    def test_build_communication(self):
        comm = FHIRBuilder.build_communication(
            case_id="case-001",
            patient_id=PATIENT_ID,
            reason="Does not want to leave.",
        )
        assert comm["resourceType"] == "Communication"

    def test_build_consent(self):
        consent = FHIRBuilder.build_consent(form_id="form-001", patient_id=PATIENT_ID)
        assert consent["resourceType"] == "Consent"
        assert consent["status"] == "rejected"


class TestInMemoryEMRConnector:
    def test_push_and_list_records(self):
        connector = InMemoryEMRConnector()
        sr = FHIRBuilder.build_service_request(
            "ord-001", PATIENT_ID, PHYSICIAN_ID, [VALID_CODE]
        )
        result = connector.push_discharge_order(sr)
        assert result["status"] == "accepted"
        records = connector.list_records("ServiceRequest")
        assert len(records) == 1

    def test_push_communication(self):
        connector = InMemoryEMRConnector()
        comm = FHIRBuilder.build_communication("case-001", PATIENT_ID, "Refused")
        connector.push_refusal_communication(comm)
        assert len(connector.list_records("Communication")) == 1

    def test_push_consent(self):
        connector = InMemoryEMRConnector()
        consent = FHIRBuilder.build_consent("form-001", PATIENT_ID)
        connector.push_consent(consent)
        assert len(connector.list_records("Consent")) == 1

    def test_fetch_patient_seeded(self):
        connector = InMemoryEMRConnector()
        patient = FHIRBuilder.build_patient(PATIENT_ID, name="Test")
        connector.seed_patient(patient)
        fetched = connector.fetch_patient(PATIENT_ID)
        assert fetched is not None
        assert fetched["id"] == PATIENT_ID

    def test_fetch_patient_not_found(self):
        connector = InMemoryEMRConnector()
        assert connector.fetch_patient("unknown") is None


# ===========================================================================
# Audit Logger
# ===========================================================================


class TestAuditLogger:
    def test_log_single_entry(self):
        logger = AuditLogger()
        entry = logger.log(
            actor_id=PHYSICIAN_ID,
            actor_role=UserRole.DOCTOR,
            event_category="DISCHARGE_ORDER",
            event_action="CREATE",
            resource_id="ord-001",
            resource_type="DischargeOrder",
        )
        assert entry.actor_role == "DOCTOR"
        assert entry.previous_hash == "GENESIS"
        assert logger.entry_count() == 1

    def test_chain_integrity_after_multiple_entries(self):
        logger = AuditLogger()
        for i in range(5):
            logger.log(
                actor_id=PHYSICIAN_ID,
                actor_role=UserRole.DOCTOR,
                event_category="DISCHARGE_ORDER",
                event_action="CREATE",
                resource_id=f"ord-{i:03d}",
                resource_type="DischargeOrder",
            )
        assert logger.verify_chain() is True

    def test_role_read_permission_doctor(self):
        logger = AuditLogger()
        logger.log(
            PHYSICIAN_ID, UserRole.DOCTOR, "DISCHARGE_ORDER", "CREATE", "ord-001", "DischargeOrder"
        )
        entries = logger.get_entries(UserRole.DOCTOR, event_category="DISCHARGE_ORDER")
        assert len(entries) == 1

    def test_role_read_permission_denied(self):
        logger = AuditLogger()
        logger.log(
            PHYSICIAN_ID, UserRole.DOCTOR, "DISCHARGE_ORDER", "CREATE", "ord-001", "DischargeOrder"
        )
        with pytest.raises(PermissionError):
            logger.get_entries(UserRole.NURSE, event_category="DISCHARGE_ORDER")

    def test_admin_can_read_all_categories(self):
        logger = AuditLogger()
        logger.log(
            "admin-01", UserRole.ADMIN, "SYSTEM", "STARTUP", "sys", "System"
        )
        entries = logger.get_entries(UserRole.ADMIN, event_category="SYSTEM")
        assert len(entries) == 1

    def test_filter_by_resource_id(self):
        logger = AuditLogger()
        logger.log(PHYSICIAN_ID, UserRole.DOCTOR, "DISCHARGE_ORDER", "CREATE", "ord-001", "DischargeOrder")
        logger.log(PHYSICIAN_ID, UserRole.DOCTOR, "DISCHARGE_ORDER", "CREATE", "ord-002", "DischargeOrder")
        entries = logger.get_entries(UserRole.DOCTOR, resource_id="ord-001")
        assert all(e.resource_id == "ord-001" for e in entries)

    def test_failure_outcome_logged(self):
        logger = AuditLogger()
        logger.log(
            PHYSICIAN_ID, UserRole.DOCTOR, "DISCHARGE_ORDER", "VALIDATE",
            "ord-001", "DischargeOrder", outcome="FAILURE"
        )
        entries = logger.get_entries(UserRole.DOCTOR, event_category="DISCHARGE_ORDER")
        assert entries[0].outcome == "FAILURE"


# ===========================================================================
# End-to-end workflow
# ===========================================================================


class TestEndToEndWorkflow:
    """
    Simulates a complete discharge-refusal lifecycle from physician order
    through legal escalation, form completion, EMR push, and audit logging.
    """

    def test_complete_workflow(self):
        # Initialize components
        engine = DischargeEngine()
        escalation = EscalationEngine()
        form_svc = RefusalFormService()
        connector = InMemoryEMRConnector()
        logger = AuditLogger()

        # 1. Physician creates discharge order
        order = engine.create_discharge_order(
            patient_id=PATIENT_ID,
            physician_id=PHYSICIAN_ID,
            diagnosis_codes=[VALID_CODE, "5A11"],
            discharge_notes="Medically fit for discharge.",
        )
        logger.log(PHYSICIAN_ID, UserRole.DOCTOR, "DISCHARGE_ORDER", "CREATE",
                   order.order_id, "DischargeOrder")

        # 2. Patient refuses
        refusal = engine.record_patient_refusal(
            order_id=order.order_id,
            patient_id=PATIENT_ID,
            reason="Awaiting family.",
            nurse_id="NRS-007",
        )
        logger.log("NRS-007", UserRole.NURSE, "REFUSAL_RECORD", "CREATE",
                   refusal.refusal_id, "RefusalRecord")

        assert order.status == DischargeStatus.REFUSED

        # 3. Legal case opened
        case = escalation.open_case(
            order_id=order.order_id,
            refusal_id=refusal.refusal_id,
            patient_id=PATIENT_ID,
            physician_id=PHYSICIAN_ID,
        )
        logger.log("legal-01", UserRole.LEGAL_OFFICER, "LEGAL_CASE", "OPEN",
                   case.case_id, "LegalCaseFile")

        # 4. Digital refusal form collected
        form = form_svc.create_form(
            order_id=order.order_id,
            patient_id=PATIENT_ID,
            reason_for_refusal="Awaiting family.",
            nurse_id="NRS-007",
        )
        form_svc.add_patient_signature(form.form_id, PATIENT_ID, _SIG)
        form_svc.add_witness_signature(form.form_id, "NRS-007", _SIG)
        form_svc.complete_form(form.form_id)
        assert form.status == FormStatus.COMPLETED
        logger.log("NRS-007", UserRole.NURSE, "REFUSAL_FORM", "COMPLETE",
                   form.form_id, "RefusalForm")

        # 5. Push to EMR/HIS
        sr = FHIRBuilder.build_service_request(
            order_id=order.order_id,
            patient_id=PATIENT_ID,
            physician_id=PHYSICIAN_ID,
            diagnosis_codes=[VALID_CODE, "5A11"],
        )
        connector.push_discharge_order(sr)
        comm = FHIRBuilder.build_communication(case.case_id, PATIENT_ID, "Patient refused.")
        connector.push_refusal_communication(comm)
        consent = FHIRBuilder.build_consent(form.form_id, PATIENT_ID)
        connector.push_consent(consent)

        # 6. Escalation – 24h passed
        escalation.escalate(case.case_id, EscalationTier.TIER_24H)
        logger.log("legal-01", UserRole.LEGAL_OFFICER, "ESCALATION", "TIER_24H",
                   case.case_id, "LegalCaseFile")
        engine.update_order_status(order.order_id, DischargeStatus.ESCALATED)

        # 7. Case resolved
        escalation.resolve_case(case.case_id, resolution_notes="Patient accepted after family meeting.")
        engine.update_order_status(order.order_id, DischargeStatus.RESOLVED)
        logger.log("legal-01", UserRole.LEGAL_OFFICER, "LEGAL_CASE", "RESOLVE",
                   case.case_id, "LegalCaseFile")

        # 8. Verify audit integrity
        assert logger.verify_chain() is True
        assert logger.entry_count() == 6

        # 9. EMR records
        assert len(connector.list_records()) == 3
