# Phase 31E Final Production-Critical Typecheck Remediation Report

Date: 2026-06-01
Scope: Final constrained remediation pass on the remaining 5 production-critical files only.
Decision rule: Stop if any production-critical errors remain in the 5-file slice; otherwise finalize with build, typecheck, scoped lint, and recommendation.

## Guardrails Observed

- No landing/request-demo/OTP branding files modified.
- No changes to `ApprovedPatientWorkflow.tsx`.
- No patient journey behavior changes.
- No OTP workflow changes.
- No token/session validation bypass.
- No Arabic guard disablement.
- No email/SMS behavior changes.
- No migrations run.
- No deployment.
- No broad refactor.

## Files Changed

- `apps/web/src/platform/subscribers/subscriber-module-access-service.ts`
- `apps/web/src/lib/server/tenant-flag-service.ts`
- `apps/web/src/lib/server/legal-package-module-service.ts`
- `apps/web/src/lib/server/promissory-note-service.ts`
- `apps/web/src/lib/server/public-signing-service.ts`

## Exact Remaining Errors Before Phase 31E Final Pass

Authoritative before-state slice from the earlier terminal `tsc` artifact:

### `src/platform/subscribers/subscriber-module-access-service.ts`

1. `src/platform/subscribers/subscriber-module-access-service.ts:59:11 - error TS2322: Type 'string' is not assignable to type 'SubscriberModuleAccessStatus'.`
2. `src/platform/subscribers/subscriber-module-access-service.ts:60:11 - error TS2322: Type 'string' is not assignable to type 'SubscriberModuleAccessStatus'.`
3. `src/platform/subscribers/subscriber-module-access-service.ts:65:7 - error TS2322: Type 'string' is not assignable to type 'SubscriberModuleAccessStatus | EnumSubscriberModuleAccessStatusFieldUpdateOperationsInput | undefined'.`
4. `src/platform/subscribers/subscriber-module-access-service.ts:204:7 - error TS2322: Type 'string' is not assignable to type 'SubscriberModuleAccessStatus | EnumSubscriberModuleAccessStatusFieldUpdateOperationsInput | undefined'.`
5. `src/platform/subscribers/subscriber-module-access-service.ts:216:7 - error TS2322: Type 'string' is not assignable to type 'SubscriberModuleAccessStatus | undefined'.`
6. `src/platform/subscribers/subscriber-module-access-service.ts:242:11 - error TS2322: Type 'string' is not assignable to type 'SubscriberModuleAccessStatus | undefined'.`

### `src/lib/server/tenant-flag-service.ts`

1. `src/lib/server/tenant-flag-service.ts:72:9 - error TS2322: Type 'string' is not assignable to type 'FeatureFlagScope'.`
2. `src/lib/server/tenant-flag-service.ts:85:7 - error TS2322: Type 'string' is not assignable to type 'FeatureFlagScope'.`
3. `src/lib/server/tenant-flag-service.ts:142:9 - error TS2322: Type 'string' is not assignable to type 'FeatureFlagScope'.`
4. `src/lib/server/tenant-flag-service.ts:178:11 - error TS2322: Type 'string' is not assignable to type 'FeatureFlagScope | EnumFeatureFlagScopeFilter<"FeatureFlagOverride"> | undefined'.`
5. `src/lib/server/tenant-flag-service.ts:179:11 - error TS2322: Type 'string' is not assignable to type 'FeatureFlagScope | EnumFeatureFlagScopeFilter<"FeatureFlagOverride"> | undefined'.`
6. `src/lib/server/tenant-flag-service.ts:180:11 - error TS2322: Type 'string' is not assignable to type 'FeatureFlagScope | EnumFeatureFlagScopeFilter<"FeatureFlagOverride"> | undefined'.`

### `src/lib/server/legal-package-module-service.ts`

1. `src/lib/server/legal-package-module-service.ts:399:7 - error TS2322: Type 'string' is not assignable to type 'DocumentType'.`
2. `src/lib/server/legal-package-module-service.ts:400:7 - error TS2322: Type 'string' is not assignable to type 'DocumentStatus | undefined'.`
3. `src/lib/server/legal-package-module-service.ts:809:7 - error TS2322: Type 'string' is not assignable to type 'DocumentType'.`
4. `src/lib/server/legal-package-module-service.ts:810:7 - error TS2322: Type 'string' is not assignable to type 'DocumentStatus | undefined'.`
5. `src/lib/server/legal-package-module-service.ts:836:7 - error TS2322: Type 'string' is not assignable to type 'DocumentType'.`
6. `src/lib/server/legal-package-module-service.ts:837:7 - error TS2322: Type 'string' is not assignable to type 'DocumentStatus | undefined'.`

### `src/lib/server/promissory-note-service.ts`

