# Phase 32 - Tenant / Subscriber Isolation Verification Report

Date: 2026-06-01
Repository: wathiqcare-discharge-refusal
Branch: phase24-evidence-package-final

## Scope and constraints
This is a read-only verification pass only.
No deployment, migrations, SMS enablement, OTP/signing/session/token flow changes, Arabic guard changes, code edits, or patient-delivery broadening were performed.

## Final classification
SINGLE-TENANT PILOT ONLY RECOMMENDED

Reason:
- Tenant scoping is implemented in major protected runtime services and schemas.
- Subscriber module-activation governance exists in data model and admin APIs, but is not enforced at runtime module access gates.
- At least one public verification path performs cross-tenant candidate scanning without tenant filter.
- Organization/facility segmentation models requested for multi-entity isolation are not present in the inspected apps/web Prisma model.

## 1) Database / Prisma isolation
Verification source: apps/web Prisma schema and server services.

### Requested model/field presence
- Tenant: found
  - apps/web/prisma/schema.prisma:356
- Subscriber: not found as a dedicated model
  - Subscriber behavior is represented through Tenant + SubscriberModuleAccess (subscriberId references Tenant)
  - apps/web/prisma/schema.prisma:476
- Organization: not found
- Facility: not found
- Subscription: found
  - apps/web/prisma/schema.prisma:561
- ModuleAccess: not found as exact model name
  - Closest active model: SubscriberModuleAccess
  - apps/web/prisma/schema.prisma:476
- ModuleSubscription: not found
- UserTenant: not found as exact model name
  - Tenant membership appears modeled via TenantMembership/UserRoleAssignment patterns
- tenantId: found and broadly used across core clinical/legal models
- subscriberId: found in SubscriberModuleAccess
  - apps/web/prisma/schema.prisma:478
- organizationId: not found in apps/web Prisma schema
- facilityId: not found in apps/web Prisma schema

Assessment:
- Tenant-level isolation model is present and broad.
- Subscriber/module governance model exists but not as full hierarchical org/facility segmentation.

## 2) Informed Consents isolation
### Data model scoping
The following are tenant-scoped in schema with tenantId and tenant relations/indexes:
- consent documents
  - apps/web/prisma/schema.prisma:1759
- templates
  - apps/web/prisma/schema.prisma:1622
- template versions
  - apps/web/prisma/schema.prisma:1658
- education packages (procedure education models)
  - apps/web/prisma/schema.prisma:1915
  - apps/web/prisma/schema.prisma:1945
- audit events
  - apps/web/prisma/schema.prisma:1891
  - apps/web/prisma/schema.prisma:2266
- evidence packages
  - apps/web/prisma/schema.prisma:2311
  - apps/web/prisma/schema.prisma:2330
- PDF/legal evidence metadata is stored on tenant-scoped consent documents and evidence package artifacts.

### Signing sessions / secure tokens
- Signing session/token persistence is implemented via SQL tables signing_sessions and signing_secure_tokens in signature orchestration service, not Prisma models.
- SQL writes and reads carry tenant_id and token/session linkage.
  - apps/web/src/lib/server/signature-orchestration-service.ts:86
  - apps/web/src/lib/server/signature-orchestration-service.ts:116
  - apps/web/src/lib/server/signature-orchestration-service.ts:189

Assessment:
- Informed-consents protected records are tenant-scoped in primary flows.
- Signing session/token storage is tenant-aware but outside Prisma model governance.

## 3) Electronic Promissory Notes isolation
### Data model and service scoping
- promissory notes are tenant-scoped in schema
  - apps/web/prisma/schema.prisma:821
- issuer/editor flow is tenant-scoped in service methods
  - list path filters by tenantId
    - apps/web/src/lib/server/promissory-note-service.ts:87
  - create path validates case by tenantId and writes tenantId
    - apps/web/src/lib/server/promissory-note-service.ts:132
    - apps/web/src/lib/server/promissory-note-service.ts:161

### API scoping
- note detail route enforces tenantId in where clause
  - apps/web/app/api/modules/promissory-notes/[id]/route.ts:23
- PDF route enforces tenantId in where clause
  - apps/web/app/api/modules/promissory-notes/[id]/pdf/route.ts:130

### Secure links / signing sessions / PDF/evidence / audit events
- Promissory notes use tenant-scoped records and audit-chain/audit-log writes through tenantId.
- Dedicated promissory signing-session Prisma models are not present; shared signing tables are used via orchestration SQL.

Assessment:
- Promissory module appears tenant-scoped in core service/API flows.
- Shared signing infrastructure remains SQL-table based and should be revalidated in multi-tenant hardening.

## 4) API enforcement check
### /api/modules/informed-consents
- Routes enforce module auth gate via requireModuleOperationalAccess.
  - apps/web/app/api/modules/informed-consents/documents/route.ts:13
- Backing services enforce tenantId-scoped queries broadly.
  - apps/web/src/lib/server/consent-library-service.ts:1222
  - apps/web/src/lib/server/consent-library-service.ts:1306

### /api/public-signing and /api/sign
- Public/token routes do not require user auth by design, but derive tenantId from validated token context and then query by tenantId+documentId.
  - apps/web/src/lib/server/public-signing-service.ts:1470
  - apps/web/src/lib/server/public-signing-service.ts:1009
  - apps/web/src/lib/server/public-signing-service.ts:1501

