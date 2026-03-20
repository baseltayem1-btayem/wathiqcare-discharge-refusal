# SQL Schema Implementation Plan

Date: 2026-03-13
Mode: DDL generation only
Execution status: Not executed

## 1. Schema Overview

Generated SQL artifacts:
- database/01_create_schemas.sql
- database/02_create_tables.sql
- database/03_constraints.sql
- database/04_indexes.sql
- database/05_seed_reference_data.sql

Target logical schemas:
- security
- workflow
- documents
- compliance
- legal
- audit
- integration

Deferred logical schemas (excluded from immediate rollout):
- billing

Design source:
- docs/API_TO_ENTITY_AND_DATABASE_SCHEMA_DESIGN_REPORT.md

Binding ADR source:
- DATABASE_PHASE_ARCHITECTURAL_DECISION_RECORD_2026-03-13.md

## 2. Table List by Schema

### security
- tenants
- users

### workflow
- patients
- cases
- discharge_refusal_cases
- discharge_refusal_workflows
- discharge_case_documentation

### documents
- documents
- document_signatures
- document_otp_challenges
- signature_ack_sessions
- evidence_bundles

### compliance
- home_care_plans
- equipment_requests
- transfer_requests
- patient_financial_liability

### legal
- legal_escalation_cases
- legal_escalation_notes

### audit
- audit_logs

### integration
- integration_system_references

Deferred tables (excluded from immediate rollout):
- security.tenant_memberships
- security.invitations
- billing.plans
- billing.subscriptions
- billing.usage_records
- billing.invoices
- billing.subscription_events

## 3. Dependency and Deployment Order

Recommended execution order:
1. database/01_create_schemas.sql
2. database/02_create_tables.sql
3. database/03_constraints.sql
4. database/04_indexes.sql
5. database/05_seed_reference_data.sql

Why this order:
- Schemas must exist before table creation.
- Tables are created first with PK/default definitions.
- FK/unique/check constraints are applied after all tables exist.
- Performance indexes are added after structure and constraints are stable.
- Seed reference data is inserted last to satisfy FK dependencies and constraints.
- Seed upserts use UPDATE + INSERT (NOT EXISTS) for deterministic idempotency.

## 4. Constraint and Index Coverage Summary

Constraints included:
- Primary keys in table DDL
- Foreign keys in 03_constraints.sql
- Unique constraints in 03_constraints.sql
- Domain and JSON check constraints in 03_constraints.sql

Index strategy included:
- Workflow lookups: tenant+status/stage, escalation due, closure
- Document retrieval: case/refusal/workflow scoped retrieval and not-deleted filter
- Case search: tenant-scoped patient/case name and case number uniqueness
- Tenant scoping: tenant-leading indexes across operational tables
- Audit access: tenant/date, entity, action, case, document

## 5. Controlled Deployment Notes

Pre-deployment checks:
1. Validate script syntax in a non-production SQL Server/Azure SQL environment.
2. Confirm compatibility level and permissions for schema creation.
3. Confirm naming conventions do not collide with existing objects.
4. Confirm execution tool supports GO batch separators (sqlcmd/SSMS/Azure Data Studio).
5. Confirm deferred scope remains excluded from this rollout.
6. Confirm this rollout remains schema-validation-first and not app-coupled.
7. Confirm document storage stays metadata-only in DB (no binary payload storage in tables).
8. Confirm status check constraints used in deployment exactly match approved domain source-of-truth vocabulary.

Execution safeguards:
- Run inside explicit deployment transaction blocks per file where appropriate.
- Capture execution logs and object creation summary.
- Run post-deployment verification queries for object count and FK health.

## 6. Migration Readiness

Readiness status: CONDITIONAL READY

Ready now:
- DDL package generation complete.
- Deployment order is defined.
- Immediate-scope constraints and index strategy are codified.
- Deferred IAM/Billing entities are excluded from immediate scripts.

Blockers before production execution:
1. Complete ORM compatibility assessment and migration/refactor planning for SQLAlchemy/Prisma alignment.
2. Finalize data migration/backfill approach for file-backed artifacts moving to DB tables:
   - signature metadata
   - otp metadata
   - signature sessions
   - evidence bundles
   - legal escalation file records
3. Approve one status vocabulary source-of-truth across API/backend/database/frontend before any status check constraints are enforced in production.
4. Validate SQLAlchemy/Prisma field mapping against live data samples.

Non-blocking, separately tracked technical debt:
- Homecare/SHC import mismatch is tracked separately and does not block core workflow schema validation.

Scope governance for this phase:
- IAM and Billing remain deferred from immediate executable deployment scope.
- Tenant model remains light multi-tenant via tenant_id without full SaaS tenancy expansion.

Final readiness call:
- GO for controlled non-production deployment validation (schema-only test DB).
- NO-GO for production cutover until production blockers above are closed.
- NO-GO for direct app-coupled deployment until ORM compatibility and migration/refactor planning are resolved.

Future migration readiness review baseline:
- All future readiness reviews must apply DATABASE_PHASE_ARCHITECTURAL_DECISION_RECORD_2026-03-13.md as a binding gate.
