# Phase 31F Controlled Pilot Baseline Waiver and Final Go/No-Go Package

Date: 2026-06-01
Scope: Final review of the remaining global baseline after Phase 31E, with no code changes, no deployment, no migrations, and no behavior changes.
Decision rule: If any remaining baseline error still affects protected production paths, classify as STOP.

## Executive Summary

Phase 31E successfully cleared the targeted 5-file production-critical typecheck slice and validated a safe production build plus scoped lint. However, the final authoritative `npx tsc --noEmit` baseline still contains 488 errors in 70 files, and those remaining errors are not confined to non-critical areas.

The remaining baseline still affects protected production paths, specifically:

- Informed Consents
- audit/evidence

Because protected production paths remain affected, a controlled pilot baseline waiver cannot be granted at this time.

## Phase 31E Result

Reference: `docs/production-readiness/phase31e-final-production-critical-typecheck-remediation-report.md`

Confirmed outcomes from Phase 31E:

- Production-critical 5-file slice reduced from 21 errors to 0.
- Targeted files remained limited to:
  - `apps/web/src/platform/subscribers/subscriber-module-access-service.ts`
  - `apps/web/src/lib/server/tenant-flag-service.ts`
  - `apps/web/src/lib/server/legal-package-module-service.ts`
  - `apps/web/src/lib/server/promissory-note-service.ts`
  - `apps/web/src/lib/server/public-signing-service.ts`
- No protected workflow behavior was changed.
- Phase 31E recommendation: PASS WITH BASELINE OBSERVATIONS.

## Safe Build Result

Command used:

```powershell
cd c:\work\wathiqcare-discharge-refusal-main\apps\web
npx next build --webpack
```

Result: PASS

Notes:

- This command was used instead of `npm run build` to avoid invoking the repo build script that runs the migration runner.
- No migrations were run.
- No deployment was performed.

## Scoped Lint Result

Command used:

```powershell
cd c:\work\wathiqcare-discharge-refusal-main\apps\web
npx eslint src/platform/subscribers/subscriber-module-access-service.ts src/lib/server/tenant-flag-service.ts src/lib/server/legal-package-module-service.ts src/lib/server/promissory-note-service.ts src/lib/server/public-signing-service.ts
```

Result: PASS

## Remaining Baseline Error Count

Authoritative command:

```powershell
cd c:\work\wathiqcare-discharge-refusal-main\apps\web
npx tsc --noEmit
```

Final remaining baseline:

- 488 errors
- 70 files

## Protected Production Paths Review

The remaining baseline was reviewed against the required protected production paths:

- Informed Consents
- Electronic Promissory Notes
- tenant/subscriber isolation
- public signing
- audit/evidence
- landing/request-demo
- OTP branding

### Confirmed Protected Paths Still Affected

#### Informed Consents

The final authoritative typecheck baseline still includes remaining errors in:

- `src/lib/server/informed-consents-template-catalog.ts`

Examples from the final baseline include:

- enum/type assignment failures for `ConsentTemplateStatus`
- create-many payload shape mismatch for consent template sections
- missing `versions` property on an inferred consent template shape

These are not archival-only or test-only issues. They remain in live Informed Consents server code.

#### audit/evidence

The final authoritative typecheck baseline still includes remaining errors in:

- `src/lib/server/evidence-package-2-service.ts`

Examples from the final baseline include:

- `string | null` to `string | undefined` assignment failures
- `Date | null` to `Date | undefined` assignment failures
- baseline errors on OTP/evidence-related fields such as `otpSentTime`, `otpVerificationTime`, and `otpVerificationStatus`

These remain inside the audit/evidence path and therefore are still production-critical for controlled pilot approval.

### Protected Paths Confirmed Clear In The Final Phase 31E Slice Or Final Review

The following protected areas were confirmed clean enough for this Phase 31F decision, based on the final Phase 31E validation and the final authoritative run review:

- `src/lib/server/promissory-note-service.ts`
- `src/lib/server/public-signing-service.ts`
- `src/platform/subscribers/subscriber-module-access-service.ts`
- `src/lib/server/tenant-flag-service.ts`
- `app/page.tsx`
- `app/[lang]/page.tsx`
- `app/[lang]/request-demo/page.tsx`
- `src/components/landing/WathiqcareWhiteLanding.tsx`

This means the STOP decision is not based on landing/request-demo, OTP branding, or the specific 5-file Phase 31E slice.

## Are Remaining Errors Outside Production-Critical Paths?

No.

The remaining 488-error baseline still includes protected production paths. The presence of remaining errors in `src/lib/server/informed-consents-template-catalog.ts` and `src/lib/server/evidence-package-2-service.ts` is sufficient on its own to block a baseline waiver.

## Waiver Rationale

A baseline waiver is only acceptable if the remaining typecheck debt is limited to non-critical baseline categories such as:

- tests
- scripts
- archival or obsolete development files
- clearly non-runtime internal artifacts

That condition is not met.

The current baseline still reaches live protected runtime paths, so a controlled pilot waiver would create an unjustified release exception in areas that were explicitly designated as production-critical.

## Waiver Restrictions

A waiver package was requested with the following intended restrictions:

- pilot only, not full production
- limited users
- limited departments
- email-only unless SMS separately approved
- direct monitoring
- no broad tenant rollout until full baseline cleanup
- no full production until global typecheck is clean or formally accepted

These restrictions are valid as governance controls, but they are not sufficient to override the remaining critical-path typecheck exposure identified above.

## Monitoring Obligations

If Phase 31F had been eligible for a waiver, the following would have been mandatory:

- direct operational monitoring during pilot
- explicit incident watch on informed consent issuance and evidence generation paths
- rollback trigger on any runtime error in protected workflows
- no expansion beyond approved pilot scope without further gate review

Because the decision is STOP, these obligations remain preparatory only and do not authorize progression.

## Rollback Condition

If any controlled pilot had been authorized, rollback would have been mandatory on the first confirmed runtime issue involving:

- Informed Consents issuance or template lifecycle
- audit/evidence package generation or OTP evidence capture
- token/session/signing validation
- Arabic guard or protected patient journey behaviors

Because this package is STOP, no rollout should occur and rollback logic does not activate.

## Final Decision

STOP - CRITICAL ERRORS REMAIN

## Final Determination Summary

Why STOP was issued:

- Phase 31E successfully cleared the targeted 5-file production-critical remediation slice.
- The safe build passed.
- Scoped lint passed.
- The remaining global baseline is still 488 errors in 70 files.
- The remaining baseline still affects protected runtime production paths, including:
  - `src/lib/server/informed-consents-template-catalog.ts`
  - `src/lib/server/evidence-package-2-service.ts`

Therefore the requested final output for Phase 31F is:

STOP
