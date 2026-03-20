# FORENSIC AUDIT LOGS TABLE REVIEW

Date: 2026-03-13
Status: Pre-validation table-level review
Scope: audit.forensic_audit_logs as evidentiary audit and forensic reconstruction layer

Authoritative inputs applied:
- WORKFLOW_EVENT_MODEL_SPEC.md
- WORKFLOW_EVENTS_TABLE_REVIEW.md
- DOCUMENT_RECORDS_TABLE_REVIEW.md
- CORE_BACKBONE_FK_SPECIFICATION_CHECKLIST.md
- CORE_BACKBONE_ER_DIAGRAM.md
- docs/ARCHITECTURAL_DECISION_RECORD_DATABASE.md
- docs/API_TO_ENTITY_AND_DATABASE_SCHEMA_DESIGN_REPORT.md

## 1) Table Purpose

Why forensic_audit_logs exists:
- To preserve evidentiary-grade, immutable change records for entities involved in the discharge refusal domain.
- To capture before/after state evidence, actor attribution, and investigation context beyond business-event narration.
- To support legal defensibility, dispute analysis, and post-incident forensic reconstruction.

Why it is not interchangeable with workflow_events:
- workflow_events captures domain workflow chronology and business transitions.
- forensic_audit_logs captures state-change evidence at the data/control plane, including before/after snapshots and attribution details.
- workflow_events answers "what business step happened"; forensic_audit_logs answers "what changed, by whom, from what, to what, and under which trace context".

Why it is not interchangeable with access/system logs:
- Access/system logs primarily describe infrastructure access, service health, and technical execution traces.
- forensic_audit_logs is a governed evidentiary ledger tied to case/event/entity semantics and legal review needs.
- Access logs are operational telemetry; forensic_audit_logs is evidentiary change provenance.

Why it matters for evidentiary reconstruction:
- Enables replay of contested changes with chronology, actor, and payload deltas.
- Supports litigation and compliance review where workflow narrative alone is insufficient.
- Provides structured links to case, event, document, and task context for full cross-layer reconstruction.

## 2) Required Columns Review

| Column Name | Business Meaning | Required / Optional | Expected SQL Type | Indexing Need | Legal/Audit Note |
|---|---|---|---|---|---|
| audit_id | Immutable forensic audit row identity | Required | uniqueidentifier | Primary key | Stable legal citation key for each audit record |
| case_id | Case context for forensic lineage | Required by default policy; nullable only for approved non-case forensic events | uniqueidentifier | High: case timeline retrieval | Core evidentiary anchor for case-based reconstruction |
| event_id | Related workflow event when applicable | Required by default policy; nullable only by documented exception | uniqueidentifier | High: event-linked retrieval | Strengthens causation chain between event chronology and data mutation |
| entity_name | Canonical entity/table domain name changed | Required | nvarchar(128) | High with entity_id | Must be governed vocabulary to avoid interpretive ambiguity |
| entity_id | Business/entity instance identifier changed | Required | nvarchar(128) | High with entity_name | Required to isolate target record in investigations |
| action_type | Mutation type (create/update/delete/amend/etc.) | Required | nvarchar(64) | Medium-high with changed_at | Must use controlled action taxonomy for legal clarity |
| before_json | Pre-change state snapshot | Required for update/delete/amend; nullable for create with explicit rule | nvarchar(max) (JSON) | No blanket index; targeted investigation parsing only | Missing before-state weakens rebuttal and tamper claims |
| after_json | Post-change state snapshot | Required for create/update/amend; nullable for delete with explicit rule | nvarchar(max) (JSON) | No blanket index; targeted investigation parsing only | Missing after-state weakens reconstruction completeness |
| changed_by_user_id | User who caused the change (direct or accountable initiator) | Required for user-driven actions; nullable only for controlled system/integration paths | uniqueidentifier | High: actor investigation queries | Critical for attribution and accountability |
| changed_at | Effective timestamp of change capture | Required | datetime2(3) | High: chronology and range review | Core timeline integrity marker |
| tenant_id | Tenant ownership boundary | Required | uniqueidentifier | High: leading tenant filter | Mandatory for tenancy defensibility and scoped legal review |
| source_channel | Origin channel (api/ui/job/integration) | Required | nvarchar(64) | Medium with changed_at | Supports evidentiary context of how the mutation entered the system |
| ip_address | Source network attribution | Optional by operational capability; recommended where applicable | nvarchar(64) | Medium for security investigations | Valuable corroboration for contested user actions |
| correlation_id | Cross-step/request trace identifier | Required by policy for orchestrated flows; nullable only where not technically available | uniqueidentifier or nvarchar(64) | High: incident trace and end-to-end replay | Essential for stitching multi-step forensic narratives |

