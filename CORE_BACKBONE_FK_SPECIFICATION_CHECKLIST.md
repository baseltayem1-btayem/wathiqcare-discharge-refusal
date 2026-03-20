# CORE BACKBONE FK SPECIFICATION CHECKLIST

Date: 2026-03-13
Status: Draft for engineering validation (documentation only)
Scope: Approved core database backbone FK rules for WathiqCare

## Architectural Invariants (Mandatory)

- `workflow.discharge_cases` represents current case state.
- `workflow.workflow_events` represents complete chronological workflow history.
- `documents.document_records` must link to `case_id`.
- `documents.document_records` should link to `event_id` wherever operationally possible.
- No document may exist without case linkage.
- Any event-linkage exception must be explicitly documented.

## Foreign-Key Specification Checklist

| # | Parent Table | Child Table | Foreign Key Column | Referenced Primary Key | Relationship Cardinality | Nullable vs Non-Nullable | On Delete Rule | On Update Rule | Business Rationale | Traceability Note |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | workflow.discharge_cases | workflow.workflow_events | case_id | workflow.discharge_cases.case_id | 1 -> many | Non-nullable | RESTRICT / NO ACTION | NO ACTION | Every event must belong to a valid case header. | This is the chronological history anchor for each case. |
| 2 | workflow.discharge_cases | workflow.workflow_tasks | case_id | workflow.discharge_cases.case_id | 1 -> many | Non-nullable | RESTRICT / NO ACTION | NO ACTION | Tasks are operational units executed in the context of one case. | Enables end-to-end task-level reconstruction by case. |
| 3 | workflow.discharge_cases | workflow.legal_escalations | case_id | workflow.discharge_cases.case_id | 1 -> many | Non-nullable | RESTRICT / NO ACTION | NO ACTION | Legal escalations must always be tied to a case context. | Supports legal defensibility and case lineage. |
| 4 | workflow.discharge_cases | workflow.compliance_reviews | case_id | workflow.discharge_cases.case_id | 1 -> many | Non-nullable | RESTRICT / NO ACTION | NO ACTION | Compliance reviews are case-scoped governance actions. | Preserves auditable compliance trail per case. |
| 5 | workflow.discharge_cases | documents.document_records | case_id | workflow.discharge_cases.case_id | 1 -> many | Non-nullable | RESTRICT / NO ACTION | NO ACTION | No document can exist outside a case lifecycle. | Mandatory rule: no document without case linkage. |
| 6 | documents.document_records | documents.document_signatures | document_id | documents.document_records.document_id | 1 -> many | Non-nullable | RESTRICT / NO ACTION | NO ACTION | Signatures are evidence artifacts of a specific document record. | Maintains signer/proof chain per document. |
| 7 | workflow.discharge_cases | documents.evidence_bundles | case_id | workflow.discharge_cases.case_id | 1 -> many | Non-nullable | RESTRICT / NO ACTION | NO ACTION | Evidence bundles are assembled per case for legal/audit purposes. | Enables bundle-to-case forensic traceability. |
| 8 | workflow.discharge_cases | audit.forensic_audit_logs | case_id | workflow.discharge_cases.case_id | 1 -> many | Prefer non-nullable for case-scoped logs; nullable only for non-case forensic events | RESTRICT / NO ACTION | NO ACTION | Forensic logs should preserve immutable change lineage related to a case. | If nullable is used, null-case events must be categorized and justified. |
| 9 | workflow.discharge_cases | integration.integration_references | case_id | workflow.discharge_cases.case_id | 1 -> many | Non-nullable | RESTRICT / NO ACTION | NO ACTION | External integration pointers must be anchored to the owning case. | Supports traceable external resource mapping per case. |
| 10 | workflow.workflow_events | documents.document_records | event_id | workflow.workflow_events.event_id | 1 -> many (operationally expected), optional at child in controlled exceptions | Nullable by exception policy; should be populated by default | RESTRICT / NO ACTION | NO ACTION | Documents should map to the event that triggered generation for full operational traceability. | Mandatory architectural rule: event linkage should exist wherever operationally possible. |

## Event-Linkage Exception Register (Mandatory When `document_records.event_id` Is Null)

When `documents.document_records.event_id` is null, engineering must record an explicit exception with the fields below:

- exception_id
- document_id
- case_id
- exception_category
- exception_reason
- approved_by
- approved_at
- remediation_plan
- remediation_due_date

## Review Gates Before Implementation

- [ ] All non-nullable FK decisions validated with domain owners.
- [ ] All delete/update actions validated against retention and legal requirements.
- [ ] `documents.document_records.case_id` enforced as mandatory.
- [ ] `documents.document_records.event_id` default linkage policy implemented.
- [ ] Exception register process approved for any null `event_id` record.
- [ ] Forensic and integration traceability reviewed for audit readiness.

## Notes

- This document is a specification checklist only.
- No executable SQL is included in this artifact.
- Final constraint names and physical indexing are implementation-phase deliverables.
