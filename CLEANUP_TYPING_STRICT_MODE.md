# Phase 12 — Typing & Build Hardening (Post-Stabilization Cleanup)

> Status: **Planned (not started).** Do not execute during the current
> production stabilization window. This document tracks debt accepted
> in commit `82f6e23` and the follow-up `vercel.json` turbopack
> alignment so future cleanup work has a clear scope.

## Context

To unblock git-triggered Vercel auto-deploys after the Phase 11
production cutover (deploy `6d4yiccmy`, alias `wathiqcare.online`),
we aligned the Vercel build path with the working local/turbopack
flow:

- `apps/web/vercel.json` `buildCommand`: switched from
  `next build --webpack` → `next build` (Turbopack).
- Turbopack honors `next.config.js` `typescript.ignoreBuildErrors: true`,
  whereas the webpack path runs a separate post-compile
  `Running TypeScript ...` step that ignores that flag and fails on
  any strict type error.
- A temporary shim at
  [apps/web/src/types/prisma-enum-compat.d.ts](apps/web/src/types/prisma-enum-compat.d.ts)
  widens all Prisma enums to `string` for legacy call sites.

Runtime behavior is unchanged. Production parity with the verified
CLI-uploaded deploy is preserved.

## Cleanup Goals

1. **Remove the Prisma enum compatibility shim.**
   - Delete `apps/web/src/types/prisma-enum-compat.d.ts`.
   - Audit all consumers that rely on enum-as-string behavior
     (search for `as UserType`, `as CaseStatus`, `as DocumentStatus`,
     `as PlanCode`, `as CaseType`, etc., plus untyped string
     assignments to `data.<enumField>` in `prisma.*.create/update`).

2. **Enum normalization layer.**
   - Introduce a single `src/lib/server/enum-normalizers.ts` that maps
     external strings (HTTP payloads, JSON, env vars) → strict Prisma
     enums with a typed fallback/throw.
   - Replace ad-hoc string→enum conversions in API routes.

3. **Fix the remaining ~36 strict type errors.**
   - Initial known sites (snapshot prior to cleanup; rerun
     `npx tsc --noEmit` to refresh the list):
     - `app/api/auth/microsoft/route.ts:124` (`userType`)
     - `app/api/billing/plans/route.ts:71` (`PlanCode`)
     - `app/api/cases/[caseId]/route.ts:98` (`CaseStatus`)
     - `app/api/cases/route.ts:52`, `:115` (`CaseStatus`, `CaseType`)
     - `app/api/documents/[documentId]/route.ts:98` (`DocumentStatus`)
     - `app/api/internal/dynamic-consent/pdf-preview/route.ts:231`
       (`Uint8Array` → `BodyInit`)
     - `app/api/platform/users/create/route.ts`,
       `app/api/platform/users/route.ts`,
       `app/api/tenant/users/create/route.ts` (`UserType`)
     - plus other enum sites surfaced once the shim is removed.

4. **Switch Vercel back to the strict webpack build path.**
   - Restore `apps/web/vercel.json` `buildCommand` to use
     `next build --webpack`.
   - Set `typescript.ignoreBuildErrors: false` in `next.config.js`.
   - Set `eslint.ignoreDuringBuilds: false` (track separately if any
     lint errors remain).

5. **Full strict TS enforcement.**
   - `tsconfig.json`: enable `"strict": true` (verify not already on),
     `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`.
   - Wire `npx tsc --noEmit` into CI as a required check.

## Out of Scope (Explicitly Deferred)

- Refactoring unrelated modules.
- Changing runtime behavior.
- Touching `pdf-engine`, `clinical-ai`, `signature` library internals
  beyond what is needed to satisfy strict types.

## Reference

- Working production deploy: `wathiqcare-discharge-refusal-6d4yiccmy-wathiqcare.vercel.app`
  → aliased to `wathiqcare.online`.
- Failed strict-webpack deploy that motivated this work:
  `wathiqcare-discharge-refusal-botf7d2wb-wathiqcare.vercel.app`.
- Commits in scope:
  - `82f6e23` — committed 180 production-required files.
  - (this commit) — turbopack alignment + shim documentation.
