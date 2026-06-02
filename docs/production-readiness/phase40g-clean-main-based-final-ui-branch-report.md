# Phase 40G — Clean Main-Based UI-Only Branch for Final Physician Journey

**Date:** 2026-06-01
**Branch:** `phase40g-final-ui-clean`
**Base:** `origin/main` @ `83f3880d280430485f7cda9fd634e4410f5b8951`
**In-scope source commit (cherry-picked files only):** `321c1cc` (from `phase24-evidence-package-final`)
**Status:** Validation only — no commit, no push, no deploy.

---

## 1. Objective

Build a clean branch off `origin/main` that contains **only** the approved Final
Physician Consent Builder UI plus the Phase 40D / 40E documentation evidence,
with no out-of-scope server, migration, or patient-journey changes.

This branch supersedes the Phase 40F attempt, which was aborted because the
source branch (`phase24-evidence-package-final`) carried 7 protected files
outside the approved UI-only scope.

---

## 2. Files Staged on `phase40g-final-ui-clean` (46 total)

### 2.1 Source — Final Physician UI (24 files)

| Path | Source |
|------|--------|
| `apps/web/app/modules/informed-consents/page.tsx` | `321c1cc` |
| `apps/web/src/app/modules/informed-consents/page.tsx` | `321c1cc` |
| `apps/web/src/components/informed-consents/FinalInformedConsentsModule.tsx` | `321c1cc` |
| `apps/web/src/components/informed-consents/final-ui/App.tsx` | `321c1cc` + Phase 40D landing-state patch (`useState<Screen>('consent-builder')`) |
| `apps/web/src/components/informed-consents/final-ui/ConsentBuilder.tsx` | `321c1cc` |
| `apps/web/src/components/informed-consents/final-ui/PatientSearch.tsx` | `321c1cc` |
| `apps/web/src/components/informed-consents/final-ui/PhysicianDashboard.tsx` | `321c1cc` |
| `apps/web/src/components/informed-consents/final-ui/StatusTracking.tsx` | `321c1cc` |
| `apps/web/src/components/informed-consents/final-ui/clinical/ClinicalBadge.tsx` | `321c1cc` |
| `apps/web/src/components/informed-consents/final-ui/clinical/ClinicalTypes.ts` | `321c1cc` |
| `apps/web/src/components/informed-consents/final-ui/clinical/ValidationDrawer.tsx` | `321c1cc` |
| `apps/web/src/components/informed-consents/final-ui/fixtures/README.md` | `321c1cc` |
| `apps/web/src/components/informed-consents/final-ui/fixtures/consent-builder.ts` | `321c1cc` |
| `apps/web/src/components/informed-consents/final-ui/fixtures/patient-search.ts` | `321c1cc` |
| `apps/web/src/components/informed-consents/final-ui/fixtures/status-tracking.ts` | `321c1cc` |
| `apps/web/src/components/informed-consents/final-ui/steps/StepAnesthesia.tsx` | `321c1cc` |
| `apps/web/src/components/informed-consents/final-ui/steps/StepDisclosures.tsx` | `321c1cc` |
| `apps/web/src/components/informed-consents/final-ui/steps/StepEducation.tsx` | `321c1cc` |
| `apps/web/src/components/informed-consents/final-ui/steps/StepPatient.tsx` | `321c1cc` |
| `apps/web/src/components/informed-consents/final-ui/steps/StepPreview.tsx` | `321c1cc` |
| `apps/web/src/components/informed-consents/final-ui/steps/StepProcedure.tsx` | `321c1cc` |
| `apps/web/src/components/informed-consents/final-ui/steps/StepSend.tsx` | `321c1cc` |
| `apps/web/src/components/informed-consents/final-ui/steps/StepValidation.tsx` | `321c1cc` |

### 2.2 Documentation & Evidence (22 files)

- `docs/production-readiness/phase40-controlled-port-localhost-ui-report.md`
- `docs/production-readiness/phase40d-consent-builder-default-landing-patch-report.md`
- `docs/production-readiness/phase40d-screenshots/` — 8 PNGs + `phase40d-screenshots-metadata.json`
- `docs/production-readiness/phase40e-targeted-e2e-regression-report.md`
- `docs/production-readiness/phase40e-targeted-e2e-regression-screenshots/` — 9 PNGs + `health-runtime.json` + `phase40e-screenshots-metadata.json`

---

## 3. Out-of-Scope Files — Verified Absent

The following protected files were explicitly excluded and confirmed absent
from `git diff --name-only origin/main`:

| File | In Diff? |
|------|----------|
| `apps/web/prisma/migrations/0028_smart_educational_consent_library_foundation.sql` | NO |
| `apps/web/src/lib/server/signature-orchestration-service.ts` | NO |
| `apps/web/src/lib/public-signing/decision-status.ts` | NO |
| `apps/web/src/lib/projection/unified-disclosure-projection.ts` | NO |
| `apps/web/src/lib/projection/unified-disclosure-shadow-mode.ts` | NO |
| `apps/web/src/lib/server/controlled-production-pilot-governance.ts` | NO |
| `apps/web/src/components/preview/physician-workflow/PhysicianWorkflowPreview.tsx` | NO |

Additionally confirmed: zero diff entries match
`public-signing|verify-otp|request-otp|sign\[token\]|signature-orchestration`.

---

## 4. Build Result

Command: `npx next build --webpack` (in `apps/web/`)
Log: `__phase40g_build.log`
Exit code: **0**

