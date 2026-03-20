# SQL Pre-Deployment Validation Report

Date: 2026-03-13
Mode: Review only (no SQL execution)
Scope reviewed:
- database/01_create_schemas.sql
- database/02_create_tables.sql
- database/03_constraints.sql
- database/04_indexes.sql
- database/05_seed_reference_data.sql
- SQL_SCHEMA_IMPLEMENTATION_PLAN.md
- docs/API_TO_ENTITY_AND_DATABASE_SCHEMA_DESIGN_REPORT.md

## 1. Validation Findings

### 1.1 Structural validation results

Passed checks:
- Schema creation script structure is valid and idempotent by schema existence checks.
- Table script includes primary keys, audit columns, and tenancy columns for operational entities.
- Constraint script contains foreign keys, unique constraints, and check constraints.
- Index script provides tenant-leading indexes for key read paths.
- Script order in plan is logically correct for empty-database deployment.

Static integrity checks performed:
- Parsed DDL table definitions: 27 tables.
- Parsed FK constraints in constraints script: 68.
- FK source/target table+column reference validation: no unresolved references.
- Duplicate constraint names in script set: none.
- Duplicate index names in script set: none.

## 2. Compatibility Issues

### 2.1 Enum and check-constraint vocabulary mismatches with Prisma (blocking)

1. Membership status mismatch:
- SQL check allows ACTIVE, INVITED, SUSPENDED only.
- Prisma enum includes REMOVED.
- Evidence:
  - database/03_constraints.sql lines 492-494
  - prisma/schema.prisma lines 39-43

2. Invitation status mismatch:
- SQL check allows CANCELED.
- Prisma enum uses REVOKED.
- Evidence:
  - database/03_constraints.sql lines 496-498
  - prisma/schema.prisma lines 46-50

3. Subscription status mismatch:
- SQL check allows TRIALING, ACTIVE, PAST_DUE, CANCELED.
- Prisma enum also includes PAUSED and EXPIRED.
- Evidence:
  - database/03_constraints.sql lines 552-554
  - prisma/schema.prisma lines 21-27

4. Seeded plan code mismatch:
- Seed script inserts FREE and STANDARD plan codes.
- Prisma PlanCode enum defines STARTER and PROFESSIONAL.
- Evidence:
  - database/05_seed_reference_data.sql lines 17, 27
  - prisma/schema.prisma lines 10-12

### 2.2 SQL client compatibility constraint

- All scripts rely on GO batch separators.
- This is valid for sqlcmd/SSMS/Azure Data Studio batch execution but not directly valid via many DB drivers without batch splitting.
- Evidence:
  - database/01_create_schemas.sql lines 10-38
  - database/02_create_tables.sql line 10 and throughout
  - database/03_constraints.sql line 6 and throughout

### 2.3 Seed upsert pattern risk

- MERGE is used in seed script for plans and integration references.
- MERGE is supported in SQL Server/Azure SQL but has known operational edge cases under concurrency and trigger-heavy environments.
- Evidence:
  - database/05_seed_reference_data.sql lines 14 and 86

## 3. Naming or Constraint Issues

### 3.1 ORM compatibility gap with existing backend models (blocking for app-coupled test)

- Existing SQLAlchemy models use default-schema tables and id column naming.
- Generated DDL uses multi-schema objects and renamed PK columns (tenant_id, user_id, case_id, etc.).
- Without compatibility layer/mapping updates, current backend models will not run against this schema.
- Evidence:
  - backend/models/tenant.py lines 6-8
  - backend/models/user.py lines 7-10
  - backend/models/discharge_case.py lines 8-14
  - database/02_create_tables.sql lines 17-26, 35-43

### 3.2 Constraint strictness drift

- Document status check includes verified and voided in lower-case values.
- Prisma DocumentStatus enum is DRAFT, GENERATED, SIGNED, ARCHIVED.
- This may be intentional extension, but currently undocumented as a contract divergence.
- Evidence:
  - database/03_constraints.sql lines 516-517
  - prisma/schema.prisma line 72 and surrounding enum block

## 4. Business-Rule Mismatches

### 4.1 Phase-scope mismatch with approved design report

- Design report explicitly marked IAM/Billing tables as deferred from immediate cutover.
- DDL package includes those deferred tables in base deployment.
- This expands deployment blast radius beyond phased recommendation.
- Evidence:
  - docs/API_TO_ENTITY_AND_DATABASE_SCHEMA_DESIGN_REPORT.md line 676
  - database/02_create_tables.sql lines 510-601
  - SQL_SCHEMA_IMPLEMENTATION_PLAN.md lines 67-72

### 4.2 Source-of-truth alignment risk

- Design report and implementation plan note SQLAlchemy/Prisma reconciliation as required prior to production cutover.
- Current DDL already codifies one strict vocabulary set that conflicts with Prisma enums.
- Evidence:
  - SQL_SCHEMA_IMPLEMENTATION_PLAN.md lines 127-136
  - database/03_constraints.sql lines 492-498, 552-558

## 5. Required Fixes Before Execution

Required fixes (minimum):
1. Align check constraints to canonical enum vocabularies or formally approve divergence and update source-of-truth docs.
   - Update CK_tenant_memberships_status to include REMOVED (or revise Prisma enum).
   - Replace CANCELED with REVOKED in invitation status constraint (or revise Prisma enum).
   - Update subscription status constraint to include PAUSED and EXPIRED (or revise Prisma enum).

2. Align seed plan codes with approved plan enum vocabulary.
   - Use STARTER/PROFESSIONAL/ENTERPRISE or update enum/source model accordingly.

3. Decide deployment scope for test phase.
   - Either remove deferred IAM/Billing tables from this phase or explicitly re-approve expanded scope.

4. Define execution tool contract.
   - Confirm sqlcmd/SSMS-style runner for GO-separated scripts, or pre-split scripts for driver-based executors.

5. Replace MERGE in seed scripts (recommended hardening).
   - Use UPDATE + INSERT (NOT EXISTS) pattern for deterministic behavior under concurrency.

6. Define backend compatibility strategy before app-coupled tests.
   - Compatibility views/synonyms or coordinated ORM migration.

## 6. Final Decision

Decision: NO-GO for test database deployment in current form.

Reasoning:
- Blocking vocabulary mismatches with declared model enums.
- Seed/reference data mismatch for plan codes.
- Deployment scope drift versus deferred-entity guidance.
- App compatibility risk is unresolved for integrated tests.

Conditional upgrade path to GO (test DB):
- Apply fixes in Section 5 and re-run this pre-deployment validation checklist.

## 7. ADR Governance Addendum (Binding for Future Reviews)

Approved baseline:
- DATABASE_PHASE_ARCHITECTURAL_DECISION_RECORD_2026-03-13.md

Mandatory application in future schema validation and migration readiness reviews:
1. Treat current SQL package as schema-validation-first; no direct app-coupled production use until ORM compatibility planning is complete.
2. Keep tenant_id as light multi-tenant foundation; avoid full SaaS tenancy expansion in immediate phase.
3. Keep document persistence metadata-only in DB; binary files remain in file/object/blob storage.
4. Enforce status check constraints only when they exactly match approved cross-layer source-of-truth vocabulary.
5. Treat homecare/SHC as optional extension scope; track import mismatch as separate technical debt.
6. Keep IAM/Billing deferred from immediate executable rollout unless separately approved.

ADR-aligned deployment status baseline:
- GO for non-production schema validation
- NO-GO for production cutover
- NO-GO for direct app-coupled deployment until ORM compatibility is resolved
