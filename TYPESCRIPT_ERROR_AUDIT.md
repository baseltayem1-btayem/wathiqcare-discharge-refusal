# TYPESCRIPT_ERROR_AUDIT

## Command executed
`npx tsc -p apps/web/tsconfig.json --noEmit`

## Baseline error snapshot (before fixes)
Total errors: **4**

| File | TS Error | Classification | Production Risk |
|---|---|---|---|
| `apps/web/smoke-modules.spec.ts` | `TS2339` (`toBe` on inferred `never`) | Legacy unrelated (test-only) | Low |
| `apps/web/src/lib/core/wording-repository-service.test.ts` | `TS2741` missing `enContent` in test fixture | Legacy unrelated (test-only) | Low |
| `apps/web/src/lib/server/password-login-policy.test.ts` | `TS2554` wrong function arity (x2) | Shared UI/Auth related (test-only) | Low |

## Required classification summary
- **Discharge Refusal related:** 0
- **Shared UI related:** 2 (password-login-policy test arity x2)
- **Legacy unrelated:** 2
- **Safe-to-ignore temporary:** 0 (fixed instead of ignored)
- **Production-risk errors:** 0 (all baseline errors were test-layer only)

## Fixes applied
1. Removed tautological matcher usage in `apps/web/smoke-modules.spec.ts` that caused invalid `expect` typing.
2. Added `enContent: ''` to bilingual negative fixture in `apps/web/src/lib/core/wording-repository-service.test.ts` to keep strict model shape while preserving validation intent.
3. Updated `apps/web/src/lib/server/password-login-policy.test.ts` to match current `userTypeForUserRole(role)` signature.

## Post-fix result
Re-ran:
- `npx tsc -p apps/web/tsconfig.json --noEmit`

Result: **0 TypeScript errors** ✅

## Discharge Refusal impact statement
No unresolved TypeScript issues remain affecting:
- case workflow
- legal readiness
- witness flow
- consent evidence
- OTP/signature logic
- PDF generation
- legal package generation
- audit timeline
- multilingual rendering

Status: **PASS** ✅
