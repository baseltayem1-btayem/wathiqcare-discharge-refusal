# SCHEMA VALIDATION PLAN

Date: 2026-03-13
Status: Planned (documentation only)
Scope: Non-production SQL schema validation for current database phase

Authoritative inputs applied:
- docs/ARCHITECTURAL_DECISION_RECORD_DATABASE.md
- CORE_BACKBONE_FK_SPECIFICATION_CHECKLIST.md
- CORE_BACKBONE_ER_DIAGRAM.md
- WORKFLOW_EVENT_MODEL_SPEC.md
- WORKFLOW_EVENTS_TABLE_REVIEW.md
- DOCUMENT_RECORDS_TABLE_REVIEW.md
- FORENSIC_AUDIT_LOGS_TABLE_REVIEW.md
- CORE_TABLE_REVIEW_CHECKLIST.md
- SQL_SCHEMA_IMPLEMENTATION_PLAN.md
- SQL_PRE_DEPLOYMENT_VALIDATION_REPORT.md
- SQL_REMEDIATION_AND_REVALIDATION_REPORT.md
- database/01_create_schemas.sql
- database/02_create_tables.sql
- database/03_constraints.sql
- database/04_indexes.sql
- database/05_seed_reference_data.sql

## 1. Purpose

Why schema validation is being performed:
- To verify that the approved SQL Server DDL package creates the intended schemas, tables, constraints, indexes, and reference seeds in a controlled environment.
- To validate structural integrity and traceability readiness before any application-coupled testing.

Why this is non-production only:
- Current architecture status is validation-first and explicitly approved for non-production schema validation only.
- Production cutover remains out of scope in this phase.

Why this does not yet imply app-coupled readiness:
- ORM compatibility, migration/backfill planning, and integration readiness remain separate gating activities.
- A successful schema validation run is necessary but not sufficient for production or runtime coupling.

## 2. Validation Scope

In scope:
- Immediate rollout schemas and objects only.
- Validation of schema structure, table creation, FK/unique/check constraints, index creation, and seed safety behavior.

Immediate rollout schemas:
- security (core identities)
- workflow
- documents
- compliance
- legal
- audit
- integration

Explicitly excluded from this plan:
- Deferred IAM scope objects.
- Deferred Billing/subscription scope objects.

Scope guard:
- Any deferred-scope object found in execution targets or validation outputs must be logged as an exception and treated as a scope breach.

## 3. Environment Assumptions

- Target is a non-production SQL Server or Azure SQL environment only.
- Database is expected to be empty unless a pre-existing baseline is explicitly documented before execution.
- Execution tooling supports GO batch separators (for example, sqlcmd/SSMS/Azure Data Studio compatible runner).
- No production data is used.
- Validation data used for checkpointing is synthetic/test-only.

## 4. Deployment Order

Apply scripts in this exact order:
1. database/01_create_schemas.sql
2. database/02_create_tables.sql
3. database/03_constraints.sql
4. database/04_indexes.sql
5. database/05_seed_reference_data.sql

Execution rule:
- Do not change order during formal validation runs unless a documented remediation path requires controlled re-run sequencing.

## 5. Pre-Execution Checks

Required pre-run checks:
- [ ] File presence confirmed for all five deployment scripts.
- [ ] Script order confirmed as documented in this plan.
- [ ] Deferred IAM/Billing objects confirmed excluded from immediate execution scope.
- [ ] SQL Server/Azure SQL compatibility confirmed for all scripts.
- [ ] Runner/tooling readiness confirmed, including GO-batch support and logging capture.
- [ ] Test-environment rollback or cleanup approach documented and approved.
- [ ] Non-production environment identity and safeguards confirmed.
- [ ] No production data sources are connected.

## 6. Validation Checkpoints After Execution

Post-run validation checkpoints:
- [ ] Schema creation success confirmed.
- [ ] Table creation success confirmed.
- [ ] Foreign key creation success confirmed.
- [ ] Constraint creation success confirmed (unique and check included).
- [ ] Index creation success confirmed.
- [ ] Seed execution success confirmed.
- [ ] No unexpected deferred objects present.

Checkpoint evidence expectation:
- Capture object inventory snapshots, error logs (if any), and validation notes for each checkpoint.

## 7. Core Backbone Validation

