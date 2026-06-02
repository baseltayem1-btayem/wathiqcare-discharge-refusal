# Phase 35E - Approved Informed Consents UI Wiring Patch Report

Date (UTC): 2026-06-01
Branch: phase24-evidence-package-final

## Incident Reference

- Phase 35C correction: `docs/production-readiness/phase35c-authenticated-visual-release-identity-proof-correction.md`
- Phase 35C wiring plan: `docs/production-readiness/phase35c-approved-ui-location-and-route-wiring-plan.md`

## Patch Target Confirmation

- Current wrong UI source file:
  - `apps/web/src/components/approved-design/physician/ApprovedPhysicianDashboard.tsx`
- Approved UI source file wired by this patch:
  - `apps/web/src/components/modules/InformedConsentsModulePageNew.tsx`
- Active route file patched:
  - `apps/web/app/modules/informed-consents/page.tsx`
- Competing route file patched:
  - `apps/web/src/app/modules/informed-consents/page.tsx`

## Files Changed

1. `apps/web/app/modules/informed-consents/page.tsx`
2. `apps/web/src/app/modules/informed-consents/page.tsx`

Evidence artifacts added:

1. `docs/production-readiness/phase35e-authenticated-visual-proof/pre-deploy-live/phase35e-predeploy-live-metadata.json`
2. `docs/production-readiness/phase35e-authenticated-visual-proof/pre-deploy-local-preview/phase35e-predeploy-local-preview-metadata.json`
3. PNG screenshots under:
   - `docs/production-readiness/phase35e-authenticated-visual-proof/pre-deploy-live/`
   - `docs/production-readiness/phase35e-authenticated-visual-proof/pre-deploy-local-preview/`

## Approved UI Component Wired

`/modules/informed-consents` route now renders:

- `InformedConsentsModulePageNew` (developed pilot workflow UI)

Auth and module access checks remain unchanged.

## Legacy UI Source Bypassed

Bypassed from root route rendering path:

- `ApprovedPhysicianDashboard` (the currently observed simplified consent-type screen)

Markers remain on the route container, but visual acceptance is judged by actual rendered UI content.

## Build Result

Command:

- `npx next build --webpack`

Result:

- PASS (compiled successfully, static generation completed)

## Typecheck / Protected-Path Result

Command:

- `npx tsc --noEmit`

Result:

- FAIL
- Multiple pre-existing TypeScript errors in server/service areas (for example `src/lib/server/education-library-service.ts`, `src/lib/server/legal-case-pdf-service.ts`, `src/lib/server/operations.ts`)

Protected-path extraction:

- No `protected-path` error entries were found in the typecheck output.

## Pre-Deployment Visual Proof

### Live authenticated session (captured)

Captured routes:

1. `https://wathiqcare.online/modules/informed-consents`
2. `https://wathiqcare.online/modules/informed-consents?lang=ar`
3. `https://wathiqcare.online/modules/informed-consents?lang=en`
4. `https://wathiqcare.online/modules`

Evidence:

- `docs/production-readiness/phase35e-authenticated-visual-proof/pre-deploy-live/phase35e-predeploy-live-metadata.json`
- Associated PNG files in same folder.

Observed outcome:

- Simplified consent-type screen is still visible on live informed-consents routes.
- Placeholder fingerprints were not observed.
- `/modules` route is healthy and authenticated context is present.

### Local/preview capture attempt

Captured routes included localhost and preview variants for informed-consents and modules.

Evidence:

- `docs/production-readiness/phase35e-authenticated-visual-proof/pre-deploy-local-preview/phase35e-predeploy-local-preview-metadata.json`
- Associated PNG files in same folder.

Observed outcome:

- Redirected to `/login` on all local and preview module routes in this automation context.
- Therefore authenticated local/preview module-surface verification was blocked.

## Deployment Result

- Not executed.

Reason:

1. Decision rule gate not met due failing typecheck gate.
2. Live authenticated visual proof still shows old simplified informed-consents screen.

No migrations run. No SMS enablement. No OTP/signing/token/session logic changes.

## Post-Deployment Authenticated Visual Proof

- Not applicable because deployment was not executed.

## Current UI Match Assessment

- Current live UI does not yet match the approved developed informed-consents interface requirement.

## Final Classification

**STOP - APPROVED UI STILL NOT VISIBLE**
