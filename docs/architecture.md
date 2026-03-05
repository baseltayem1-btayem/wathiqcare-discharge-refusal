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
