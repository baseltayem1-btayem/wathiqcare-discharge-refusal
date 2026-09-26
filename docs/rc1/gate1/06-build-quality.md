# RC1 Gate 1 — 06 Build Quality

**Scope:** TypeScript type checking, linting, unit tests, production build, e2e tests, CI/CD quality gates, and code coverage.  
**Files reviewed:** `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/tsconfig.json`, `apps/web/eslint.config.mjs`, `playwright.config.ts`, `playwright.uat.config.ts`, `.github/workflows/enterprise-cicd-pipeline.yml`  
**Review date:** 2026-06-26

---

## Executive Summary

Build quality is yellow-to-red. Tests pass but only a subset is executed; lint runs but generates 169 warnings; TypeScript errors are suppressed in production builds; the production build fails in this environment due to Prisma file-locking and an undocumented build flag. There is no code-coverage tooling or threshold. CI allows test failures to continue and hardening stages are placeholders.

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High     | 4 |
| Medium   | 4 |
| Low      | 1 |

---

## Findings

### BQ-HIGH-01 — TypeScript type errors are suppressed in production builds
- **Priority:** High
- **Description:** `apps/web/next.config.ts` lines 30–32 sets `typescript: { ignoreBuildErrors: true }`.
- **Evidence:** `npx tsc --noEmit` fails with ~20 errors (e.g., `Buffer` not assignable to `BodyInit` in `apps/web/src/app/api/modules/promissory-notes/[id]/pdf/route.ts` line 33, missing module declarations in `wathiqcare-figma-uiux/components/ui/*`, implicit `any` in `tests/clinical-workspace-2.spec.ts`, type mismatches in `__tmp_test*.ts`).
- **Risk:** Type bugs reach production because the build pipeline ignores them.
- **Recommendation:** Remove `ignoreBuildErrors`; add a `type-check` script to `package.json`; fix or explicitly suppress genuine errors before RC1.
- **Estimated effort:** 1–2 days

### BQ-HIGH-02 — Production build fails in this environment
- **Priority:** High
- **Description:** `apps/web/package.json` line 7 build script runs `prisma:generate`, `write-release-build-info.mjs`, `run-sql-migrations.cjs`, `next build --webpack`, and `write-deterministic-routes-manifest.cjs`. The build fails at `prisma:generate` with `EPERM: operation not permitted, rename '…query_engine-windows.dll.node.tmp…'`. `--webpack` is not a documented Next.js build flag.
- **Risk:** CI/CD build flakiness / Windows-specific file-locking failure; undocumented flag may cause failures later.
- **Recommendation:** Remove `--webpack`; run Prisma generate as a separate CI step before build; use Linux build agents; pin Prisma binary targets.
- **Estimated effort:** 0.5–1 day

### BQ-HIGH-03 — `npm run test` only exercises a subset of tests
- **Priority:** High
- **Description:** `apps/web/package.json` line 18 runs only `src/lib/server/*.test.ts`, `src/components/cases/*.test.ts`, `src/lib/server/clinical-knowledge/**/*.test.ts`, and `src/lib/config/feature-flags.test.ts`.
- **Evidence:** 66 unit-test files exist under `apps/web/src`; 199 tests passed, but many modules (e.g., `src/modules/consent-engine/tests`, `src/lib/core`, `src/lib/clinical-ai`, `src/lib/server/clinical-content`) are not executed.
- **Risk:** Regressions in non-executed test files go undetected.
- **Recommendation:** Expand the script to `tsx --test 'src/**/*.test.ts'` (with explicit exclusions for slow integration tests) and run it in CI.
- **Estimated effort:** 0.5–1 day

### BQ-HIGH-04 — CI test job does not block the build
- **Priority:** High
- **Description:** `.github/workflows/enterprise-cicd-pipeline.yml` line 103 sets `continue-on-error: true` on the `test` job.
- **Risk:** Test failures are invisible to the pipeline; broken code can be packaged and deployed.
- **Recommendation:** Set `continue-on-error: false` for the test job and all quality gates.
- **Estimated effort:** 5 minutes

