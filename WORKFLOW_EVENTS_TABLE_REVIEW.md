# WORKFLOW EVENTS TABLE REVIEW

Date: 2026-03-13
Status: Pre-validation table-level review
Scope: workflow.workflow_events as authoritative business event stream

Authoritative inputs applied:
- WORKFLOW_EVENT_MODEL_SPEC.md
- CORE_BACKBONE_FK_SPECIFICATION_CHECKLIST.md
- CORE_BACKBONE_ER_DIAGRAM.md
- docs/ARCHITECTURAL_DECISION_RECORD_DATABASE.md
- docs/API_TO_ENTITY_AND_DATABASE_SCHEMA_DESIGN_REPORT.md

## 1) Table Purpose

Why `workflow.workflow_events` exists:
- It is the authoritative chronological business-event stream for discharge refusal workflow.
- It records immutable business decisions and transitions over time.
- It enables reconstruction of workflow history for clinical, legal, compliance, and audit use.

Why it is not interchangeable with `workflow.discharge_cases`:
- `workflow.discharge_cases` is current-state header (point-in-time view).
- `workflow.workflow_events` is historical timeline (full sequence of what happened).
- Replacing event history with current state destroys forensic and legal traceability.

Why it is not interchangeable with audit logs:
- Business events represent domain workflow semantics and lifecycle transitions.
- Audit logs represent access/change evidence and control-plane accountability.
- Both are needed: event chronology for business/legal narrative and audit trail for tamper/accountability controls.

## 2) Required Columns Review

| Column Name | Business Meaning | Required / Optional | Expected SQL Type | Indexing Need | Legal/Audit Note |
|---|---|---|---|---|---|
| event_id | Immutable unique event identity | Required | uniqueidentifier | PK clustered/nonclustered by platform standard | Must be stable for legal citation and cross-linking |
| case_id | Owning case linkage | Required | uniqueidentifier | Nonclustered with occurred_at for timeline queries | Mandatory case anchor for defensibility |
| event_type | Controlled business event classification | Required | nvarchar(64) | Nonclustered (event_type, occurred_at) for reporting | Must align with approved vocabulary |
| occurred_at | Business time when event happened | Required | datetime2(3) | Included in case timeline index | Core chronological evidence timestamp |
| recorded_at | System persistence timestamp | Required | datetime2(3) | Included in timeline/report indexes | Supports ingestion/order verification |
| actor_type | Actor source class (user/system/integration) | Required | nvarchar(32) | Optional composite with actor_user_id | Clarifies accountability model |
| actor_user_id | User actor identity when applicable | Required (nullable only for non-user actor_type) | uniqueidentifier | Nonclustered for actor investigations | Supports attribution in disputes |
| tenant_id | Tenancy boundary key | Required | uniqueidentifier | Nonclustered leading column for tenant filtering | Mandatory partition boundary for multi-tenant defensibility |
| event_version | Event schema/version marker | Required | int | Usually none; include in troubleshooting index if needed | Prevents payload interpretation ambiguity over time |
| event_payload | Structured business context | Required | nvarchar(max) (JSON) | No broad index; targeted computed/indexed fields only | Must not be sole store for critical typed fields |
| correlation_id | Cross-event operation correlation | Required | uniqueidentifier or nvarchar(64) | Nonclustered for trace investigations | Essential for reconstructing multi-step operations |

## 3) Recommended Optional Columns Review

| Column Name | Value Contribution | Expected SQL Type | Nullability Guidance | Indexing Guidance |
|---|---|---|---|---|
| event_sequence_no | Deterministic in-case ordering | bigint | Nullable until sequencing strategy finalized; then required per case | Unique/composite index on (case_id, event_sequence_no) |
| from_status_code | Previous status snapshot | nvarchar(64) | Nullable for non-transition events | Optional reporting index with to_status_code |
| to_status_code | New status snapshot | nvarchar(64) | Nullable for non-transition events | Optional reporting index with from_status_code |
| actor_role_code | Role at event time | nvarchar(64) | Nullable if not role-driven | Optional actor analytics index |
| department_code | Organizational context | nvarchar(64) | Nullable where not applicable | Optional reporting index |
| reason_code | Controlled reason taxonomy | nvarchar(64) | Nullable for events without reasons | Optional code-frequency index |
| decision_code | Controlled decision outcome | nvarchar(64) | Nullable for non-decision events | Optional decision analytics index |
| payload_json | Extended structured context | nvarchar(max) (JSON) | Nullable if event_payload already used as canonical payload field | Avoid blanket indexing |
| source_system | Producing subsystem | nvarchar(64) | Nullable for internal default producer | Optional reliability reporting index |
| correlation_id | Distributed transaction correlation | uniqueidentifier or nvarchar(64) | Prefer non-null where orchestration exists | Index for incident tracing |
| parent_event_id | Event lineage pointer | uniqueidentifier | Nullable for root events | Nonclustered for lineage traversal |
| document_id | Linked document record | uniqueidentifier | Nullable except document-related events | Index for document-event trace queries |
| task_id | Linked task | uniqueidentifier | Nullable except task-related events | Index for task-event trace queries |

