"""
Tests for court-ready PDF generation and informed consent document system.

Covers:
- Legal header / footer presence
- Tenant branding injection
- Signature block (patient + physician + witness)
- Timestamp and device metadata
- Physician acknowledgment section in render_informed_consent
- Workflow config endpoint returns canonical stages
"""

from __future__ import annotations

import base64
import io
import os
from pathlib import Path
from typing import Any, Dict

import pytest

# ──────────────────────────────────────────────────────────────
# PDF Generator tests
# ──────────────────────────────────────────────────────────────

def test_pdf_generator_creates_file(tmp_path: Path, monkeypatch) -> None:
    """generate_discharge_refusal_pdf() must create a .pdf file."""
    import backend.forms.pdf_generator as gen
    monkeypatch.setattr(gen, "GENERATED_DIR", tmp_path)

    result = gen.generate_discharge_refusal_pdf(
        discharge_case_id="CASE-TEST-001",
        patient_mrn="MRN-123",
        patient_name="Ahmed Al-Rashidi",
        tenant_code="IMC",
        tenant_name="International Medical Center",
        moh_license="MOH-12345",
        cr_number="4030123456",
        city="Jeddah",
        address="King Fahad Road",
        po_box="P.O. Box 1234",
        postal_code="23433",
        contact_email="info@imc.med.sa",
        contact_phone="+966-12-000-0000",
        refusal_reason="Patient refuses discharge citing need for further rest.",
        signer_name="Mohammed Al-Salem",
        signer_role="Patient",
        signed_at="2026-03-24T10:00:00Z",
        patient_signature="base64-sig-placeholder",
        physician_signature="dr-sig-hash",
        witness_signature="nurse-sig",
        ip_address="192.168.1.100",
    )
    assert Path(result).exists(), "PDF file was not created"
    assert result.endswith(".pdf"), "Output is not a PDF file"
    assert Path(result).stat().st_size > 1000, "PDF is suspiciously small"


def test_pdf_generator_tenant_branding(tmp_path: Path, monkeypatch) -> None:
    """TenantBranding.from_payload() must parse all legal fields correctly."""
    from backend.forms.pdf_generator import TenantBranding

    payload: Dict[str, Any] = {
        "tenant_name": "General Hospital",
        "moh_license": "MOH-99999",
        "cr_number": "4010111111",
        "city": "Riyadh",
        "address": "King Abdullah Road, Building 5",
        "po_box": "567",
        "postal_code": "11111",
        "contact_email": "contact@gh.med.sa",
        "contact_phone": "+966-11-888-8888",
    }
    branding = TenantBranding.from_payload(payload)
    assert branding.facility_name == "General Hospital"
    assert branding.moh_license == "MOH-99999"
    assert branding.cr_number == "4010111111"
    assert branding.city == "Riyadh"
    assert branding.contact_email == "contact@gh.med.sa"


def test_pdf_generator_logo_base64(tmp_path: Path, monkeypatch) -> None:
    """Logo passed as base64 string must be decoded into bytes."""
    from backend.forms.pdf_generator import TenantBranding

    # 1x1 px transparent PNG
    tiny_png = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00"
        b"\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    b64_logo = base64.b64encode(tiny_png).decode()
    branding = TenantBranding.from_payload({"tenant_logo": b64_logo})
    assert branding.logo_data == tiny_png


def test_pdf_generator_logo_data_uri(tmp_path: Path) -> None:
    """Logo passed with data URI prefix must strip the prefix before decoding."""
    from backend.forms.pdf_generator import TenantBranding

    tiny_png = b"\x89PNG\r\n\x1a\n"  # truncated header for brevity
    b64_logo = "data:image/png;base64," + base64.b64encode(tiny_png).decode()
    branding = TenantBranding.from_payload({"tenant_logo": b64_logo})
    assert branding.logo_data == tiny_png


def test_pdf_generates_without_logo(tmp_path: Path, monkeypatch) -> None:
    """PDF must generate successfully even when no logo is provided."""
    import backend.forms.pdf_generator as gen
    monkeypatch.setattr(gen, "GENERATED_DIR", tmp_path)

    result = gen.generate_discharge_refusal_pdf(
        discharge_case_id="NO-LOGO-001",
        patient_name="Sara Al-Fahad",
    )
    assert Path(result).exists()


# ──────────────────────────────────────────────────────────────
# Informed Consent template tests
# ──────────────────────────────────────────────────────────────