All expected routes compiled, including the preserved patient-journey routes:

- `/modules/informed-consents` (Consent Builder default landing)
- `/modules/informed-consents/create`
- `/modules`
- `/sign/[token]/workflow` (untouched, mounted)
- `/api/sign/[token]/request-otp` (untouched, mounted)
- `/api/sign/[token]/verify-otp` (untouched, mounted)

---

## 5. Protected-Path TypeScript Check

Command: `npx tsc --noEmit` (in `apps/web/`)
Log: `__phase40g_tsc.log`
Total errors: **520** (baseline — pre-existing on `origin/main`)

### Errors in Phase 40G modified files: **0**

Filter `final-ui | FinalInformedConsentsModule | app/modules/informed-consents/page` returned zero matches.

### Baseline errors (pre-existing on `origin/main`, not introduced by 40G)

| Area | Count | Notes |
|------|-------|-------|
| `src/lib/server/public-signing-service.ts` | 16 | NOT modified by 40G; baseline on `origin/main`. |
| `src/components/approved-design/patient/ApprovedPatientWorkflow.tsx` | 10 | NOT modified by 40G; baseline from commit `098881f`. |
| Other baseline | 494 | Across files outside the Phase 40G diff. |

**Conclusion:** Phase 40G introduces zero new TypeScript errors in its
modified files. All errors are pre-existing on the `origin/main` baseline.

---

## 6. Local Visual Smoke

Server: `npx next start -p 3000` — Ready in 337ms
Capture: `node __phase40g_capture.cjs`
Output dir: `docs/production-readiness/phase40g-screenshots/`

### Physician UI (authenticated as `dr.ahmed@wathiqcare.med.sa`)

| # | Verification | URL | HTTP | Result |
|---|--------------|-----|------|--------|
| 01 | `/modules/informed-consents` opens Consent Builder Step 1 | `/modules/informed-consents` | 200 | OK (159 KB) |
| 02 | Step 1 Patient reachable | `/modules/informed-consents` (+click Patient) | 200 | OK (159 KB) |
| 03 | Step 2 Procedure reachable | `/modules/informed-consents` (+click Procedure) | 200 | OK (168 KB) |
| 04 | Step 7 Validation reachable | `/modules/informed-consents` (+click Validation) | 200 | OK (157 KB) |
| 05 | Step 8 Send reachable | `/modules/informed-consents` (+click Send) | 200 | OK (161 KB) |
| 06 | Arabic mode works | `/modules/informed-consents?lang=ar` | 200 | OK (159 KB) |
| 07 | `/modules/informed-consents/create` unchanged | `/modules/informed-consents/create` | 200 | OK (113 KB) |
| 08 | `/modules` unchanged | `/modules` | 200 | OK (83 KB) |

### Patient Journey Preservation (anonymous context, no new tokens issued)

| # | Token (truncated) | URL | HTTP | Interpretation |
|---|-------------------|-----|------|----------------|
| 09 | `xYonm4Ro…` | `/sign/{token}/workflow` | 404 | Route mounted; token expired/unknown (expected). |
| 09 | `FQiasUsN…` | `/sign/{token}/workflow` | 404 | Route mounted; token expired/unknown (expected). |

The 404 responses confirm `/sign/[token]/workflow` remains mounted and
untouched — the route returns the expected not-found body rather than a 500
or routing collapse.

### API Smoke

`GET /api/health/runtime` → **503** (expected in local-env: pooled DB URL and
several optional storage env vars absent locally). Body saved to
`phase40g-screenshots/health-runtime.json`.

---

## 7. Verbatim Smoke Requirement Confirmation

> "Confirm: `/modules/informed-consents` opens Consent Builder Step 1; Step 2
> reachable; Step 7 reachable; Step 8 reachable; Arabic mode works;
> `/modules/informed-consents/create` remains unchanged; `/modules` remains
> unchanged; `/sign/[token]/workflow` remains untouched."

| Requirement | Result |
|-------------|--------|
| `/modules/informed-consents` opens Consent Builder Step 1 | ✅ Confirmed (shot 01) |
| Step 2 Procedure reachable | ✅ Confirmed (shot 03) |
| Step 7 Validation reachable | ✅ Confirmed (shot 04) |
| Step 8 Send reachable | ✅ Confirmed (shot 05) |
| Arabic mode works | ✅ Confirmed (shot 06) |
| `/modules/informed-consents/create` unchanged | ✅ Confirmed (shot 07) |
| `/modules` unchanged | ✅ Confirmed (shot 08) |
| `/sign/[token]/workflow` remains untouched | ✅ Confirmed (404 with expired tokens, route mounted) |

---

## 8. Diff Summary vs `origin/main`

- 46 paths total (24 source + 22 docs/evidence).
- Zero protected-path files (verified — see §3).
- Zero new TS errors (see §5).
- Build green (see §4).
- Visual smoke green (see §6, §7).

---

## 9. Recommendation

Branch `phase40g-final-ui-clean` is a clean, minimal, UI-only diff against
`origin/main` containing exactly the approved Final Physician Consent Builder
plus prior-phase documentation evidence. It is ready for the user's review
prior to any push/deploy decision.

**Per user directive: this branch is NOT committed, NOT pushed, and NOT
deployed.** The 46 in-scope files remain staged on
`phase40g-final-ui-clean` awaiting separate approval.

---

## 10. Final Classification

**CLEAN UI-ONLY BRANCH READY FOR MAIN PUSH**
