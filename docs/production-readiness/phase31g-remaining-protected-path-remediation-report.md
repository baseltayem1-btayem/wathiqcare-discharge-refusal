# Phase 31G - Remaining Protected-Path Typecheck Remediation Report

## Scope
Targeted remediation for remaining protected-path TypeScript blockers only, with no workflow/security/deploy/migration behavior changes.

Protected paths validated in this phase:
- `apps/web/src/lib/server/informed-consents-template-catalog.ts`
- `apps/web/src/lib/server/evidence-package-2-service.ts`
- `apps/web/src/lib/server/public-signing-service.ts`
- `apps/web/src/lib/server/promissory-note-service.ts`
- `apps/web/src/platform/subscribers/subscriber-module-access-service.ts`
- `apps/web/src/lib/server/tenant-flag-service.ts`
- `apps/web/app/api/modules/informed-consents/documents/[id]/signature-certificate/route.ts`

## Changes Applied

### 1) `apps/web/src/lib/server/informed-consents-template-catalog.ts`
- Replaced widened enum usage with exact Prisma boundary typing/casts at failing status assignment and filter points.
- Kept all existing data and control flow intact; only type-boundary compatibility was adjusted.
- Preserved include typing for template versions and replaced map/filter type-predicate narrowing with an explicitly typed accumulator array to resolve TS2677/TS2322 without changing behavior.
- Kept section createMany `sectionKind` aligned to Prisma create-many input type boundary.

### 2) `apps/web/src/lib/server/evidence-package-2-service.ts`
- Normalized nullable event payload fields to optional shape for `recordEvidenceEvent` call:
  - `procedureName: procedureName ?? undefined`
  - `educationVersion: educationVersion ?? undefined`
  - `educationLanguage: educationLanguage ?? undefined`
- No functional behavior changes; only null/undefined typing alignment at the call boundary.

## Authoritative Validation

### A) TypeScript (authoritative)
Command:
- `cd c:\work\wathiqcare-discharge-refusal-main\apps\web && npx tsc --noEmit`

Result:
- Protected-path extraction: **0 TypeScript errors** across all protected files listed above.
- Global baseline after Phase 31G remediation:
  - `Found 467 errors in 68 files`

### B) Next.js production build (safe variant)
Command:
- `cd c:\work\wathiqcare-discharge-refusal-main\apps\web && npx next build --webpack`

Result:
- Build compiled successfully and completed static generation/traces/finalization.

### C) Scoped ESLint on protected files
Command:
- `cd c:\work\wathiqcare-discharge-refusal-main\apps\web && npx eslint "src/lib/server/informed-consents-template-catalog.ts" "src/lib/server/evidence-package-2-service.ts" "src/lib/server/public-signing-service.ts" "src/lib/server/promissory-note-service.ts" "src/platform/subscribers/subscriber-module-access-service.ts" "src/lib/server/tenant-flag-service.ts" "app/api/modules/informed-consents/documents/[id]/signature-certificate/route.ts"`

Result:
- **0 errors, 8 warnings** (`@typescript-eslint/no-unused-vars`) in pre-existing constants/helpers; no lint errors introduced by remediation.

## Decision
**PASS WITH BASELINE WAIVER POSSIBLE**

Rationale:
- Remaining protected-path blockers are cleared (0 protected-path TS errors).
- Safe production build passes.
- Remaining global TypeScript errors are outside protected scope and represent baseline debt.
- No migrations/deploy/security/session/OTP/patient-journey behavior changes were introduced in this remediation pass.