### BQ-MED-01 — Heavy lint warning load
- **Priority:** Medium
- **Description:** `apps/web/eslint.config.mjs` reports **169 warnings** (0 errors). Examples:
  - Unused imports/vars in `scripts/prod-release-gate.cjs`, `scripts/seed-clinical-knowledge.ts`, `src/components/informed-consents/enterprise-workflow/PhysicianConsentWorkflow.tsx`.
  - React Hook dependency warnings (`PhysicianConsentWorkflow.tsx:1338`, `WathiqNoteWorkflowModule.tsx:1544`).
  - Raw `<img>` tags instead of Next.js `<Image />` (`PromissoryNoteDocument.tsx`, `ImageWithFallback.tsx`).
- **Risk:** Dead code, stale closures, performance regressions, accessibility issues.
- **Recommendation:** Enforce zero-warnings in CI; fix or disable targeted rules intentionally.
- **Estimated effort:** 1–2 days

### BQ-MED-02 — No code-coverage tooling or thresholds
- **Priority:** Medium
- **Description:** `apps/web/package.json` has no `coverage` script, no `c8`/istanbul config, and no threshold gates.
- **Risk:** Cannot prove test coverage for RC1.
- **Recommendation:** Add coverage collection to the test runner and set minimum thresholds (e.g., 70% lines/branches).
- **Estimated effort:** 0.5 day

### BQ-MED-03 — Playwright e2e setup is immature
- **Priority:** Medium
- **Description:** `playwright.config.ts` lines 9–12 configures the web server with `npm run dev`; no browser projects are defined; only headless Chromium is used.
- **Risk:** e2e tests run against a dev server, not a production build, and do not cover cross-browser/mobile surfaces.
- **Recommendation:** Build the app, start with `next start`, add `projects` for desktop/mobile, and run in CI.
- **Estimated effort:** 1 day

### BQ-MED-04 — SQL migration runner continues on warnings
- **Priority:** Medium
- **Description:** `apps/web/scripts/run-sql-migrations.cjs` lines 137–141 increments a `warnings` counter and exits successfully even when `npx prisma db execute` fails.
- **Risk:** A failed migration can be silently swallowed in a production build.
- **Recommendation:** Fail the build on non-zero migration exit codes; only ignore known “already exists” errors explicitly.
- **Estimated effort:** 0.5 day

### BQ-LOW-01 — TypeScript errors exist in temporary files
- **Priority:** Low
- **Description:** `apps/web/src/lib/server/__tmp_test.ts`, `__tmp_test2.ts`, and `__tmp_full.ts` contribute to type-check failures.
- **Risk:** These files also pollute the build and lint output.
- **Recommendation:** Delete temporary files; if they must remain, exclude them from `tsconfig.json` and lint.
- **Estimated effort:** 15 minutes

---

## Positive Observations

1. **Tests exist and pass for the subset that runs.** 199 tests passed during the review.
2. **CI has dedicated lint, test, build, and hardening stages** with a clear pipeline structure.
3. **A production-release gate script exists** (`apps/web/scripts/prod-release-gate.cjs`) that validates readiness before deploy.
4. **Playwright and language-isolation workflows** show investment in automated validation.

---

## Gate 1 Exit Criteria for Build Quality

1. Remove `ignoreBuildErrors` and fix all TypeScript errors.
2. Stabilize `npm run build` (remove `--webpack`, separate Prisma generate, use Linux agents).
3. Expand the test script to run all unit-test files in CI.
4. Set `continue-on-error: false` for the CI test job.
5. Enforce zero lint warnings or explicitly suppress intentional ones.
6. Add code-coverage collection and thresholds.
7. Mature Playwright setup to run against a production build with multiple projects.

Build quality does not currently satisfy RC1 Gate 1.