## 3) Recommended Optional Columns Review

| Column Name | Value Contribution | Expected SQL Type | Nullability Guidance | Indexing Guidance |
|---|---|---|---|---|
| reason_code | Controlled justification for action/change | nvarchar(64) | Nullable when action has no reason taxonomy | Optional analytics/compliance index |
| actor_role_code | Role snapshot at mutation time | nvarchar(64) | Nullable only when role not applicable | Optional actor-role investigation index |
| department_code | Departmental accountability context | nvarchar(64) | Nullable where department model not applicable | Optional governance reporting index |
| session_id | Session-level forensic grouping | nvarchar(128) | Nullable if session not tracked | Optional tracing index |
| request_id | API/request boundary identifier | nvarchar(128) | Nullable when not request-driven | Optional tracing index |
| document_id | Linked document under mutation context | uniqueidentifier | Nullable unless change concerns document entity/path | Recommended document investigation index |
| task_id | Linked workflow task context | uniqueidentifier | Nullable unless change concerns task lifecycle | Recommended task investigation index |
| legal_hold_flag | Indicates legal hold relevance | bit | Nullable discouraged; default false preferred | Recommended legal hold filtering index |
| investigation_flag | Indicates active investigation relevance | bit | Nullable discouraged; default false preferred | Recommended investigation queue index |
| amendment_reference_id | Links corrective/amendment record chain | uniqueidentifier | Nullable for original entries; expected for corrective chains | Recommended lineage traversal index |

## 4) Foreign Key Review

| FK Field | Parent Reference | Cardinality | Nullability Expectation | Review Note |
|---|---|---|---|---|
| case_id | workflow.discharge_cases.case_id | many audits to one case | Prefer non-nullable for case-scoped forensic model; nullable only for explicitly classified non-case events | Null-case events require explicit category and governance justification |
| event_id | workflow.workflow_events.event_id | many audits to zero/one event | Nullable by exception only; should be populated by default when mutation follows a workflow event | Reinforces chronology-to-mutation causation chain |
| changed_by_user_id | security.users.user_id | many audits to zero/one user | Required for user actions; nullable for system/integration with accountable context fields | Must align with source_channel and actor attribution policy |
| tenant_id | security.tenants.tenant_id | many audits to one tenant | Non-nullable | Mandatory tenancy boundary |
| document_id | documents.document_records.document_id | many audits to zero/one document | Nullable unless document-linked action | Enables document dispute and chain-of-custody audits |
| task_id | workflow.workflow_tasks.task_id | many audits to zero/one task | Nullable unless task-linked action | Supports task-level operational investigation |
| amendment_reference_id | audit.forensic_audit_logs.audit_id (self-reference) | many corrective entries to zero/one original entry | Nullable for original records; expected for corrections/amendments | Enables explicit amendment lineage and non-destructive corrections |

## 5) Forensic Reconstruction Rule

The table should support all of the following:
- Chronological reconstruction:
  - Rebuild per-case and per-entity mutation timeline using changed_at, audit_id ordering tie-break, and correlation context.
- Before/after comparison:
  - Compare before_json and after_json to identify exact field-level evolution and disputed deltas.
- Actor attribution:
  - Attribute changes through changed_by_user_id, source_channel, optional role/department, and network/session/request traces.
- Dispute support:
  - Demonstrate what changed, who initiated it, when it occurred, and how it aligns with workflow event chronology.
- Investigation readiness:
  - Query by case, event, entity, actor, and correlation_id without relying on unstructured logs.

## 6) Differentiation Rule

Distinct responsibilities:
- workflow_events:
  - Business-event timeline and workflow semantics.
  - Focus: process state transitions and domain decisions.
- forensic_audit_logs:
  - Evidentiary mutation ledger with before/after provenance.
  - Focus: record-level change accountability and legal reconstruction.
- access/system logs:
  - Infrastructure/security telemetry (access, service behavior, runtime diagnostics).
  - Focus: technical operations and platform monitoring.

Rule:
- These layers are complementary and non-substitutable.
- A legally defensible system requires all three, each with clear boundaries.

## 7) Immutability / Append-Only Note

