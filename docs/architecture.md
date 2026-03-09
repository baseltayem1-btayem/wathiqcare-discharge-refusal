# WathiqCare Discharge Refusal Module – Architecture

## Overview

The **WathiqCare Discharge Refusal Module** is a Python-based backend that manages
cases where a patient refuses discharge after a physician's medical decision.  It
covers the full lifecycle from clinical order capture through legal escalation,
digital consent collection, audit logging, and hospital-system integration.

---

## Project Structure

```
wathiqcare-discharge-refusal/
├── backend/
│   ├── core/
│   │   └── discharge_engine.py       # Clinical discharge decision workflow
│   ├── legal/
│   │   └── escalation_engine.py      # Legal escalation engine
│   ├── forms/
│   │   └── refusal_form.py           # Digital consent & refusal form module
│   ├── icd11/
│   │   └── validator.py              # ICD-11 diagnosis code validator
│   ├── integration/
│   │   └── emr_connector.py          # EMR/HIS & FHIR integration layer
│   └── audit/
│       └── audit_logger.py           # Immutable audit log & PDPL compliance
├── config/
│   └── rules.yaml                    # Operational configuration
├── docs/
│   └── architecture.md               # This document
├── tests/
│   └── test_workflow.py              # pytest test suite
└── README.md
```

---

## Component Descriptions

### 1. Clinical Discharge Decision Workflow (`backend/core/discharge_engine.py`)

`DischargeEngine` is the central coordinator for the clinical workflow.

| Responsibility | Detail |
|---|---|
| Capture physician discharge order | `create_discharge_order()` validates ICD-11 codes and persists a `DischargeOrder` |
| Record patient refusal | `record_patient_refusal()` creates a `RefusalRecord` and transitions order status to `REFUSED` |
| Manage order lifecycle | `update_order_status()` allows status transitions (ORDERED → REFUSED → ESCALATED → RESOLVED) |

**Status lifecycle:**

```
ORDERED ──► REFUSED ──► ESCALATED ──► RESOLVED
                 └──► ACCEPTED
```

---

### 2. ICD-11 Validator (`backend/icd11/validator.py`)

`ICD11Validator` validates diagnosis codes against the WHO ICD-11 coding system.

- **Strict mode** (default): validates against a curated offline code set.
- **Non-strict mode**: validates format only (alphanumeric pattern).
- Designed to be extended with a live WHO ICD-11 API call in production.

---

### 3. Legal Escalation Engine (`backend/legal/escalation_engine.py`)

`EscalationEngine` manages the legal escalation lifecycle.

| Tier | Trigger |
|---|---|
| INITIAL | Immediately on refusal – case file generated |
| TIER_24H | 24 hours after refusal |
| TIER_48H | 48 hours after refusal |
| TIER_72H | 72 hours after refusal – final legal action |
| RESOLVED | Case closed with resolution notes |
| WITHDRAWN | Patient accepts discharge |

Key capabilities:
- `open_case()` – generate a `LegalCaseFile` automatically
- `escalate()` – advance tier with tamper-evident history
- `generate_refusal_documentation()` – produce a JSON documentation package
- Pluggable `notify_callback` for email / messaging integrations

---

### 4. Digital Consent & Refusal Form Module (`backend/forms/refusal_form.py`)

`RefusalFormService` manages the lifecycle of digital refusal forms.

**Form lifecycle:**

```
DRAFT ──► SIGNED (patient e-sig) ──► WITNESSED (witness/nurse e-sig) ──► COMPLETED
                                                                    └──► VOIDED
```

Electronic signatures are stored as base-64 encoded blobs with a SHA-256
integrity checksum.

---

### 5. EMR / HIS Integration Layer (`backend/integration/emr_connector.py`)

Provides a FHIR R4-compatible data model for interoperability with hospital
information systems.

| FHIR Resource | Usage |
|---|---|
| `Patient` | Patient identity |
| `ServiceRequest` | Discharge order |
| `Communication` | Patient refusal event |
| `Consent` | Signed refusal form |

`FHIRBuilder` constructs resource dictionaries; `EMRConnectorBase` defines the
abstract connector interface; `InMemoryEMRConnector` is the reference
implementation for testing and development.

---

### 6. Audit & Compliance (`backend/audit/audit_logger.py`)

`AuditLogger` maintains an **immutable, hash-chained** audit trail.