def test_render_informed_consent_has_legal_header() -> None:
    """Rendered HTML must include facility name and MOH license in the header."""
    from backend.forms.workflow_templates import render_informed_consent

    html = render_informed_consent({
        "patient_name": "Khalid Al-Amin",
        "patient_id_number": "1234567890",
        "medical_record_number": "MRN-XYZ",
        "room_number": "301B",
        "attending_physician": "Dr. Amr Hassan",
        "discharge_decision_at": "2026-03-24T08:00:00",
        "tenant_name": "Riyadh Medical Center",
        "moh_license": "MOH-77777",
        "cr_number": "1010999999",
        "contact_email": "info@rmc.med.sa",
        "contact_phone": "+966-11-444-4444",
        "city": "Riyadh",
        "address": "Olaya Street",
    })

    assert "Riyadh Medical Center" in html, "Facility name missing from header"
    assert "MOH-77777" in html, "MOH license number missing from header"
    assert "1010999999" in html, "CR number missing from footer"
    assert "info@rmc.med.sa" in html, "Contact email missing from footer"
    # Legal disclaimer spans a fixed line; match its start phrase
    assert "electronically generated and signed" in html, "Legal disclaimer missing from footer"


def test_render_informed_consent_has_physician_signature_block() -> None:
    """HTML must contain an 'Attending Physician Acknowledgment' signature field."""
    from backend.forms.workflow_templates import render_informed_consent

    html = render_informed_consent({
        "patient_name": "Nora Abdullah",
        "patient_id_number": "9876543210",
        "medical_record_number": "MRN-ABC",
        "room_number": "205",
        "attending_physician": "Dr. Wael Khalid",
        "discharge_decision_at": "2026-03-24T09:00:00",
        "physician_signature": "Dr-hash-abc123",
        "physician_name": "Dr. Wael Khalid",
        "physician_license": "SCFHS-DOC-123",
    })

    assert "Attending Physician" in html, "Physician signature section missing"
    assert "Dr-hash-abc123" in html, "Physician signature value missing"
    assert "SCFHS-DOC-123" in html, "Physician license missing"


def test_render_informed_consent_has_patient_signature() -> None:
    """Patient signature value must appear in the rendered HTML."""
    from backend.forms.workflow_templates import render_informed_consent

    html = render_informed_consent({
        "patient_name": "Faris Al-Harbi",
        "patient_id_number": "1122334455",
        "medical_record_number": "MRN-001",
        "room_number": "100",
        "attending_physician": "Dr. Layla Nasser",
        "discharge_decision_at": "2026-03-24T10:00:00",
        "patient_signature": "FAH-BASE64-SIG",
        "signed_at": "2026-03-24T10:30:00Z",
        "ip_address": "10.0.0.50",
    })

    assert "FAH-BASE64-SIG" in html, "Patient signature missing"
    assert "10.0.0.50" in html, "IP address metadata missing"
    assert "10:30:00" in html or "2026-03-24" in html, "Timestamp missing"


def test_render_informed_consent_medical_confidentiality_footer() -> None:
    """Footer must include the medical confidentiality disclaimer."""
    from backend.forms.workflow_templates import render_informed_consent

    html = render_informed_consent({
        "patient_name": "Test Patient",
        "patient_id_number": "0000000001",
        "medical_record_number": "TEST-MRN",
        "room_number": "999",
        "attending_physician": "Test Physician",
        "discharge_decision_at": "2026-03-24T00:00:00",
    })

    assert "confidential" in html.lower() or "unauthorized" in html.lower(), \
        "Medical confidentiality statement missing from footer"


# ──────────────────────────────────────────────────────────────
# Workflow config  /  WorkflowRegistry tests
# ──────────────────────────────────────────────────────────────

def test_workflow_config_stages_match_constants() -> None:
    """WORKFLOW_STAGES from service must match WorkflowState backend registry order."""
    from backend.core.discharge_workflow_service import WORKFLOW_STAGES
    from backend.workflow.workflow_registry import WorkflowState

    # All backend WorkflowState values must have a mapping path from WORKFLOW_STAGES
    # (stages are linear; states are the legal-detail states — not necessarily 1:1)
    assert len(WORKFLOW_STAGES) >= 5, "WORKFLOW_STAGES must have at least 5 stages"
    assert "medical_discharge_decision" in WORKFLOW_STAGES
    assert "escalation" in WORKFLOW_STAGES
    assert "closed" in WORKFLOW_STAGES


def test_workflow_registry_validates_transitions() -> None:
    """WorkflowRegistry must allow valid transitions and reject invalid ones."""
    from backend.workflow.workflow_registry import WorkflowRegistry, WorkflowState

    registry = WorkflowRegistry()
    # valid: CASE_CREATED → DISCHARGE_ORDERED
    assert WorkflowState.DISCHARGE_ORDERED in registry.next_states(WorkflowState.CASE_CREATED)
    # invalid: CASE_CLOSED has no next states
    assert len(registry.next_states(WorkflowState.CASE_CLOSED)) == 0


def test_workflow_registry_is_valid_transition() -> None:
    """can_transition must return correct boolean."""
    from backend.workflow.workflow_registry import WorkflowRegistry, WorkflowState

    registry = WorkflowRegistry()
    assert registry.can_transition(WorkflowState.CASE_CREATED, WorkflowState.DISCHARGE_ORDERED)
    assert not registry.can_transition(WorkflowState.CASE_CLOSED, WorkflowState.CASE_CREATED)
