# File Impact List — Content Mapping Engine Integration

## New Files

| Path | Purpose |
|------|---------|
| `apps/web/src/lib/server/content-mapping-service.ts` | Production service that resolves procedure → consent form + education material using Prisma. |
| `apps/web/src/app/api/modules/informed-consents/content-mapping/resolve/route.ts` | Next.js API route handler for `GET /api/modules/informed-consents/content-mapping/resolve`. |
| `apps/web/prisma/migrations/..._procedure_catalog_template_link/` | Optional migration to link `ConsentProcedureCatalog` ↔ `ConsentTemplate` if no relation exists. |

## Modified Files

### Core workflow

| Path | Change |
|------|--------|
| `apps/web/src/components/informed-consents/enterprise-workflow/PhysicianConsentWorkflow.tsx` | Update `resolveImcPackage` `useEffect` (~line 853) to call `/content-mapping/resolve` when `FEATURE_CONTENT_MAPPING_ENGINE` is enabled. Adjust stepper logic for education N/A. |
| `apps/web/src/components/informed-consents/enterprise-workflow/ImcApprovedLibraryCard.tsx` | Ensure card renders mapping result fields (procedure consent, patient education, anesthesia consent). |

### Configuration & feature flags

| Path | Change |
|------|--------|
| `apps/web/src/lib/config/feature-flags.ts` | Add `FEATURE_CONTENT_MAPPING_ENGINE = envBool("FF_FEATURE_CONTENT_MAPPING_ENGINE", false)`. |
| `apps/web/src/lib/server/tenant-flag-service.ts` | Register `FEATURE_CONTENT_MAPPING_ENGINE` as a tenant/module overridable flag. |

### Audit & services

| Path | Change |
|------|--------|
| `apps/web/src/lib/server/consent-library-service.ts` | Add audit event calls from the mapping service and workflow steps. |
| `apps/web/src/lib/server/education-library-service.ts` | Optionally reuse education asset lookup helpers. |

### Types / shared

| Path | Change |
|------|--------|
| `apps/web/src/lib/server/informed-consents-saudi-template-library.ts` | May need to align template codes with catalog mappings. |

## Unchanged / Do Not Touch

| Path | Reason |
|------|--------|
| `apps/web/src/app/modules/informed-consents/*` (except new route) | Existing workflow pages remain unchanged. |
| `apps/web/src/lib/server/public-signing-service.ts` | Patient-facing signing pipeline; no changes. |
| `apps/web/src/lib/server/module-secure-signing-service.ts` | Secure link issuance; no changes. |
| `apps/web/src/lib/server/signature-orchestration-service.ts` | Signing sessions; no changes. |
| OTP/SMS/PDF generation modules | Explicitly out of scope. |
| WathiqNote modules (`/modules/promissory-notes`, `/modules/discharge-refusal`) | Out of scope. |

## Database Objects

### Read-only (used by service)

- `ConsentProcedureCatalog`
- `ConsentProcedureRiskItem`
- `ConsentProcedureAlternative`
- `ConsentTemplate`
- `ConsentTemplateVersion`
- `ConsentTemplateLocalization`
- `ProcedureEducation`
- `ProcedureEducationVersion`
- `ProcedureEducationAsset`

### Written to

- `ConsentAuditEvent`
- `AuditLog`
- `AuditChainEvent`
- `ConsentTimelineEvent`

### Potential schema addition

- New relation table `ConsentProcedureCatalogTemplate` (or extension of existing relation) to link a procedure catalog entry to its default consent template.