1. `src/lib/server/promissory-note-service.ts:98:5 - error TS2322: Type '{ status?: string | undefined; caseId?: string | undefined; tenantId: string; }' is not assignable to type 'PromissoryNoteWhereInput'.`
2. `src/lib/server/promissory-note-service.ts:175:7 - error TS2322: Type 'string' is not assignable to type 'PromissoryNoteStatus | undefined'.`

### `src/lib/server/public-signing-service.ts`

1. `src/lib/server/public-signing-service.ts:2357:7 - error TS2322: Type 'string' is not assignable to type 'ConsentMethod'.`

Before-state production-critical count: 21 errors in 5 files.
Before-state global total: 509 errors in 75 files.

## Fixes Applied

The remediation remained fully local to the 5 files above and focused only on Prisma enum/input boundary typing.

### Common strategy used

- Stopped relying on derived enum aliases that still widened to `string` under this Prisma client generation.
- Typed the failing call-site object literals as exact `Prisma.*Args` objects.
- Converted spread-built filter objects into explicit stepwise construction where needed to prevent widening.
- Used exact Prisma filter/value casts only at the failing persistence/query boundaries.

### Per-file summary

#### `apps/web/src/platform/subscribers/subscriber-module-access-service.ts`

- Wrapped failing `updateMany` and `upsert` payloads in exact Prisma arg types:
  - `Prisma.SubscriberModuleAccessUpdateManyArgs`
  - `Prisma.SubscriberModuleAccessUpsertArgs`
- Preserved all subscriber activation/suspension behavior.

#### `apps/web/src/lib/server/tenant-flag-service.ts`

- Wrapped `upsert`, `findMany`, and `findUnique` payloads in exact Prisma arg types:
  - `Prisma.FeatureFlagOverrideUpsertArgs`
  - `Prisma.FeatureFlagOverrideFindManyArgs`
  - `Prisma.FeatureFlagOverrideFindUniqueArgs`
- Preserved feature flag resolution logic and scope precedence.

#### `apps/web/src/lib/server/legal-package-module-service.ts`

- Wrapped the failing document creation payloads in `Prisma.DocumentCreateArgs`.
- Preserved document type/status values and all legal package generation behavior.

#### `apps/web/src/lib/server/promissory-note-service.ts`

- Wrapped `findMany` and `create` payloads in exact Prisma arg types:
  - `Prisma.PromissoryNoteFindManyArgs`
  - `Prisma.PromissoryNoteCreateArgs`
- Replaced spread-based `where` construction with explicit assignment.
- Converted the final status constraint to an explicit Prisma filter object.
- Preserved promissory note listing/creation behavior.

#### `apps/web/src/lib/server/public-signing-service.ts`

- Wrapped the signature creation payload in `Prisma.ConsentDocumentSignatureCreateArgs`.
- Preserved OTP signature evidence flow and return shape semantics.

## Final Validation

### Typecheck Result

Command:

```powershell
cd c:\work\wathiqcare-discharge-refusal-main\apps\web
npx tsc --noEmit
```

Result: PASS for the production-critical 5-file slice, baseline still present globally.

Final authoritative 5-file slice from the last `tsc` run:

- `src/platform/subscribers/subscriber-module-access-service.ts`: 0 errors
- `src/lib/server/tenant-flag-service.ts`: 0 errors
- `src/lib/server/legal-package-module-service.ts`: 0 errors
- `src/lib/server/promissory-note-service.ts`: 0 errors
- `src/lib/server/public-signing-service.ts`: 0 errors

Production-critical error count after: 0 errors in 5 files.
Remaining global baseline count after: 488 errors in 70 files.

### Build Result

Because `npm run build` in this repo invokes a migration runner and the user explicitly prohibited running migrations, a safe production build verification command was used instead:

```powershell
cd c:\work\wathiqcare-discharge-refusal-main\apps\web
npx next build --webpack
```

Result: PASS

Summary:

- Next.js 16.2.4 webpack production build compiled successfully.
- Static page generation and build trace collection completed successfully.
- No migration runner was invoked.

### Scoped Lint Result

Command:

```powershell
cd c:\work\wathiqcare-discharge-refusal-main\apps\web
npx eslint src/platform/subscribers/subscriber-module-access-service.ts src/lib/server/tenant-flag-service.ts src/lib/server/legal-package-module-service.ts src/lib/server/promissory-note-service.ts src/lib/server/public-signing-service.ts
```

Result: PASS

## Remaining Errors Classification

- Remaining errors are baseline only.
- No remaining errors were found in the 5 production-critical files targeted by this phase.
- Remaining global errors still exist in unrelated server/API, script, test, archival, and broader baseline files outside this constrained Phase 31E scope.

## Final Recommendation

PASS WITH BASELINE OBSERVATIONS

Rationale:

- The requested production-critical 21-error slice was reduced to zero using minimal, type-safe, local fixes in the 5 permitted files only.
- The safe production build verification passed.
- Scoped lint for the touched files passed.
- Global baseline typecheck debt remains, but it is outside the constrained 5-file production-critical scope for this phase.
