# CORE TABLE REVIEW CHECKLIST

Date: 2026-03-13
Status: Consolidated pre-validation checklist (documentation only)
Scope: Unified review checklist for the four critical tables in the current database phase

Authoritative inputs applied:
- WORKFLOW_EVENTS_TABLE_REVIEW.md
- DOCUMENT_RECORDS_TABLE_REVIEW.md
- FORENSIC_AUDIT_LOGS_TABLE_REVIEW.md
- WORKFLOW_EVENT_MODEL_SPEC.md
- CORE_BACKBONE_FK_SPECIFICATION_CHECKLIST.md
- CORE_BACKBONE_ER_DIAGRAM.md
- docs/ARCHITECTURAL_DECISION_RECORD_DATABASE.md

Tables in scope:
- workflow.discharge_cases
- workflow.workflow_events
- documents.document_records
- audit.forensic_audit_logs

Checklist usage:
- Mark each item PASS or FAIL during review execution.
- Record evidence artifacts for each PASS.
- Any unresolved FAIL must be remediated or formally deferred before sign-off.

## 1) Table Purpose Alignment

### workflow.discharge_cases
- [ ] Purpose is current-state case header only.
- [ ] Table is not used as chronological event history.
- [ ] Case identity is stable for links from events, documents, and forensic audits.

### workflow.workflow_events
- [ ] Purpose is authoritative chronological business-event stream.
- [ ] Every business-significant state transition is represented as an event.
- [ ] Table is not repurposed as mutable current-state storage.

### documents.document_records
- [ ] Purpose is metadata registry for evidentiary documents.
- [ ] Metadata-only policy is respected (no binary payload in SQL Server).
- [ ] Document provenance supports case/event/legal review scenarios.

### audit.forensic_audit_logs
- [ ] Purpose is evidentiary mutation ledger with attribution and before/after context.
- [ ] Table is distinct from workflow business chronology and infrastructure logs.
- [ ] Forensic content supports investigations and legal reconstruction.

## 2) Current-State vs History Separation

- [ ] workflow.discharge_cases stores only current case state.
- [ ] workflow.workflow_events stores immutable historical chronology.
- [ ] documents.document_records stores document metadata and lineage, not workflow history.
- [ ] audit.forensic_audit_logs stores mutation evidence, not business process narrative.
- [ ] No table violates this boundary by duplicating or replacing another layer's responsibility.

## 3) Foreign Key Integrity

### Mandatory FK checks
- [ ] workflow.workflow_events.case_id -> workflow.discharge_cases.case_id (non-nullable).
- [ ] documents.document_records.case_id -> workflow.discharge_cases.case_id (non-nullable).
- [ ] documents.document_records.event_id -> workflow.workflow_events.event_id (default expected; exception-governed nullable).
- [ ] audit.forensic_audit_logs.case_id -> workflow.discharge_cases.case_id (prefer non-nullable; null-case events governed).

### Attribution/context FK checks
- [ ] workflow.workflow_events.actor_user_id -> security.users.user_id (policy-driven nullability).
- [ ] documents.document_records.generated_by_user_id -> security.users.user_id (policy-driven nullability).
- [ ] audit.forensic_audit_logs.changed_by_user_id -> security.users.user_id (required for user actions).
- [ ] audit.forensic_audit_logs.event_id -> workflow.workflow_events.event_id where event causation exists.
- [ ] Optional document/task links in events/audits are FK-governed when populated.

## 4) Traceability Requirements

### workflow.discharge_cases
- [ ] Case row supports deterministic joins to event/document/audit trails.
- [ ] Core lifecycle timestamps are available for operational trace context.

### workflow.workflow_events
- [ ] Event chronology fields support replay (occurred_at and recorded/persisted timestamp strategy).
- [ ] Actor attribution and correlation context are represented.
- [ ] Event payload/version strategy avoids interpretation ambiguity.

### documents.document_records
- [ ] Provenance fields are complete (generator, generated_at, version_no, file_hash, storage pointer).
- [ ] Case/event linkage supports end-to-end evidence tracing.

### audit.forensic_audit_logs
- [ ] Mutation provenance fields support what/when/who/how reconstruction.
- [ ] before/after state capture policy is enforced by action class.
- [ ] correlation_id and source context support cross-system incident tracing.

## 5) Evidence Linkage Requirements

- [ ] Every document row links to case_id.
- [ ] document_records.event_id is populated by default policy.
- [ ] Null event_id requires approved exception record (reason, approver, remediation).
- [ ] Forensic audit entries can reference case/event/document/task where applicable.
- [ ] Evidence chain from workflow event -> document record -> forensic audit is reconstructable.

## 6) Audit Sufficiency Requirements

- [ ] workflow events provide legally usable business chronology.
- [ ] forensic audit logs provide evidentiary-grade mutation details (including actor and delta context).
- [ ] Case and document tables expose stable keys for audit joins.
- [ ] Audit and event layers are complementary and non-interchangeable in operating policy.
- [ ] Retention and anti-tamper posture is defined for evidentiary content.

