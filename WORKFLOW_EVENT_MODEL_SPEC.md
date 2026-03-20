# WORKFLOW EVENT MODEL SPEC

Date: 2026-03-13
Status: Approved-for-review specification (documentation only)
Scope: Core clinical-legal workflow event model for discharge refusal domain

## 1) Purpose of workflow_events

`workflow.workflow_events` is the authoritative chronological business event stream for the discharge refusal workflow.

Its purpose is to:
- Capture every meaningful workflow transition and decision as an immutable business event.
- Provide a legally defensible timeline across clinical, compliance, legal, document, and operational actions.
- Enable deterministic reconstruction of case progression over time.
- Support forensic auditing, governance review, and post-incident investigation.

## 2) Current-State vs History Rule

- `workflow.discharge_cases` stores current case state only.
- `workflow.workflow_events` stores historical chronology only.
- Current state may be derived from event progression but must not replace event history.
- Historical events must not be collapsed into a single mutable status record.

## 3) Required Event Columns

Minimum required columns for every event record:
- `event_id`: unique immutable event identifier.
- `case_id`: required foreign linkage to `workflow.discharge_cases`.
- `event_type`: controlled business event type.
- `occurred_at`: business occurrence timestamp.
- `recorded_at`: system persistence timestamp.
- `actor_type`: identifies who/what produced the event (for example `user`, `system`, `integration`).
- `actor_user_id`: user identifier when actor type is user.
- `tenant_id`: tenancy boundary for event ownership.
- `event_version`: schema/version indicator for event payload interpretation.
- `event_payload`: structured business payload for the event.
- `correlation_id`: correlates events within a single operation/request chain.

## 4) Recommended Optional Event Columns

Recommended optional columns for stronger traceability:
- `causation_event_id`: links to the preceding event that caused this event.
- `task_id`: links to related `workflow.workflow_tasks` item where applicable.
- `document_id`: links to related `documents.document_records` item where applicable.
- `integration_reference_id`: links to related `integration.integration_references` record where applicable.
- `source_system`: source component/service producing the event.
- `source_request_id`: request/trace id from API or message boundary.
- `idempotency_key`: duplicate-write protection marker.
- `actor_role`: actor role snapshot at event time.
- `event_hash`: integrity checksum for evidentiary verification.

## 5) Mandatory Event Creation Rule

An event must be created for every business-significant workflow action, including but not limited to:
- Case lifecycle transitions.
- Refusal workflow stage transitions.
- Clinical/legal/compliance decisions.
- Document generation/signature milestones.
- Escalation creation, assignment, and resolution.
- Integration reference creation and major sync outcomes.

No business-critical state change is considered valid without a corresponding event entry.

## 6) Append-Only Rule

`workflow.workflow_events` is append-only:
- Existing event rows must not be updated for business content changes.
- Existing event rows must not be hard-deleted in normal operations.
- Corrections must be represented as new compensating/superseding events.
- Administrative data-fix exceptions require explicit governance approval and forensic logging.

## 7) Event-to-Case Linkage Rule

- Every event must link to exactly one case via `case_id`.
- `case_id` is mandatory and non-optional for core workflow events.
- Cross-case events are prohibited in the core model; use separate events per case.

## 8) Event-to-Document Linkage Rule

- Document-related events should include `document_id` when a concrete document exists.
- Document records should normally map back to the event that triggered generation/signing.
- Event/document linkage exceptions must be explicitly documented with reason and approval.
- No document should exist without case linkage; event linkage is expected by default policy.

## 9) Event-to-Task Linkage Rule

- Task-originated or task-completing actions should include `task_id`.
- A task may have multiple events (create, assign, start, complete, reopen).
- If no task exists for an event, null linkage is acceptable with documented event rationale.

## 10) Event Reconstruction and Legal Traceability Rule

The event stream must support complete reconstruction of:
- Who did what.
- When it happened.
- Why it happened (payload/context).
- Which case/task/document/integration object was affected.

Minimum legal traceability expectations:
- Chronological ordering by `occurred_at` and `recorded_at`.
- Actor attribution and role context.
- Immutable event lineage with compensating events for corrections.
- Correlation/cause links sufficient for incident and legal review.

## 11) Sample Event Types for Discharge Refusal Workflow

Illustrative controlled event types:
- `CASE_CREATED`
- `DISCHARGE_DECISION_RECORDED`
- `DISCHARGE_REFUSAL_MARKED`
- `INITIAL_COMMUNICATION_RECORDED`
- `SOCIAL_SERVICES_REFERRED`
- `WORKFLOW_STAGE_CHANGED`
- `WORKFLOW_ESCALATION_TRIGGERED`
- `LEGAL_ESCALATION_CREATED`
- `LEGAL_ESCALATION_ASSIGNED`
- `LEGAL_ESCALATION_RESOLVED`
- `COMPLIANCE_REVIEW_STARTED`
- `COMPLIANCE_REVIEW_COMPLETED`
- `DOCUMENT_GENERATION_REQUESTED`
- `DOCUMENT_GENERATED`
- `DOCUMENT_SIGNATURE_REQUESTED`
- `DOCUMENT_SIGNED`
- `EVIDENCE_BUNDLE_GENERATED`
- `INTEGRATION_REFERENCE_LINKED`
- `EXTERNAL_SYNC_SUCCEEDED`
- `EXTERNAL_SYNC_FAILED`
- `CASE_CLOSED`

Note:
- Final event vocabulary must align with the approved cross-layer source-of-truth governance process.
- New event types require controlled review to prevent vocabulary drift.
