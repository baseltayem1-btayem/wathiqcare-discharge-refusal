# Phase 35B – Production Deployment Mismatch Incident Report

Date: 2026-06-01
Incident ID: PH35B-DEPLOY-MISMATCH-20260601
Status: Open (contained)

Final classification: ROUTE WIRING FIX REQUIRED

## 1) Incident Summary

A deployment mismatch incident was raised because the live informed-consents experience at https://wathiqcare.online/modules/informed-consents appeared inconsistent with the approved pilot UI baseline.

Investigation result:
- Production alias target is correct.
- Production deployment slug, commit SHA, and branch match approved Phase 35 values.
- Mismatch is not caused by wrong alias, wrong project, wrong branch, or wrong commit.
- Mismatch is caused by route/component wiring conflict: there are duplicate module routes under both `apps/web/app` and `apps/web/src/app`, and the active route tree serves a placeholder/legacy-like module surface instead of the approved physician dashboard route implementation.

Immediate containment in force:
- STOP pilot expansion.
- No patient links.
- No additional onboarding.
- No SMS enablement.
- No broad patient delivery.
- Do not classify as stable production until wiring fix is validated.

## 2) Live Screenshot and Metadata Evidence

Evidence bundle directory:
- docs/production-readiness/phase35b-live-evidence/2026-06-01T06-36-55-142Z

Metadata file:
- docs/production-readiness/phase35b-live-evidence/2026-06-01T06-36-55-142Z/phase35b-live-evidence-metadata.json

### Required URL capture matrix

| Timestamp (capturedAt) | URL | HTTP | Visible UI identity (from metadata) | Matches approved RC? | Legacy/unexpected appearance? | Screenshot |
|---|---|---:|---|---|---|---|
| 2026-06-01T06:36:59Z | https://wathiqcare.online | 200 | Landing: "Human-Centered Informed Consent, Legally Protected Care." | Yes (public landing family) | No | docs/production-readiness/phase35b-live-evidence/2026-06-01T06-36-55-142Z/wathiqcare.online__root.png |
| 2026-06-01T06:37:01Z | https://wathiqcare.online/request-demo | 200 | "Request a Demo" screen | Yes | No | docs/production-readiness/phase35b-live-evidence/2026-06-01T06-36-55-142Z/wathiqcare.online__request-demo.png |
| 2026-06-01T06:37:03Z | https://wathiqcare.online/login | 200 | "WathiqCare" secure access login | Yes | No | docs/production-readiness/phase35b-live-evidence/2026-06-01T06-36-55-142Z/wathiqcare.online__login.png |
| 2026-06-01T06:37:05Z | https://wathiqcare.online/modules | 200 (redirected to login) | Login (next=/modules) | N/A (auth-gated) | N/A | docs/production-readiness/phase35b-live-evidence/2026-06-01T06-36-55-142Z/wathiqcare.online__modules.png |
| 2026-06-01T06:37:07Z | https://wathiqcare.online/modules/informed-consents | 200 (redirected to login) | Login (next=/modules/informed-consents) | N/A unauthenticated; authenticated mismatch reported by incident | Potentially yes (per incident report + wiring diagnosis) | docs/production-readiness/phase35b-live-evidence/2026-06-01T06-36-55-142Z/wathiqcare.online__modules__informed-consents.png |
| 2026-06-01T06:37:09Z | https://wathiqcare.online/modules/promissory-notes | 200 (redirected to login) | Login (next=/modules/promissory-notes) | N/A (auth-gated) | N/A | docs/production-readiness/phase35b-live-evidence/2026-06-01T06-36-55-142Z/wathiqcare.online__modules__promissory-notes.png |
| 2026-06-01T06:38:11Z | https://wathiqcare.online/api/health | 200 | JSON health payload (`status: ok`) | Yes | No | docs/production-readiness/phase35b-live-evidence/2026-06-01T06-36-55-142Z/wathiqcare.online__api__health.png |
| 2026-06-01T06:39:13Z | https://wathiqcare.online/api/health/runtime | 200 | JSON runtime payload (deployment identity) | Yes | No | docs/production-readiness/phase35b-live-evidence/2026-06-01T06-36-55-142Z/wathiqcare.online__api__health__runtime.png |

## 3) Deployment Identity Verification

### Current deployment identity (observed)

