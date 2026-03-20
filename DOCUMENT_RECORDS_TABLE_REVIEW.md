# DOCUMENT RECORDS TABLE REVIEW

Date: 2026-03-13
Status: Pre-validation table-level review
Scope: documents.document_records as authoritative document metadata and evidence record

Authoritative inputs applied:
- WORKFLOW_EVENT_MODEL_SPEC.md
- WORKFLOW_EVENTS_TABLE_REVIEW.md
- CORE_BACKBONE_FK_SPECIFICATION_CHECKLIST.md
- CORE_BACKBONE_ER_DIAGRAM.md
- docs/ARCHITECTURAL_DECISION_RECORD_DATABASE.md
- docs/API_TO_ENTITY_AND_DATABASE_SCHEMA_DESIGN_REPORT.md

## 1) Table Purpose

Why `documents.document_records` exists:
- To store authoritative document metadata for workflow-generated artifacts.
- To provide case/event anchored traceability for evidentiary and operational use.
- To enable retrieval, provenance, version lineage, and signature linkage without storing binary bodies in SQL Server.

Why it must store metadata only:
- Approved ADR requires metadata-only document persistence in database.
- Binary content belongs in object/blob/file storage systems.
- This avoids database bloat and supports scalability and retention governance.

Why it is not interchangeable with `workflow.workflow_events`:
- `workflow.workflow_events` is the chronological business-event stream.
- `documents.document_records` is document metadata registry tied to case/event lifecycle.
- Events describe what happened; document records describe evidence artifacts produced/managed.

Why it is not interchangeable with file/blob storage:
- File/blob storage holds the binary payload.
- `documents.document_records` holds relational metadata, linkage, integrity fields, status, and lineage controls.
- Both layers are required for complete defensibility.

## 2) Required Columns Review

| Column Name | Business Meaning | Required / Optional | Expected SQL Type | Indexing Need | Legal/Audit Note |
|---|---|---|---|---|---|
| document_id | Immutable document metadata identity | Required | uniqueidentifier | Primary key | Stable legal reference for evidence citation |
| case_id | Owning case linkage | Required | uniqueidentifier | Index with tenant/date/type patterns | No document may exist without case linkage |
| event_id | Event that triggered generation/action | Required by default policy; nullable only by approved exception | uniqueidentifier | Index for event-linked retrieval | Missing linkage requires documented exception |
| document_type_code | Controlled type classification | Required | nvarchar(64) | Index with case/status filters | Must align with approved vocabulary |
| document_status_code | Lifecycle status (draft/generated/signed/etc.) | Required | nvarchar(64) | Index for operational filtering | Governance-controlled status vocabulary |
| storage_uri OR storage_path | Pointer to external binary content | Required | nvarchar(1024) | Optional index for operational retrieval | Critical chain-of-custody pointer |
| file_name | Human/operational filename | Required | nvarchar(512) | Optional with case queries | Supports evidentiary package readability |
| mime_type | File media type | Required | nvarchar(128) | Optional for content-class reporting | Confirms expected file format |
| file_hash | Integrity fingerprint of binary artifact | Required | nvarchar(256) | Index for integrity lookup | Core tamper-detection field |
| version_no | Version lineage counter | Required | int | Composite index with case/type | Required for regenerated/amended traceability |
| generated_by_user_id | User responsible for generation action | Required (nullable only for system-generated exception) | uniqueidentifier | Index for actor review | Supports accountability and dispute analysis |
| generated_at | Generation timestamp | Required | datetime2(3) | Index for timeline/date-range queries | Required for chronology |
| signed_at | Signature completion timestamp | Optional (required when status indicates signed) | datetime2(3) | Index for signed-document reporting | Supports signature timeline evidence |
| tenant_id | Tenancy boundary key | Required | uniqueidentifier | Leading column in tenant-scoped indexes | Mandatory tenant boundary enforcement |

## 3) Recommended Optional Columns Review

| Column Name | Value Contribution | Expected SQL Type | Nullability Guidance | Indexing Guidance |
|---|---|---|---|---|
| template_id | Template provenance | uniqueidentifier | Nullable when no template used | Optional index for template analytics |
| source_system | Producer subsystem/service | nvarchar(64) | Nullable for default internal producer | Optional for reliability reporting |
| correlation_id | Cross-step request correlation | uniqueidentifier or nvarchar(64) | Prefer populated for orchestrated flows | Index for investigation joins |
| document_title | Human-readable title | nvarchar(255) | Nullable where derived from template | Optional for UI search |
| language_code | Language marker (ar/en/etc.) | nvarchar(16) | Nullable only if not applicable | Optional reporting index |
| rendered_format | Render output format (pdf/html) | nvarchar(32) | Nullable if implied by mime_type | Optional format-filter index |
| storage_provider | Backend storage system id | nvarchar(64) | Nullable if globally fixed | Optional operational index |
| retention_class | Retention policy class | nvarchar(64) | Nullable only if policy externalized | Optional compliance index |
| legal_hold_flag | Litigation/legal hold marker | bit | Nullable discouraged; default false preferred | Index for legal hold filtering |
| supersedes_document_id | Prior version superseded by this document | uniqueidentifier | Nullable for initial versions | Index for version-chain traversal |
| parent_document_id | Root/parent lineage anchor | uniqueidentifier | Nullable for top-level roots | Index for family lineage traversal |