## 7) Tenant Isolation Requirements

- [ ] tenant_id is present and non-null on tenant-scoped core tables per approved model.
- [ ] Tenant boundary is enforceable for reads and writes across all four tables.
- [ ] Join paths do not allow cross-tenant leakage (directly or through referenced tables).
- [ ] Tenant filtering is included in primary retrieval/index strategies.

## 8) Status Vocabulary Governance

- [ ] workflow.discharge_cases current status values align to approved canonical vocabulary.
- [ ] workflow.workflow_events event/status-related codes align to controlled vocabulary.
- [ ] documents.document_records document status/type values align to controlled vocabulary.
- [ ] audit.forensic_audit_logs action/entity vocabularies are controlled and unambiguous.
- [ ] No table introduces divergent local codes conflicting with API/backend/database vocabulary governance.

## 9) Index Readiness

### workflow.discharge_cases
- [ ] Index strategy supports tenant-scoped operational case retrieval.
- [ ] Status-oriented operational queries are supported.

### workflow.workflow_events
- [ ] Case timeline retrieval index exists (tenant_id, case_id, occurred_at or equivalent).
- [ ] Actor/event type investigative queries are supported.
- [ ] Deterministic per-case ordering strategy is defined (for example event_sequence_no policy).

### documents.document_records
- [ ] Case/type/status/generation retrieval patterns are indexed.
- [ ] Event-linked document retrieval path is indexed.
- [ ] Hash/integrity and lineage lookups are supported where required.

### audit.forensic_audit_logs
- [ ] Case-based forensic retrieval is indexed.
- [ ] Event/entity/actor investigations are indexed.
- [ ] changed_at range review and correlation_id tracing are indexed.

## 10) Nullability Review

### Non-null expectations
- [ ] workflow.workflow_events.case_id is non-null.
- [ ] documents.document_records.case_id is non-null.
- [ ] audit.forensic_audit_logs core forensic identifiers and timestamps are non-null.

### Controlled nullable-by-policy expectations
- [ ] documents.document_records.event_id is nullable only under approved exception policy.
- [ ] workflow.workflow_events.actor_user_id nullability is constrained by actor_type policy.
- [ ] audit.forensic_audit_logs.changed_by_user_id nullability is constrained by source/actor policy.
- [ ] audit.forensic_audit_logs.before_json and after_json nullability follows action semantics.
- [ ] Any nullable FK has a documented business rule and review evidence.

## 11) Append-Only / Immutability Expectations

- [ ] workflow.workflow_events is append-only for business content.
- [ ] audit.forensic_audit_logs is append-only for forensic evidence.
- [ ] Corrections are represented via compensating entries/events or amendment lineage, not destructive overwrite.
- [ ] documents.document_records preserves evidence lineage for regenerated/amended records.
- [ ] Any exceptional administrative mutation requires explicit governance approval and separate forensic trace.

## 12) Legal Defensibility Checks

- [ ] Case current state can be explained from historical event lineage.
- [ ] Event timeline supports who/what/when/why reconstruction.
- [ ] Document chain-of-custody is demonstrable through case/event/provenance fields.
- [ ] Forensic logs support disputed-change replay with actor attribution and before/after context.
- [ ] Combined four-table model supports compliance review, investigation readiness, and litigation posture for non-production validation.

## 13) Pre-Validation Approval Decision Per Table

| Table | Decision | Decision Basis | Required Follow-Up Before Stronger Integration Confidence |
|---|---|---|---|
| workflow.discharge_cases | GO (Conditional) | Current-state role and backbone links are clear. | Validate status vocabulary lock and tenant/index readiness in test validation cycle. |
| workflow.workflow_events | GO (Conditional) | Authoritative chronology and append-only posture are defined. | Finalize deterministic per-case ordering and tighten JSON-governance boundaries. |
| documents.document_records | GO (Conditional) | Metadata-only evidence model and mandatory case linkage are defined. | Enforce event-linkage exception process and lineage/hash controls consistently. |
| audit.forensic_audit_logs | GO (Conditional) | Forensic reconstruction, attribution, and append-only expectations are documented. | Enforce action-driven before/after completeness and attribution/correlation policy controls. |

## 14) Overall GO / NO-GO for Non-Production Schema Validation

Overall decision: GO (Conditional) for non-production schema validation.

Conditions that must be tracked during validation:
- Controlled exception governance for nullable event linkage and attribution fields.
- Deterministic chronology strategy where timestamp collisions can occur.
- Controlled vocabulary enforcement across status/action/entity codes.
- Tenant-scoped retrieval and forensic query performance validation.
- Confirmation that append-only and amendment-lineage controls are operationally enforceable.

Out-of-scope for this decision:
- App-coupled production readiness remains gated on ORM compatibility, integration validation, and migration strategy approval per ADR.