- Every entry links to the previous via SHA-256 (`previous_hash` / `entry_hash`).
- `verify_chain()` detects tampering across the full log.
- Role-based read access is enforced: each `UserRole` can only query event
  categories it is authorised for.
- No PII is stored in free-text fields; only opaque identifiers – PDPL compliant.

**Roles:** `DOCTOR`, `NURSE`, `LEGAL_OFFICER`, `ADMIN`

---

### 7. Case Orchestration Layer (`backend/core/case_orchestrator.py`)

`CaseOrchestrator` is an additive coordination layer that composes existing
workflow engines without changing their internal implementations.

| Orchestrator Method | Integration Points |
|---|---|
| `create_case()` | Calls `DischargeEngine.create_discharge_order()` and registers workflow state |
| `record_refusal()` | Calls `DischargeEngine.record_patient_refusal()` and `RefusalFormService.create_form()` |
| `escalate_case()` | Calls `EscalationEngine.open_case()` / `EscalationEngine.escalate()` |
| `generate_documents()` | Reads `RefusalFormService` output and optional legal documentation package |

The orchestrator writes its own append-only audit events through
`AuditLogger.log()` while preserving existing engine-level auditing.

Supporting modules:
- `backend/workflow/workflow_registry.py`: configurable state registry for
  `CASE_CREATED`, `DISCHARGE_ORDERED`, `REFUSAL_RECORDED`, `SOCIAL_REVIEW`,
  `ESCALATION_TRIGGERED`, `LEGAL_REVIEW`, and `CASE_CLOSED`.
- `backend/risk/risk_engine.py`: optional rules-based scoring (`LOW`, `MEDIUM`,
  `HIGH`, `CRITICAL`) exposed via `evaluate(case_data)`; not wired into existing
  production flows yet.

This design keeps all legacy code paths intact and backward-compatible while
enabling future orchestration-first workflows.

---

### 8. Workflow Tree UI

The case details experience now includes a **Workflow Tree UI** for discharge
refusal cases. The tree renders a structured, dropdown-driven workflow that
captures operational decisions without requiring free-text input.

Implemented stages:
- Case Created
- Risk Identified
- Discharge Planned
- Patient Refusal Recorded
- Social Review
- Administrative Escalation
- Financial Notice
- Legal Review
- Case Closed

Each step includes:
- Status badge (`Not Started`, `In Progress`, `Completed`)
- One or more constrained dropdown fields
- Local save action for UI selections

Current persistence path is intentionally low-risk and additive:
- Selections are stored in browser local storage per case ID
- Existing authentication, routing, backend engines, and deployment behavior
  remain unchanged

Future backend persistence can be added behind dedicated workflow endpoints
(`GET`/`PATCH`) while preserving the current UI contracts.

---

### 9. Login UI Aligned With Dashboard Theme

The login page now follows the same visual language as the active WathiqCare
dashboard experience:
- soft light background and rounded card surfaces
- dark navy primary action button styling
- subtle slate/cyan borders and restrained shadows
- sidebar-card inspired brand panel

The implementation is RTL-first for Arabic presentation while preserving
English support through existing i18n translation keys.

Authentication behavior is unchanged:
- same login route and submit contract (`/api/auth/login`)
- same token persistence path
- same post-login navigation behavior

The layout is responsive with a two-panel desktop composition and a stacked
mobile/tablet arrangement.

---

### 10. Patient Signature Proof Engine

The platform now includes an additive **Patient Signature Proof Engine** for
approved discharge-refusal policy documents. The implementation is intentionally
non-destructive and backward-compatible with existing workflows.

Supported acknowledgment methods:
- `SMS_OTP`
- `NAFATH`
- `TABLET_SIGNATURE`

Key backend modules:
- `backend/signature/acknowledgment_engine.py`: provider abstraction and method availability matrix
- `backend/signature/providers/sms_otp_provider.py`: SMS OTP dispatch/verify with safe stub mode
- `backend/signature/providers/nafath_provider.py`: provider-ready Nafath hook with feature/config guard
- `backend/signature/providers/tablet_signature_provider.py`: tablet signature capture + integrity hash
- `backend/signature/evidence/evidence_bundle_builder.py`: evidentiary bundle generation and persistence
- `backend/signature/signature_proof_service.py`: end-to-end orchestration (method flow, evidence, audit, final document)