- Production alias: https://wathiqcare.online
- Current deployment URL: https://wathiqcare-discharge-refusal-f57bh4bxj-wathiqcare.vercel.app
- Deployment ID: dpl_EozbXDScJErWBgMwmVcyHVXBbw7X
- Created: Mon Jun 01 2026 09:06:03 GMT+0300
- Runtime commit SHA: 0f7eb3603135a43b31b1b263c28b31ad0ee7e1e0
- Runtime branch: phase24-evidence-package-final
- Vercel project ID: prj_oOa9MNAgdTmotVhMp5Ycm0eelTfH
- Vercel root directory: apps/web
- Project inspect build command (dashboard setting): npm run build
- App-level Vercel build command file (`apps/web/vercel.json`):
  - npm run runtime:pre-vercel && npm run prisma:generate && next build --webpack && node scripts/write-deterministic-routes-manifest.cjs

### Approved Phase 35 identity (baseline)

- Commit SHA: 0f7eb3603135a43b31b1b263c28b31ad0ee7e1e0
- Branch: phase24-evidence-package-final
- Deployment slug: wathiqcare-discharge-refusal-f57bh4bxj-wathiqcare.vercel.app
- Production alias: https://wathiqcare.online

### Comparison outcome

- Alias target: MATCH
- Deployment slug: MATCH
- Commit SHA: MATCH
- Branch: MATCH
- Project identity: MATCH

Conclusion: no wrong alias target and no wrong deployment target.

## 4) Mismatch Category Determination (A–G)

Primary category:
- E. Correct deployment but wrong route/component wiring

Secondary contributing category:
- G. Smoke test coverage gap

Why:
- Smoke tests validated status codes and endpoint reachability, not authenticated visual identity for `/modules/informed-consents`.
- Codebase includes conflicting route trees for same path namespace under `apps/web/app` and `apps/web/src/app`.

## 5) Route/Component Wiring Diagnosis

### Observed route implementations

1. Approved route implementation (expected pilot UI)
- File: apps/web/app/modules/informed-consents/page.tsx
- Renders: `ApprovedPhysicianDashboard` (approved design)
- Notes in file indicate default promotion and legacy fallback at `/legacy/informed-consents`.

2. Competing placeholder implementation (legacy-like/unexpected surface)
- File: apps/web/src/app/modules/informed-consents/page.tsx
- Renders: `ModulePlaceholderPage` for informed-consents dashboard.

3. Additional competing section routes
- File: apps/web/src/app/modules/informed-consents/[section]/page.tsx
- Also uses `ModulePlaceholderPage`.

4. Legacy rollback page
- File: apps/web/app/legacy/informed-consents/page.tsx
- Explicitly renders `InformedConsentsModulePageNew` and is documented as legacy rollback surface.

### Diagnosis outcome

`/modules/informed-consents` is currently wired through the competing route tree that can serve placeholder/legacy-like UI rather than the approved physician dashboard route. This explains user-observed mismatch despite deployment identity being correct.

## 6) Containment and Rollback Decision

Decision: do not rollback alias at this time.

Rationale:
- Alias and deployment target are verified correct.
- Problem is route/component wiring, not wrong deployment target.
- Blind rollback could reintroduce older behavior without guaranteeing approved UI parity.

Containment remains active:
- STOP pilot expansion and keep pilot constrained.
- No new patient link distribution.
- No SMS enablement.
- No broad patient rollout.

## 7) Corrective Action Required

1. Implement minimal route wiring correction:
- Ensure a single authoritative route tree for `/modules/informed-consents`.
- Remove/disable competing placeholder route resolution under `apps/web/src/app/modules/informed-consents` for production path.
- Preserve `/legacy/informed-consents` as explicit rollback route only.

2. Verification before redeploy:
- Local authenticated visual proof for `/modules/informed-consents` showing `ApprovedPhysicianDashboard`.
- Evidence screenshots for authenticated module routes.
- Confirm no changes to patient journey logic, OTP/signing/token/session validation, or Arabic guards.

3. Improve smoke checks:
- Add authenticated UI identity assertion for `/modules/informed-consents` (e.g., expected approved dashboard heading/landmarks), not just HTTP 200.

4. Release controls:
- Redeploy only after wiring fix verification evidence is attached.
- Keep pilot expansion paused until sign-off.

## 8) Updated Pilot Status

Pilot status: CONTAINED INCIDENT – EXPANSION PAUSED

- Stable-production claim withdrawn pending route wiring correction and visual revalidation.
- Single-tenant safety restrictions remain unchanged.

## 9) Hard Restrictions Reconfirmed

- No migrations.
- No runtime logic changes outside minimal route wiring correction.
- No OTP/signing/token/session bypass.
- No Arabic guard disablement.
- No SMS enablement.
- No broad patient delivery.
