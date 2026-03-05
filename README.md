# WathiqCare Discharge Refusal Module

A Python-based backend that manages cases where a patient refuses discharge
after a physician's medical decision.  It covers the full lifecycle from
clinical order capture through legal escalation, digital consent collection,
audit logging, and hospital-system integration.

---

## Features

| Component | Description |
|---|---|
| **Clinical workflow** | Capture physician discharge orders, record patient refusals, validate ICD-11 diagnosis codes |
| **Legal escalation** | Automatically generate legal case files with 24 h / 48 h / 72 h escalation timeline |
| **Digital refusal forms** | Patient refusal form with witness confirmation and electronic signature support |
| **EMR / FHIR integration** | FHIR R4-compatible resource builders; abstract EMR/HIS connector interface |
| **Audit & compliance** | Immutable, hash-chained audit log; PDPL-compliant logging; role-based access control |

---

## Project Structure

```
wathiqcare-discharge-refusal/
├── backend/
│   ├── core/discharge_engine.py       # Clinical discharge decision workflow
│   ├── legal/escalation_engine.py     # Legal escalation engine
│   ├── forms/refusal_form.py          # Digital consent & refusal form module
│   ├── icd11/validator.py             # ICD-11 diagnosis code validator
│   ├── integration/emr_connector.py   # EMR/HIS & FHIR integration layer
│   └── audit/audit_logger.py          # Immutable audit log & PDPL compliance
├── config/
│   └── rules.yaml                     # Operational configuration
├── docs/
│   └── architecture.md                # Architecture documentation
├── tests/
│   └── test_workflow.py               # pytest test suite
└── README.md
```

---

## Quick Start

### Prerequisites

* Python 3.10+
* [pytest](https://pytest.org/) (`pip install pytest`)

### Run Tests

```bash
pytest tests/ -v
```

---

## Configuration

Copy `config/rules.yaml` to your deployment environment and adjust the
settings for ICD-11 validation mode, escalation timelines, audit backend,
role permissions, and EMR connector.

---

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for a detailed description
of every component, the data flow, and security/compliance notes.

---

## Roles

| Role | Capabilities |
|---|---|
| `DOCTOR` | Create discharge orders; view discharge and refusal records |
| `NURSE` | Record refusals; manage refusal forms |
| `LEGAL_OFFICER` | Access legal cases, escalations, and documentation |
| `ADMIN` | Full access to all event categories and audit log |

---

## Security & Compliance

* **PDPL (Saudi Personal Data Protection Law)**: only opaque identifiers are
  stored in the audit log; no PII in free-text fields.
* **Tamper evidence**: SHA-256 hash chain in `AuditLogger`; verifiable with
  `AuditLogger.verify_chain()`.
* **Electronic signatures**: base-64 encoded with SHA-256 integrity checksum.
* **ICD-11**: strict offline validation by default; extensible to the WHO
  live API.