### Promissory note APIs
- Require module access and tenant-scoped queries.
  - apps/web/app/api/modules/promissory-notes/route.ts:15
  - apps/web/app/api/modules/promissory-notes/[id]/route.ts:23
  - apps/web/app/api/modules/promissory-notes/[id]/pdf/route.ts:130

### Subscriber/module access APIs
- Tenant-scoped route with tenant/platform permission checks exists.
  - apps/web/app/api/tenants/[tenantId]/module-access/route.ts:32
  - apps/web/app/api/tenants/[tenantId]/module-access/route.ts:90
- Platform proxy route requires platform access.
  - apps/web/app/api/platform/tenants/[tenantId]/module-access/route.ts:26

### Tenant/admin APIs
- Tenant endpoints use requireTenantAccess/requireTenantPermission.
  - apps/web/app/api/tenants/[tenantId]/route.ts:148
- Platform admin endpoints use requirePlatformAccess.
  - apps/web/app/api/admin/setup/status/route.ts:12

### Audit/evidence APIs
- Tenant admin evidence route requires auth and tenant operational mode; service filters by tenantId.
  - apps/web/app/api/admin/evidence/route.ts:10
  - apps/web/src/lib/server/evidence-package-2-service.ts:485

Key exception:
- Public evidence verify endpoint uses token lookup function that scans finalized documents without tenant filter.
  - apps/web/app/api/modules/informed-consents/evidence/verify/[token]/route.ts:14
  - apps/web/src/lib/server/informed-consents-evidence-vault-service.ts:285
  - apps/web/src/lib/server/informed-consents-evidence-vault-service.ts:295

## 5) Frontend/UI exposure
- Module pages require authenticated page claims and tenant-backed claim resolution.
  - apps/web/src/lib/server/pageAuth.ts:22
  - apps/web/src/lib/server/pageAuth.ts:49
- Module page access is role-based via module catalog gates.
  - apps/web/app/modules/informed-consents/page.tsx:16
  - apps/web/app/modules/promissory-notes/page.tsx:9
  - apps/web/src/components/ModulePortalPage.tsx:108

Assessment:
- UI session and tenant claim checks are present.
- UI/module visibility is role-driven, not subscriber module activation-driven.

## 6) Module activation enforcement
Requested modules:
- Informed Consents
- Electronic Promissory Notes

Found:
- SubscriberModuleAccess model and management APIs exist.
  - apps/web/prisma/schema.prisma:476
  - apps/web/app/api/tenants/[tenantId]/module-access/route.ts:142

Gap:
- Runtime gate requireModuleOperationalAccess checks role/platform role only via canAccessModule.
- It does not check SubscriberModuleAccess status for the caller tenant.
  - apps/web/src/lib/server/auth.ts:436
  - apps/web/src/lib/server/auth.ts:446
  - apps/web/src/lib/modules/catalog.ts:117

Assessment:
- Module activation data exists but is not fully enforced in runtime request admission.

## 7) Cross-tenant risk findings
1. Public evidence verification token path is not tenant-scoped in DB query.
- verifyEvidenceToken loads up to 500 finalized consent documents across tenants, then matches token in memory.
- Location:
  - apps/web/src/lib/server/informed-consents-evidence-vault-service.ts:295
- Risk:
  - Cross-tenant search surface exists in a public endpoint; token secrecy mitigates but does not equal tenant-bound query enforcement.

2. Subscriber module activation is not enforced at module runtime gates.
- requireModuleOperationalAccess allows based on role; does not call subscriber-module status checks.
- Locations:
  - apps/web/src/lib/server/auth.ts:436
  - apps/web/src/platform/subscribers/subscriber-module-access-service.ts:265
- Risk:
  - Tenant users with eligible role may access a module even if subscriber module status is inactive/suspended.

3. Requested organization/facility segmentation not found in apps/web Prisma model.
- Missing dedicated Organization/Facility model boundaries and organizationId/facilityId fields in inspected schema.
- Risk:
  - Multi-entity isolation granularity is limited to tenant boundary.

4. Signing persistence uses raw SQL tables outside Prisma model.
- tenant_id is included, but policy consistency relies on SQL call discipline.
- Location:
  - apps/web/src/lib/server/signature-orchestration-service.ts:86
- Risk:
  - Harder to centrally enforce schema-level tenant guardrails than full Prisma-modeled access paths.

## 8) Decision by required rule
Result from this verification:
- Isolation status is not fully enforced for multi-subscriber controlled pilot at runtime due to module-activation and public verify-path gaps.

Decision applied:
- Controlled pilot may proceed only as SINGLE-TENANT PILOT with no broad subscriber rollout.
- No multi-tenant pilot approval from this Phase 32 verification.

Operational guardrails for pilot continuation:
- Keep pilot tenant fixed and explicitly allowlisted.
- Keep physician/department/patient scope constrained per Phase 31H package.
- Keep direct monitoring and immediate rollback if protected-path runtime fails.
- Do not broaden to multi-tenant/subscriber rollout until runtime module-activation enforcement and public verify-path tenant hardening are completed and re-verified.
