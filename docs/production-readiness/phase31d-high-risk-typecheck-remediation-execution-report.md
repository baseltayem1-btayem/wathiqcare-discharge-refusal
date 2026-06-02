# Phase 31D High-Risk Typecheck Remediation Execution Report

Date: 2026-06-01
Scope: Execute only minimal safe A+B+C fixes in production-critical paths, then revalidate.
Decision rule: Stop if any A remains, or if any B/C remain in production-critical paths.

## Guardrails Observed

- No deployment.
- No production migration.
- No OTP workflow logic changes.
- No patient journey behavior changes.
- No signing/session/token validation bypass.
- No Arabic guard disablement.
- No landing/request-demo changes beyond previously retained clean scope.

## Files Changed

- apps/web/src/lib/projection/unified-disclosure-types.ts
- apps/web/src/lib/server/promissory-note-service.ts
- apps/web/src/lib/server/tenant-flag-service.ts
- apps/web/src/platform/subscribers/subscriber-module-access-service.ts
- apps/web/src/lib/server/public-signing-service.ts
- apps/web/src/lib/server/legal-package-module-service.ts

## Execution Summary

### Bucket A Before/After

- Before: 2 errors in 2 files.
- Files:
	- src/lib/projection/unified-disclosure-projection.ts
	- src/lib/projection/unified-disclosure-shadow-mode.ts
- Action taken: restored the missing shared contract module at src/lib/projection/unified-disclosure-types.ts.
- After: 0 unresolved Bucket A module-resolution blockers in the final authoritative run.

### Bucket B Before/After

- Baseline before execution: 76 errors in 32 files.
- Action taken: localized Prisma enum/input typing fixes only in the following production-critical services:
	- src/lib/server/promissory-note-service.ts
	- src/lib/server/tenant-flag-service.ts
	- src/platform/subscribers/subscriber-module-access-service.ts
	- src/lib/server/public-signing-service.ts
	- src/lib/server/legal-package-module-service.ts
- Final state: Bucket B is reduced but not cleared. The final authoritative typecheck still reports production-critical Prisma/input mismatches in 5 files.

### Bucket C Before/After

- Baseline before execution: 219 errors in 49 files.
- Action taken: no broad Bucket C sweep; only adjacent type-contract corrections necessary to validate the touched high-risk services.
- Final state: production-critical high-risk errors remain in the same 5-file slice below, so Bucket C cannot be considered cleared for pilot readiness.

## Final Validation

### Build Result

- Command: npm run build
- Result: PASS
- Notes:
	- Prisma generate succeeded.
	- SQL migration runner printed: [sql-migrations] Skipping — local/placeholder DB URL detected.
	- Next.js webpack production build completed successfully.

### Typecheck Result

- Command: npx tsc --noEmit
- Result: FAIL
- Final total: 509 errors in 75 files.

### Retained Frontend Scope Lint

- Command: retained-scope eslint run over landing/request-demo/OTP branding wrappers and shared components.
- Result: PASS

## Remaining High-Risk Errors

The final authoritative typecheck still reports 21 production-critical errors across 5 files:

- 6 errors: src/platform/subscribers/subscriber-module-access-service.ts
- 6 errors: src/lib/server/tenant-flag-service.ts
- 6 errors: src/lib/server/legal-package-module-service.ts
- 2 errors: src/lib/server/promissory-note-service.ts
- 1 error: src/lib/server/public-signing-service.ts

These are still within production-critical B/C paths, so the stop condition is met.

## Remaining Error Count

- Total remaining errors: 509
- Total remaining files: 75
- Remaining production-critical A/B/C-path errors in touched slice: 21 across 5 files

## Are Remaining Errors D/E Only?

- No.
- Bucket A appears cleared.
- Buckets B/C still remain in production-critical service paths.

## Controlled Production Pilot Decision

STOP

Controlled Production Pilot should not proceed on the basis of the final Phase 31D execution state, because high-risk B/C errors remain in production-critical services.

## Notes

- Direct npx tsc --noEmit was treated as authoritative for the decision.
- Editor/get_errors diagnostics reported no errors in several touched files during the same phase, but direct tsc continued to report the remaining production-critical failures.