Official form rendering:
- `backend/forms/discharge_refusal/template.py`
- `backend/forms/financial_responsibility/template.py`

Both wrappers reuse the existing approved template renderers from
`backend/forms/workflow_templates.py`, preserving approved policy text exactly.

Evidence bundle includes:
- case and patient identifiers already present in the workflow
- document type/version and stable content hash
- selected acknowledgment method
- timestamps (`otp_sent_at`, `otp_verified_at`, `signed_at`, `verified_at`) when applicable
- provider result summary
- staff/device/session context
- final document references (HTML/PDF path)
- linked audit event IDs

Safe fallback behavior:
- SMS remains available via stub mode when provider config is absent.
- Nafath is exposed as provider-ready; when unconfigured it returns a safe
  unavailable state without breaking routes/UI.
- Tablet signature remains available locally without external dependencies.

No existing auth/login flows, stable routes, environment files, or deployment
config files were modified for this feature.

---

### 11. Post-Discharge Legal Agreements

WathiqCare now supports an additive post-discharge legal agreement path for
home-based care planning:

- **Home Health Care (HHC) agreement generation** with dynamic case context
- **Private Duty Nursing (PDN) responsibility acknowledgment** for legal guardians
- **Caregiver training acknowledgment** as part of final consent documentation
- **Legal liability and financial responsibility transfer capture** in a signed record

New backend module:
- `backend/discharge/home_healthcare/homecare_agreement_engine.py`
- `backend/discharge/home_healthcare/homecare_agreement_template.json`
- `backend/discharge/home_healthcare/homecare_agreement_pdf.py`
- `backend/discharge/home_healthcare/homecare_workflow.py`

Post-discharge care model options now include:
- Home Medical Equipment Support
- Family Care Undertaking
- Home Health Care Agreement
- Extended Care Transfer

When **Home Health Care Agreement** is selected, the system triggers the
home-healthcare agreement workflow and supports signature verification via
`SMS_OTP`, `TABLET_SIGNATURE`, and provider-guarded `NAFATH`.

Case-level metadata persisted for this agreement includes:
- `case_id`
- `document_type = home_healthcare_agreement`
- `signature_method`
- `signed_at`
- `guardian_name`
- `guardian_id`
- `pdf_path`

Audit events include:
- `agreement_viewed`
- `agreement_sent_for_signature`
- `signature_verified`
- `pdf_generated`
- `document_attached_to_case`

This implementation is intentionally non-destructive and does not modify
existing authentication, deployment configuration, or core discharge-refusal
workflow behavior.

---

### 12. WathiqCare Governance Module

The repository now includes an additive standalone governance feature area for:

- patient-centered identity records
- consent lifecycle management
- consent intelligence recommendations
- signature proof workflows
- release of information (ROI) control flow
- archive indexing and retrieval
- template registry/versioning
- audit/compliance reporting

#### Module boundaries and coexistence

- Existing discharge refusal routes, workflow engines, and behavior are untouched.
- Governance features are isolated under dedicated namespaces and new routes.
- New data entities are additive only (no destructive schema rewrite).
- Existing login/auth flow remains unchanged and is reused by governance APIs.

#### Feature flag behavior

Governance module runtime is controlled by:

- `WATHIQCARE_GOVERNANCE_MODULE_ENABLED=true` (server/API gate)
- `NEXT_PUBLIC_WATHIQCARE_GOVERNANCE_MODULE_ENABLED=true` (UI visibility)

When disabled, governance routes return safe `404` and the main application
continues to behave exactly as before.

#### Backend governance namespaces

- `backend/modules/governance/intelligence/`
  - `consent_intelligence_engine.py`
  - `procedure_mapping_service.py`
  - `consent_rules_engine.py`
- `backend/modules/governance/signature/`
  - `signature_proof_service.py`
  - `evidence_bundle_builder.py`
  - `providers/sms_otp_provider.py`
  - `providers/nafath_provider.py`
  - `providers/tablet_signature_provider.py`
- `backend/modules/governance/archive/`
  - `archive_service.py`
  - `indexing_service.py`
  - `retrieval_service.py`
- `backend/modules/governance/patient/patient_service.py`
- `backend/modules/governance/consent/consent_service.py`
- `backend/modules/governance/roi/roi_service.py`

#### Frontend governance routes

