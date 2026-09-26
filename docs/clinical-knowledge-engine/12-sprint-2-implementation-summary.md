# Clinical Knowledge Engine — Sprint 2 Implementation Summary

**Branch:** `feature/clinical-knowledge-engine-mvp`  
**Date:** 2026-06-26  
**Status:** Implementation complete, tests passing, migration file ready

---

## What Was Delivered

### 1. Additive Prisma Schema (11 MVP tables)

File: `apps/web/prisma/schema.prisma`

Added tenant-scoped, versioned, governed tables:

- `ClinicalSpecialty`
- `ClinicalProcedure`
- `ClinicalKnowledgePackage`
- `PackageItem`
- `ConsentForm`
- `ConsentFormSection`
- `EducationMaterial`
- `RiskDisclosure`
- `DecisionRule`
- `GovernanceEvent`

All additions are additive; no existing tables, columns, or enums were modified or removed.

### 2. Manual Migration File

File: `apps/web/prisma/migrations/0028_clinical_knowledge_engine_mvp.sql`

Contains PostgreSQL DDL for:

- New enums (`ClinicalKnowledgeStatus`, `ClinicalKnowledgePackageItemType`, etc.)
- All 10 essential tables with indexes, unique constraints, foreign keys
- `updated_at` triggers for mutable entities

This migration can be applied in staging/production once `DATABASE_URL` is configured.

### 3. Migration Seed Adapter

Files:

- `apps/web/src/lib/server/clinical-knowledge/migration/specialty-normalization.ts`
- `apps/web/src/lib/server/clinical-knowledge/migration/seed-from-imc.ts`
- `apps/web/scripts/seed-clinical-knowledge.ts`

Transforms `imcApprovedConsentLibrary.generated.ts` into deterministic CKE entities:

- One `ClinicalSpecialty` per unique specialty (normalized)
- One `ClinicalProcedure` per IMC entry
- One `ConsentForm` + sections per IMC entry
- One `EducationMaterial` per entry with patient-education PDF
- One specialty-level `RiskDisclosure`
- One `ClinicalKnowledgePackage` linking form/education/risks
- `GovernanceEvent` audit records for every published entity
- Default `DecisionRule` seeds

Run:

```bash
cd apps/web
npm run seed:clinical-knowledge <tenant-id> [created-by-user-id]
```

### 4. Core Services (6 primary + governance + assembly)

Directory: `apps/web/src/lib/server/clinical-knowledge/services/`

- `procedure-service.ts` — specialty & procedure catalog search
- `package-service.ts` — effective package resolution, publish
- `form-service.ts` — consent form + section retrieval
- `education-service.ts` — education material retrieval
- `risk-service.ts` — risk disclosure search
- `rule-service.ts` — active decision rules + evaluation
- `assembly-service.ts` — end-to-end knowledge package assembly
- `governance-service.ts` — immutable governance event log

All services enforce tenant isolation and throw `ApiError` on invalid access.

### 5. API Routes