Operational treatment requirements:
- forensic_audit_logs is append-only.
- No destructive overwrite of existing forensic rows.
- No hard deletion in normal operations.
- Corrections must be represented by:
  - Additional audit entries, and/or
  - Explicit amendment chain via amendment_reference_id and reason context.
- Any exceptional administrative alteration requires explicit governance approval and independent forensic trace.

## 8) Index and Query Expectations

Recommended baseline index patterns:
- Case-based audit retrieval:
  - tenant_id, case_id, changed_at
- Event-based audit retrieval:
  - tenant_id, event_id, changed_at (filtered where event_id is not null)
- Entity-based investigation:
  - tenant_id, entity_name, entity_id, changed_at
- changed_by_user_id investigations:
  - tenant_id, changed_by_user_id, changed_at
- changed_at date-range review:
  - tenant_id, changed_at
- correlation_id tracing:
  - tenant_id, correlation_id, changed_at

Optional high-value indexes by workload:
- tenant_id, action_type, changed_at
- tenant_id, document_id, changed_at (filtered where document_id is not null)
- tenant_id, task_id, changed_at (filtered where task_id is not null)

## 9) Nullability Review

Must be non-null:
- audit_id
- entity_name
- entity_id
- action_type
- changed_at
- tenant_id
- source_channel

Conditionally non-null with explicit rules:
- case_id: non-null by default; nullable only for approved non-case forensic categories.
- event_id: expected by default for workflow-driven mutations; nullable only by documented exception.
- changed_by_user_id: non-null for user actions; nullable for system/integration with accountable context.
- correlation_id: expected for orchestrated/request-driven operations; nullable only where unavailable.

Conditionally nullable based on action semantics:
- before_json: nullable for create actions; required for update/delete/amend.
- after_json: nullable for delete actions; required for create/update/amend.
- ip_address: nullable when channel does not provide network identity.

Nullable optional enrichments:
- document_id
- task_id
- reason_code
- actor_role_code
- department_code
- session_id
- request_id
- legal_hold_flag (nullable discouraged)
- investigation_flag (nullable discouraged)
- amendment_reference_id

## 10) Legal Defensibility and Evidentiary Sufficiency Review

The table design should support:
- Change provenance:
  - Clear entity/action/actor/time linkage for each mutation.
- Timeline integrity:
  - Reconstructable chronology with stable ordering and trace identifiers.
- Investigation support:
  - Fast pivots across case, event, entity, actor, and correlation contexts.
- Litigation readiness:
  - Before/after evidence plus amendment lineage without destructive history loss.
- Compliance review support:
  - Tenant-scoped, policy-aligned audit retrieval for governance and regulatory inspection.

Assessment:
- With required fields and append-only enforcement, forensic_audit_logs can provide evidentiary sufficiency for non-production validation.
- Sufficiency degrades materially if before/after capture, actor attribution, or correlation trace is inconsistently populated.

## 11) Design Risks and Gaps

Key risks:
- Missing before/after values:
  - Prevents precise mutation replay and weakens contested-change defense.
- Weak actor attribution:
  - Undermines accountability and can invalidate investigative conclusions.
- Missing correlation identifiers:
  - Breaks cross-service/request reconstruction and incident narrative continuity.
- Overuse of generic JSON with no entity governance:
  - Critical semantics become non-queryable and inconsistently represented, reducing legal clarity.
- Unclear separation from workflow_events:
  - Causes duplicate/contradictory logging behavior and governance confusion.

Additional gap controls recommended:
- Enforce controlled vocabularies for entity_name and action_type.
- Define action-driven before/after nullability policy in implementation checklists.
- Define exception register process for null case_id/event_id/correlation_id when policy requires presence.

## 12) Final Recommendation

Recommendation: Conditionally ready as a core table for non-production schema validation.

Ready now:
- Purpose and boundary against workflow_events and access/system logs are clear.
- Forensic reconstruction and evidentiary requirements are explicitly defined.
- Core FK, nullability policy, append-only posture, and index expectations are documented.

Must improve before stronger integration confidence:
- Operationally enforce action-based before_json/after_json completeness rules.
- Enforce attribution and correlation population policies with exception governance.
- Finalize controlled vocabularies for entity_name and action_type.
- Validate that amendment/reference chains are consistently used for corrections.

Decision posture in current phase:
- GO for non-production schema validation with tracked controls.
- Not sufficient alone for production/app-coupled readiness until broader ORM/integration readiness gates are completed.