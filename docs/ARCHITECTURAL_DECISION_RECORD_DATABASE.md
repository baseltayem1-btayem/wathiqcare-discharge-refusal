# Architectural Decision Record (ADR)
## Database Architecture Decisions – WathiqCare Platform

Date: [Insert Date]  
Status: Approved  
Scope: Database design phase for Discharge Refusal Workflow system

---

# 1. Purpose

This document records the approved architectural decisions governing the database design for the WathiqCare system.

These decisions apply to:

- SQL schema design
- data model structure
- workflow persistence
- document storage strategy
- tenancy architecture
- deferred system modules

These decisions must be respected in all future database changes and migrations.

---

# 2. Deployment Status

Current approval level:

GO for **non-production schema validation**

NOT approved for:

- production cutover
- direct application coupling
- ORM runtime dependency

The database schema is currently considered **validation-first architecture**.

---

# 3. ORM Compatibility Strategy

The SQL schema is treated as **greenfield architecture** during the current phase.

The existing ORM models (SQLAlchemy / Prisma) are **not yet guaranteed to be compatible** with the new schema.

Before production deployment the following must be completed:

- ORM compatibility assessment
- schema-to-model mapping review
- migration/backfill strategy (if needed)
- application integration validation

No production deployment may occur before this phase.

---

# 4. Tenant Strategy

The system retains **tenant_id support** as a light multi-tenant foundation.

However the system is not currently implementing full SaaS tenancy complexity.

Principles:

- tenant_id retained in relevant tables
- no advanced tenant partitioning required in this phase
- billing-linked tenancy deferred

This preserves future scalability without introducing unnecessary complexity.

---

# 5. Document Storage Architecture

The database stores **document metadata only**.

Binary document content must NOT be stored in SQL Server.

Actual files must be stored in:

- Object storage
- Blob storage
- File storage systems

Database tables must store only metadata such as:

- document_id
- case_id
- document_type
- storage_uri / storage_path
- mime_type
- file_name
- file_hash
- version_no
- generated_by
- created_at
- signed_at
- status

This design prevents database bloat and improves scalability.

---

# 6. Status Vocabulary Governance

All system status values must follow a **single authoritative vocabulary**.

The same vocabulary must be used across:

- API contracts
- backend services
- database constraints
- frontend application

Database check constraints may only be implemented if they exactly match the approved domain vocabulary.

Divergent status definitions across layers are prohibited.

---

# 7. Homecare / SHC Module Strategy

Homecare and SHC compliance components are treated as **optional extensions**.

They must not become a blocking dependency for the core workflow.

The core discharge refusal workflow must remain operational even if:

- SHC module is disabled
- homecare features are unavailable

Current technical issues in the homecare module remain tracked as **technical debt** and must be resolved independently.

---

# 8. IAM and Billing Modules

IAM and Billing components are **explicitly deferred** from the immediate rollout.

Immediate deployment scope includes only the core operational schemas.

IAM/Billing schemas remain in the design documentation but must not be executed in the current deployment package.

Future activation of these modules requires:

- approved API contracts
- security architecture validation
- billing workflow definition

---

# 9. Database Deployment Scope

Immediate deployment includes only core schemas:

- security (core identities only)
- workflow
- documents
- audit
- compliance
- integration

Deferred schemas:

- IAM extended controls
- billing
- subscription management

These modules will be activated in a future phase.

---

# 10. Decision Summary

The following decisions are now binding:

| Decision | Status |
|--------|--------|
Greenfield schema-first design | Approved |
Tenant ID retained | Approved |
Metadata-only document storage | Approved |
Unified status vocabulary | Approved |
Homecare/SHC isolated | Approved |
IAM/Billing deferred | Approved |

---

# 11. Next Phase

The next step is:

**Non-production schema validation**

Activities include:

- SQL execution on test database
- schema validation
- constraint verification
- query performance testing
- migration readiness evaluation

Production deployment will only be considered after:

- ORM compatibility validation
- integration testing
- data migration strategy approval.

---

End of ADR