Directory: `apps/web/src/app/api/modules/clinical-knowledge/`

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/procedures` | Search procedures |
| GET | `/procedures/[code]` | Procedure detail |
| GET | `/procedures/[code]/package` | Effective package for procedure |
| GET | `/forms/[id]` | Consent form detail |
| GET | `/education/[id]` | Education material detail |
| GET | `/risks` | List risk disclosures |
| POST | `/assembly` | Assemble knowledge package |
| POST | `/packages/[id]/publish` | Publish package (governance) |
| GET | `/audit` | Governance event log |

All routes:

- Require `informed-consents` module access
- Use `resolveFeatureFlag` for `ENABLE_CLINICAL_KNOWLEDGE_ENGINE` and capability flags
- Return safe fallback responses when flags are off
- Are tenant-isolated

### 6. Feature Flags

File: `apps/web/src/lib/config/feature-flags.ts`

Added 6 flags:

- `FF_ENABLE_CLINICAL_KNOWLEDGE_ENGINE`
- `FF_ENABLE_CKE_PROCEDURE_CATALOG`
- `FF_ENABLE_CKE_PACKAGE_ASSEMBLY`
- `FF_ENABLE_CKE_DECISION_RULES`
- `FF_ENABLE_CKE_INFORMED_CONSENT_UI`
- `FF_ENABLE_CKE_GOVERNANCE_UI`

All default to `false` and are documented in `.env.example`.

### 7. Informed Consent UI Integration

Files:

- `apps/web/src/components/clinical-knowledge/shared/useClinicalKnowledgeFlags.ts`
- `apps/web/src/components/clinical-knowledge/ProcedureSearch.tsx`
- `apps/web/src/components/clinical-knowledge/KnowledgePackagePreview.tsx`
- `apps/web/src/components/clinical-knowledge/DecisionSupportPanel.tsx`
- `apps/web/src/components/clinical-knowledge/ClinicalKnowledgeAssemblyPanel.tsx`

Integrated into `PhysicianConsentWorkflow.tsx` behind `ENABLE_CLINICAL_KNOWLEDGE_ENGINE` + `ENABLE_CKE_INFORMED_CONSENT_UI`. When enabled, the procedure step shows a Clinical Knowledge Engine panel for procedure search, package preview, and decision-support suggestions/blockers. When disabled, the existing workflow is unchanged.

### 8. Decision Rules

Files:

- `apps/web/src/lib/server/clinical-knowledge/rules/default-rules.ts`
- `apps/web/src/lib/server/clinical-knowledge/services/rule-service.ts`

Seeded rules cover:

- Anesthesia → witness + education recommended
- Minor patient → guardian + witness (blocking)
- Incapacitated patient → guardian + witness (blocking)
- Guardian-required status → guardian + witness (blocking)
- High-risk / critical-risk → witness + education recommended
- Non-Arabic speaker → interpreter

Rules are evaluated by priority and produce suggestions, blockers, and required participants.

### 9. Tests

Files:

- `apps/web/src/lib/server/clinical-knowledge/migration/seed-from-imc.test.ts`
- `apps/web/src/lib/server/clinical-knowledge/rules/default-rules.test.ts`
- `apps/web/src/lib/server/clinical-knowledge/services/rule-service.test.ts`
- `apps/web/src/lib/config/feature-flags.test.ts`

Updated `apps/web/package.json` test script to include CKE tests.

Test results:

```text
ℹ tests 185
ℹ pass 185
ℹ fail 0
```

---

## Validation Performed

- `npx prisma generate --schema=./prisma/schema.prisma` ✅
- `npx tsc --noEmit -p tsconfig.json` — all CKE files compile; remaining errors are pre-existing in `wathiqcare-figma-uiux`, `promissory-notes/pdf`, and `__tmp_*` files ✅
- `npm test` — 185 tests pass ✅

## Migration Application

When ready to apply in an environment with `DATABASE_URL`:

```bash
cd apps/web
npx prisma migrate dev --schema=./prisma/schema.prisma
# or apply the SQL file directly:
npx prisma db execute --schema=./prisma/schema.prisma --file=./prisma/migrations/0028_clinical_knowledge_engine_mvp.sql
```

## Known Limitations / Post-MVP

- Alternative treatment library is deferred (generic placeholder in consent sections)
- Comprehension checks are deferred
- Full governance UI is deferred (governance via DB/API for MVP)
- Package versioning UI is deferred
- `ClinicalDepartment` table is deferred (department string inlined)
- Multi-module integration (WathiqNote, Discharge Refusal) is Sprint 5+

---

## Recommendation

Sprint 2 implementation is complete and ready for internal review. The next steps are:

1. Apply migration in a non-production environment.
2. Run `npm run seed:clinical-knowledge <pilot-tenant-id>`.
3. Enable feature flags for the pilot tenant and perform shadow-read validation against the existing IMC workflow.