## 4) Foreign Key Review

| FK Field | Parent Reference | Expected Cardinality | Nullability Expectation | Review Note |
|---|---|---|---|---|
| case_id | workflow.discharge_cases.case_id | many events -> one case | Non-nullable | Mandatory in all core workflow events |
| actor_user_id | security.users.user_id | many events -> zero/one user | Nullable for actor_type system/integration; required for actor_type user | Must enforce actor_type-to-nullability consistency |
| document_id | documents.document_records.document_id | many events -> zero/one document | Nullable generally; expected for document events | Supports document provenance chain |
| task_id | workflow.workflow_tasks.task_id | many events -> zero/one task | Nullable generally; expected for task events | Required for strong task lifecycle traceability |
| parent_event_id | workflow.workflow_events.event_id | many events -> zero/one parent | Nullable for root events | Enables causation and amendment lineage |
| event_type_ref (if modeled) | reference.event_types.event_type_code | many events -> one event type | Non-nullable if reference table adopted | Recommended to prevent vocabulary drift |

## 5) Append-Only Enforcement Note

Operational treatment requirements:
- No destructive overwrite of historical event content.
- No status-only replacement of missing event records.
- Corrections handled by:
  - New compensating events, or
  - Explicit amendment events with parent_event_id linkage and reason metadata.
- Any exceptional administrative mutation must be separately audited and governance-approved.

## 6) Traceability and Legal Defensibility Review

`workflow.workflow_events` should satisfy all of the following:
- Chronological reconstruction: complete per-case timeline from occurred_at plus deterministic ordering strategy.
- Actor attribution: actor_type plus actor_user_id and actor_role context where relevant.
- Decision traceability: decision/reason/status transition semantics represented in typed fields or controlled payload structures.
- Document linkage: document-related events linked to document_id, with case linkage preserved.
- Workflow defensibility in disputes: immutable, explainable chain of decisions and actions from case creation to closure.

## 7) Index and Query Expectations

Recommended baseline index set:
- Case timeline retrieval:
  - (tenant_id, case_id, occurred_at)
- Event sequence retrieval (if sequence adopted):
  - (case_id, event_sequence_no) unique where applicable
- Actor-based review:
  - (tenant_id, actor_user_id, occurred_at)
- Document-linked events:
  - (tenant_id, document_id, occurred_at) filtered where document_id is not null
- Date-range reporting:
  - (tenant_id, occurred_at)

Optional analytics indexes based on workload:
- (event_type, occurred_at)
- (to_status_code, occurred_at)

## 8) Nullability Review

Must be non-null:
- event_id
- case_id
- event_type
- occurred_at
- recorded_at
- actor_type
- tenant_id
- event_version
- event_payload

May be nullable with explicit justification:
- actor_user_id (when actor_type is not user)
- document_id (only when event is not document-related)
- task_id (only when event is not task-related)
- parent_event_id (root events)
- status/decision/reason optional fields where event semantics do not require them

Policy requirement:
- Nullability must be semantics-driven and machine-validatable where possible.

## 9) Design Risks and Gaps

Key risks:
- Missing fields weakening legal traceability:
  - Lack of event_sequence_no can create order ambiguity for same-timestamp events.
- Overuse of JSON risk:
  - Critical semantics hidden only in payload_json can block reliable reporting and controls.
- Sequence/order ambiguity risk:
  - occurred_at alone may be insufficient for deterministic legal replay under concurrency.
- Missing linkage risk:
  - Missing document_id/task_id/event-type governance can reduce explainability and audit quality.
- Vocabulary drift risk:
  - event_type/status codes without controlled reference governance can diverge across layers.

## 10) Final Recommendation

Recommendation: Conditionally ready for non-production schema validation.

Ready now:
- Core purpose, append-only posture, and case-anchored chronology are well-defined.
- Backbone alignment with case/document/task/integration traceability is structurally sound.

Must improve before advancing to stronger integration confidence:
- Adopt deterministic per-case sequencing strategy (for example event_sequence_no policy).
- Enforce actor/document/task nullability semantics by event class.
- Minimize critical business reliance on untyped JSON-only payload content.
- Formalize controlled event_type reference governance to prevent vocabulary drift.

Decision posture for this table in current phase:
- GO for non-production schema validation with the above improvement items tracked.
- Not sufficient alone for app-coupled production readiness without full ORM and integration alignment.