Validate the following logical backbone tables as required:
- workflow.discharge_cases
- workflow.workflow_events
- workflow.workflow_tasks
- workflow.legal_escalations
- workflow.compliance_reviews
- documents.document_records
- documents.document_signatures
- documents.evidence_bundles
- audit.forensic_audit_logs
- integration.integration_references

For each table above, validate:
- [ ] Table exists and is queryable in non-production environment.
- [ ] Primary key exists and matches expected identity semantics.
- [ ] Required tenancy and audit timestamps are present where applicable.
- [ ] Required FK links are present and enforceable.
- [ ] Nullability and constraint profile aligns with approved reviews/checklists.

Implementation note:
- If physical object names differ in current DDL package naming, map logical table intent to implemented objects and record the mapping explicitly in validation evidence.

## 8. Relationship Validation Tests

Required relationship checks:
- [ ] FK integrity: all expected parent-child links validate without orphaning.
- [ ] Mandatory case linkage: document and related workflow artifacts cannot exist without valid case context.
- [ ] Event linkage expectation: event linkage is populated by default where policy requires it, with documented exceptions only.
- [ ] Evidence bundle linkage: case and session/document adjacency is intact for evidence traceability.
- [ ] Tenant linkage: tenant boundaries are enforced where required.
- [ ] Self-reference safety: self-referential lineage (where applicable) does not violate integrity rules.

## 9. Workflow Traceability Validation

Validate end-to-end traceability requirements:
- [ ] Current state vs history separation is preserved.
- [ ] Append-only expectations for workflow events are preserved.
- [ ] Document-to-case linkage is always present.
- [ ] Document-to-event linkage is present where expected, with controlled exceptions only.
- [ ] Forensic audit reconstructability is sufficient for what/when/who/change-context analysis.

## 10. Data Integrity and Vocabulary Checks

Integrity and governance checks:
- [ ] Status vocabulary consistency matches approved cross-layer source-of-truth.
- [ ] Nullability rules align with documented business semantics.
- [ ] Uniqueness constraints enforce intended identity/anti-duplication rules.
- [ ] Check constraints align to approved domain vocabulary and data-shape policies.
- [ ] Seed/reference data correctness is verified for values, idempotency behavior, and scope safety.

## 11. Query/Readiness Checks

Recommended validation query categories (execution by DBA/validator in non-production runbook):
- Case timeline retrieval validation:
  - Confirm efficient retrieval of case history and related chronology.
- Event chronology retrieval validation:
  - Confirm time-ordered workflow event replay for representative cases.
- Document retrieval by case validation:
  - Confirm case-scoped document metadata retrieval and status filtering.
- Forensic audit retrieval by case validation:
  - Confirm case-scoped forensic reconstruction retrieval patterns.
- Event-linked document lookup validation:
  - Confirm trace from event context to generated/signed document metadata.
- Date-range investigation lookup validation:
  - Confirm range-based investigative retrieval for events/audits/documents with tenant scoping.

Readiness output:
- Capture observed retrieval behavior, expected-vs-actual row patterns, and index support notes.

## 12. Risk and Limitation Note

This plan is constrained by the following:
- Non-production only status remains in force.
- No ORM compatibility confirmation is provided by this plan alone.
- No migration/backfill approval is implied by this plan.
- No production cutover approval is implied by this plan.
- Deferred IAM/Billing scope remains excluded and must not be executed in this phase.

## 13. Validation Outcome Criteria

PASS:
- All required checkpoints pass.
- No unresolved integrity, scope, or vocabulary violations.
- No critical performance or traceability blockers detected for non-production readiness.

PASS WITH ISSUES:
- Core structure and integrity pass, but non-blocking issues remain.
- Issues are documented with owner, remediation plan, and due date.
- No issue materially invalidates non-production validation objectives.

FAIL:
- Any critical checkpoint fails (schema/object creation, FK integrity, constraint correctness, deferred-scope leakage, or traceability sufficiency).
- Any unresolved issue materially compromises data integrity, tenancy safety, or legal/audit traceability.

## 14. Final Handoff Decision

Execution of this plan must end with one explicit handoff outcome:
- GO for app-compatibility assessment, or
- GO for further integration testing, or
- NO-GO pending remediation.

Handoff requirement:
- Final decision must include evidence summary, open issues register, and explicit next-gate owner.