## 4) Foreign Key Review

| FK Field | Parent Reference | Expected Cardinality | Nullability Expectation | Review Note |
|---|---|---|---|---|
| case_id | workflow.discharge_cases.case_id | many docs -> one case | Non-nullable | Mandatory core linkage |
| event_id | workflow.workflow_events.event_id | many docs -> zero/one event | Nullable only by approved exception policy | Expected by default for traceability |
| generated_by_user_id | security.users.user_id | many docs -> zero/one user | Required for user-generated; nullable for controlled system exception | Must align with actor policy |
| template_id | documents.document_templates.template_id | many docs -> zero/one template | Nullable where template not used | Recommended for provenance |
| tenant_id | security.tenants.tenant_id | many docs -> one tenant | Non-nullable | Mandatory tenancy boundary |
| supersedes_document_id | documents.document_records.document_id | many docs -> zero/one predecessor | Nullable | Enables explicit supersession chain |
| parent_document_id | documents.document_records.document_id | many docs -> zero/one root parent | Nullable | Supports document family lineage |
| document_type_code_ref (if modeled) | reference.document_types.document_type_code | many docs -> one type | Non-nullable if reference table adopted | Reduces vocabulary drift |
| document_status_code_ref (if modeled) | reference.document_statuses.document_status_code | many docs -> one status | Non-nullable if reference table adopted | Enforces status governance |

## 5) Document Traceability Rule

Mandatory linkage principles:
- No document may exist without case linkage (`case_id` mandatory).
- Event linkage (`event_id`) should exist wherever operationally possible.
- Missing `event_id` must trigger explicit documented exception handling (reason, approver, remediation plan).
- Document metadata must support forensic reconstruction via case/event/user/time/hash/version fields.

## 6) Metadata-Only Storage Rule

Required posture:
- Database stores metadata only.
- Binary/file body remains outside SQL Server.
- Storage linkage (`storage_uri`/`storage_path`) must be reliable, stable, and auditable.
- Integrity fields (for example `file_hash`) must be retained to verify external artifact immutability.

## 7) Versioning and Supersession Review

The table should support:
- Regenerated documents: incremented `version_no`, same case/type family.
- Amended documents: explicit lineage to prior version using `supersedes_document_id`.
- Superseded versions: retained for evidentiary history (not destructive overwrite).
- Final evidentiary copies: identifiable status/hold markers and stable hash references.

## 8) Index and Query Expectations

Recommended baseline index set:
- Case document retrieval:
  - (tenant_id, case_id, document_type_code, document_status_code, generated_at)
- Event-linked document retrieval:
  - (tenant_id, event_id, generated_at) filtered where event_id is not null
- Document type filtering:
  - (tenant_id, document_type_code, document_status_code)
- generated_at date-range queries:
  - (tenant_id, generated_at)
- Hash lookup / integrity checks:
  - (tenant_id, file_hash)
- Tenant-scoped retrieval:
  - (tenant_id, case_id)

Optional lineage indexes:
- (supersedes_document_id)
- (parent_document_id)

## 9) Nullability Review

Must be non-null:
- document_id
- case_id
- document_type_code
- document_status_code
- storage_uri or storage_path (at least one required by policy)
- file_name
- mime_type
- file_hash
- version_no
- generated_at
- tenant_id

Conditionally nullable with explicit rules:
- event_id: nullable only via approved exception process.
- generated_by_user_id: nullable only for controlled system-generated records.
- signed_at: nullable until signature milestone achieved.
- template_id: nullable when template-independent generation is valid.
- lineage fields (`supersedes_document_id`, `parent_document_id`): nullable for initial/root versions.

## 10) Legal Defensibility and Evidence Integrity Review

The table should support:
- Chain of custody:
  - Who generated/signed, when, and for which case/event.
- Document provenance:
  - Type/status/template/source plus storage pointer and hash.
- Signature evidence linkage:
  - Joinability to `documents.document_signatures` and related signature artifacts.
- Version traceability:
  - Reconstructable lineage from root to superseded/final versions.
- Legal hold / retention expectations:
  - Ability to enforce hold and retention class without deleting historical metadata.

## 11) Design Risks and Gaps

Key risks:
- Missing event linkage risk:
  - Weakens workflow-to-document causality and dispute reconstruction.
- Weak file integrity controls:
  - Missing/unstable hashes undermine tamper verification.
- Missing version relationships:
  - Regenerated/amended documents become ambiguous in legal review.
- Overloading JSON risk:
  - Excess untyped metadata in JSON weakens queryability and governance.
- Insufficient document-status governance:
  - Inconsistent status vocabulary across layers causes policy and reporting drift.

## 12) Final Recommendation

Recommendation: Conditionally ready for non-production schema validation.

Ready now:
- Core metadata-only architecture is aligned with ADR.
- Case linkage and traceability expectations are clear.
- Backbone alignment with event/signature/evidence flow is structurally sound.

Must improve before stronger integration confidence:
- Enforce event-linkage exception process operationally.
- Enforce hash and version lineage controls consistently.
- Formalize document type/status reference governance across layers.
- Ensure tenant-scoped indexing and retention/legal-hold controls are validated.

Decision posture in current phase:
- GO for non-production schema validation with tracked improvements.
- Not sufficient alone for production/app-coupled readiness until broader ORM/integration readiness is completed.