- `/patients`, `/patients/[id]`
- `/consents`, `/consents/new`, `/consents/[id]`
- `/release-of-information`, `/release-of-information/new`, `/release-of-information/[id]`
- `/archive`
- `/cases/[id]/consents`
- `/cases/[id]/documents`
- `/templates`
- `/procedures`

#### API surface (additive)

- `GET/POST /api/v1/patients`
- `GET/PUT /api/v1/patients/{id}`
- `GET/POST /api/v1/consents`
- `GET /api/v1/consents/{id}`
- `POST /api/v1/consents/{id}/review`
- `POST /api/v1/consents/{id}/send-for-signature`
- `POST /api/v1/consents/{id}/finalize`
- `POST /api/v1/consents/{id}/revoke`
- `GET/POST /api/v1/roi`
- `GET/POST /api/v1/roi/{id}`
- `GET /api/v1/archive`
- `POST /api/v1/intelligence/consents`
- `GET /api/v1/templates`

#### Patient layer

Governance introduces a reusable patient identity table for linking consents,
ROI requests, signature evidence, and archive records across workflows.

#### Consent intelligence

Rules-based recommendation output includes:

- Required Consents
- Recommended Consents
- Missing Consents
- Expired Consents

Decision factors include high-risk procedures, anesthesia/sedation,
blood-product involvement, service model context, release requests, and
capacity/guardian paths.

#### Signature methods

Supported signature methods:

- SMS OTP (mock-safe fallback in non-configured environments)
- Nafath (feature-ready placeholder; does not break when unconfigured)
- Tablet signature capture

#### ROI workflow

ROI flow is modeled as:

`Request -> Identity Verification -> Review/Approval -> Release -> Archive`

#### Archive/indexing workflow

Finalized documents can be indexed by patient/case/form metadata and retrieved
through additive archive search filters with legal-document tagging.

#### Audit/compliance events

Governance logs additive events through the existing audit logger, including:

- `patient_created`, `patient_updated`
- `consent_created`, `consent_recommended`, `consent_sent_for_signature`
- `sms_otp_sent`, `sms_otp_verified`
- `nafath_started`, `nafath_completed`
- `tablet_signature_captured`, `consent_signed`
- `pdf_generated`, `archive_indexed`
- `roi_request_created`, `roi_identity_verified`, `roi_released`, `roi_archived`

---

## Data Flow

```
Physician
  │
  ▼
DischargeEngine.create_discharge_order()
  │  (validates ICD-11 codes via ICD11Validator)
  ▼
DischargeEngine.record_patient_refusal()
  │
  ├──► RefusalFormService.create_form()
  │        └──► add_patient_signature()
  │        └──► add_witness_signature()
  │        └──► complete_form()
  │
  ├──► EscalationEngine.open_case()
  │        └──► escalate(TIER_24H / TIER_48H / TIER_72H)
  │        └──► generate_refusal_documentation()
  │
  ├──► InMemoryEMRConnector.push_discharge_order()   (FHIR ServiceRequest)
  │    InMemoryEMRConnector.push_refusal_communication() (FHIR Communication)
  │    InMemoryEMRConnector.push_consent()           (FHIR Consent)
  │
  └──► AuditLogger.log()  (every step produces an immutable audit entry)
```

---

## Configuration

All operational parameters are controlled via `config/rules.yaml`.  See the
inline comments in that file for details on ICD-11 validation mode, escalation
timelines, audit backend, role permissions, and EMR connector settings.

---

## Testing

Run the full test suite with:

```bash
pytest tests/ -v
```

Tests are located in `tests/test_workflow.py` and cover:
- ICD-11 validation (valid/invalid codes, format vs. strict mode)
- Discharge order creation and refusal recording
- Legal escalation lifecycle
- Refusal form digital signatures
- EMR/FHIR resource building
- Audit log chain integrity and RBAC

---

## Security & Compliance

| Concern | Approach |
|---|---|
| PDPL (Saudi PDPL) | Opaque identifiers only in audit log; `mask_pii: true` in config |
| Tamper evidence | SHA-256 hash chain in `AuditLogger` |
| Role-based access | `UserRole` enum + per-role category permissions |
| Signature integrity | SHA-256 checksum per `ElectronicSignature` |
| ICD-11 accuracy | Strict offline code set; optional live WHO API |
