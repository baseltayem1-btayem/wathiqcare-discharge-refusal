# Database Phase Architectural Decision Record (ADR)

Date: 2026-03-13
Status: Approved and Binding
Scope: Current database phase (SQL remediation, schema validation, implementation planning, migration readiness reviews)

## 1. Decision Summary

The following decisions are approved and mandatory for this phase:

1. ORM compatibility
- Current SQL design is approved for greenfield/schema-validation-first use only.
- It is not approved as an app-coupled production schema.
- No production cutover or direct ORM coupling is allowed until ORM compatibility assessment and migration/refactor planning are complete.

2. Tenant strategy
- Keep tenant_id as a light multi-tenant foundation.
- Do not introduce full SaaS tenancy complexity in this immediate rollout.

3. Document storage strategy
- Database stores document metadata only.
- Binary bodies/files remain in file/object/blob storage.
- Document tables must reference storage location and metadata, not embed binary file content.

4. Status vocabulary governance
- Status values must be governed by one approved domain vocabulary across API, backend, database, and frontend.
- No check constraint may be introduced unless it exactly matches approved source-of-truth vocabulary.

5. Homecare/SHC scope isolation
- Homecare/SHC is optional extension scope, not a core blocking dependency.
- Core workflow must remain operable without unresolved SHC/homecare technical issues.
- The current homecare import mismatch is tracked as separate technical debt.

6. IAM/Billing scope
- IAM and Billing are formally deferred from immediate rollout.
- They must remain outside executable immediate deployment unless separately approved.

## 2. Approved Deployment Status

- GO for non-production schema validation
- NO-GO for production cutover
- NO-GO for direct app-coupled deployment until ORM compatibility is resolved

## 3. Execution and Review Policy

These decisions are binding for:
- SQL remediation passes
- Static schema validation and pre-deployment reviews
- SQL implementation planning documents
- Migration readiness reviews and cutover sign-off

Any exception requires explicit written approval in repository documentation.
