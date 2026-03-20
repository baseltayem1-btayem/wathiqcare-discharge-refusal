# SQL Remediation and Revalidation Report

Date: 2026-03-13
Mode: Static remediation and review only (no SQL execution)

Binding decision baseline:
- DATABASE_PHASE_ARCHITECTURAL_DECISION_RECORD_2026-03-13.md

## 1) Scope Executed

Remediation and revalidation were limited strictly to:
- database/02_create_tables.sql
- database/03_constraints.sql
- database/05_seed_reference_data.sql
- SQL_SCHEMA_IMPLEMENTATION_PLAN.md
- SQL_REMEDIATION_AND_REVALIDATION_REPORT.md

Out of scope by instruction:
- All other changed/deleted/untracked files
- Any workspace cleanup/reconciliation actions

## 2) Remediation Changes Applied

### 2.1 Immediate deployment scope isolation

Applied:
- Removed executable creation of deferred IAM and Billing tables from immediate table script.
- Kept explicit deferred markers as comments for traceability.

Evidence:
- database/02_create_tables.sql:50
- database/02_create_tables.sql:471

### 2.2 Constraint alignment to immediate scope

Applied:
- Removed executable unique/FK/check constraints for deferred IAM and Billing objects from immediate constraints script.
- Left explicit deferred markers.

Evidence:
- database/03_constraints.sql:436
- database/03_constraints.sql:437
- database/03_constraints.sql:438

### 2.3 Seed script hardening

Applied:
- Removed deferred Billing seed operations from immediate seed script.
- Replaced MERGE upsert pattern with deterministic UPDATE + INSERT (NOT EXISTS) for integration reference defaults.

Evidence:
- database/05_seed_reference_data.sql:14
- database/05_seed_reference_data.sql:54
- database/05_seed_reference_data.sql:98
- database/05_seed_reference_data.sql:120

### 2.4 Implementation plan alignment

Applied:
- Updated implementation plan to define deferred schemas/tables outside immediate rollout.
- Added explicit execution-runner expectation for GO batch separators.
- Kept readiness split: GO for schema-only non-production validation, NO-GO for app-coupled tests until ORM reconciliation.

Evidence:
- SQL_SCHEMA_IMPLEMENTATION_PLAN.md:25
- SQL_SCHEMA_IMPLEMENTATION_PLAN.md:67
- SQL_SCHEMA_IMPLEMENTATION_PLAN.md:130

## 3) Scoped Revalidation Results

### 3.1 Validation checks run (scoped only)

Checks passed:
- No executable deferred IAM/Billing table creation remains in immediate table script.
- No executable deferred IAM/Billing constraints remain in immediate constraints script.
- No MERGE statements remain in immediate seed script.
- Deferred entities are explicitly documented as deferred in scripts and implementation plan.

### 3.2 Structural counts after remediation

- Table creation blocks in immediate table script: 20
- Foreign key blocks in immediate constraints script: 55
- Unique constraint blocks in immediate constraints script: 9
- Check constraint blocks in immediate constraints script: 26

## 4) Previous Blocking Findings Disposition

From SQL_PRE_DEPLOYMENT_VALIDATION_REPORT.md:

1. Membership status mismatch (SQL vs Prisma):
- Disposition: Deferred out of immediate deployment scope.
- How handled: tenant_memberships is no longer created/constrained in immediate scripts.

2. Invitation status mismatch (SQL vs Prisma):
- Disposition: Deferred out of immediate deployment scope.
- How handled: invitations is no longer created/constrained in immediate scripts.

3. Subscription status mismatch (SQL vs Prisma):
- Disposition: Deferred out of immediate deployment scope.
- How handled: billing subscriptions are no longer created/constrained in immediate scripts.

4. Seed plan code mismatch (FREE/STANDARD vs Prisma):
- Disposition: Deferred out of immediate deployment scope.
- How handled: billing plan seed removed from immediate seed script.

5. Phase-scope mismatch (deferred IAM/Billing included in base package):
- Disposition: Resolved for immediate scope.
- How handled: deferred domains removed from executable immediate scripts and documented as deferred.

6. Seed MERGE operational risk:
- Disposition: Resolved.
- How handled: replaced with UPDATE + INSERT (NOT EXISTS).

7. SQL client GO batch compatibility requirement:
- Disposition: Explicitly documented.
- How handled: execution contract is stated in implementation plan.

8. ORM compatibility gap for app-coupled tests:
- Disposition: Explicitly deferred from this immediate schema-only pass.
- Current status: still a blocker for app-coupled integration tests and production cutover.

## 5) Final Decision

Decision for immediate, schema-only non-production SQL validation: GO

Decision for app-coupled integration testing / production cutover: NO-GO (unchanged)

Reason:
- SQL remediation blockers in immediate DDL scope are resolved or explicitly deferred.
- ORM compatibility and migration/backfill strategy remain outside this remediation pass and are still required for application-coupled readiness.

## 6) ADR Compliance Mapping

1. ORM compatibility
- Applied: schema-validation-first only; app-coupled and production usage remains blocked pending ORM compatibility work.

2. Tenant strategy
- Applied: tenant_id-first light multi-tenant baseline retained; no full SaaS tenancy expansion introduced in immediate scripts.

3. Document storage strategy
- Applied: document table strategy remains metadata/reference-based with storage_path and metadata fields; no binary file-body storage introduced.

4. Status vocabulary governance
- Applied as governance gate: status check constraints require exact alignment with approved source-of-truth vocabulary before production enforcement.

5. Homecare/SHC scope isolation
- Applied: SHC/homecare remains optional extension scope and not a core blocking dependency for schema-only non-production validation.

6. IAM/Billing scope
- Applied: IAM/Billing remain deferred and outside immediate executable deployment package.

## 7) Approved Deployment Status (ADR-aligned)

- GO for non-production schema validation
- NO-GO for production cutover
- NO-GO for direct app-coupled deployment until ORM compatibility is resolved

## 8) Workspace State Handling Note

Unrelated workspace changes were detected during this work and were intentionally left untouched per instruction.
No modification, restoration, staging, deletion, or reconciliation was performed outside the approved SQL remediation scope.
