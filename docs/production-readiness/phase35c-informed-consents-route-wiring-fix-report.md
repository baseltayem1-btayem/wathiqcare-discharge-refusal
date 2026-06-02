# Phase 35C - Informed Consents Route Wiring Fix and Visual Release Identity Validation

Date (UTC): 2026-06-01
Owner: Copilot execution log

## 1) Change Scope and Guardrails

Applied a minimal route-wiring and release-identity patch only:
- No backend/schema/migration changes
- No OTP/security-journey changes
- No API contract changes

## 2) Authoritative Route Decision

Authoritative runtime route for `/modules/informed-consents` is the `app` tree.

Evidence:
- Local build manifest contains:
  - `/modules/informed-consents/page`: `app/modules/informed-consents/page.js`
- No `src/app` mapping appears as the active compiled route output for this path.

Manifest source used during validation:
- `apps/web/.next/server/app-paths-manifest.json`

## 3) Minimal Wiring Patch Applied

### 3.1 Active app route updated with release identity markers
File:
- `apps/web/app/modules/informed-consents/page.tsx`

Changes:
- Wrapped approved surface with:
  - `data-testid="approved-informed-consents-module"`
  - `data-release-surface="approved-informed-consents"`
- Added hidden marker heading:
  - `Approved Informed Consents Module`
- Preserved existing auth gating and approved dashboard render behavior.

### 3.2 src/app competing route aligned to approved surface
File:
- `apps/web/src/app/modules/informed-consents/page.tsx`

Changes:
- Replaced placeholder module page render with approved physician dashboard render path.
- Added same release identity markers:
  - `data-testid="approved-informed-consents-module"`
  - `data-release-surface="approved-informed-consents"`
- Preserved module access check; unauthorized users are redirected.
- Purpose: remove placeholder-surface risk if route resolution/build settings ever pivot.

### 3.3 Evidence helper added
File:
- `__phase35c_capture_route_identity.cjs`

Purpose:
- Capture screenshots + metadata for required pre/post validation URLs.
- Record URL, final URL, status, content type, title/H1, and marker presence flags.

## 4) Build and Type Validation

### 4.1 Build validation
Command:
- `cd c:\work\wathiqcare-discharge-refusal-main\apps\web && npx next build --webpack`

Result:
- PASS

### 4.2 Type validation
Command:
- `cd c:\work\wathiqcare-discharge-refusal-main\apps\web && npx tsc --noEmit`

Result:
- FAIL
- Reported: 467 errors across 68 files
- Errors are broad, pre-existing, and not limited to informed-consents route wiring changes.

## 5) Pre-Deployment Visual Evidence

Evidence folder:
- `docs/production-readiness/phase35c-evidence/2026-06-01T06-49-14-653Z-predeploy-live-baseline`

Metadata:
- `docs/production-readiness/phase35c-evidence/2026-06-01T06-49-14-653Z-predeploy-live-baseline/phase35c-predeploy-live-baseline-metadata.json`

Captured URLs:
- `/modules/informed-consents`
- `/modules/informed-consents?lang=ar`
- `/modules/informed-consents?lang=en`

Observed behavior:
- All unauthenticated requests redirected to login (`/login?next=...`).
- Marker flags remained false in this capture context due auth redirect surface.

## 6) Production Deployment

Deployment command:
- `npx vercel deploy --prod --yes` (from `apps/web`)

Outcome:
- First attempt failed with transient Vercel upload/API/network errors.
- Retry succeeded.

Deployment identity:
- Production deployment URL:
  - `https://wathiqcare-discharge-refusal-am8zz7deh-wathiqcare.vercel.app`
- Alias:
  - `https://wathiqcare.online`

## 7) Post-Deployment Live Validation

Evidence folder:
- `docs/production-readiness/phase35c-evidence/2026-06-01T06-56-35-433Z-postdeploy-live-validation`

Metadata:
- `docs/production-readiness/phase35c-evidence/2026-06-01T06-56-35-433Z-postdeploy-live-validation/phase35c-postdeploy-live-validation-metadata.json`

Required URL checks and outcome:
- `https://wathiqcare.online/modules/informed-consents`
  - Final URL: login redirect
  - HTTP status: 200 (login page)
- `https://wathiqcare.online/modules`
  - Final URL: login redirect
  - HTTP status: 200 (login page)
- `https://wathiqcare.online/api/health`
  - HTTP status: 200
  - JSON body reports `status: ok`
- `https://wathiqcare.online/api/health/runtime`
  - HTTP status: 200
  - Runtime payload includes deployment URL `wathiqcare-discharge-refusal-am8zz7deh-wathiqcare.vercel.app`

## 8) Final Classification (Strict Rule Applied)

Final decision: **STOP**

Reason(s):
- `npx tsc --noEmit` gate failed.
- Authenticated visual assertion of approved module markers could not be completed in anonymous capture context (route redirects to login by design).

Interpretation:
- Route wiring patch and deployment were applied successfully.
- However, strict release acceptance criteria are not fully satisfied until typecheck gate is resolved (or formally exempted) and authenticated visual marker verification is captured.

## 9) Required Follow-Up to Reach GO

1. Provide an approved typecheck exception for known baseline errors, or reduce `tsc` errors to pass criteria.
2. Execute authenticated capture flow (session-bearing browser context) for:
   - `/modules/informed-consents`
   - `/modules/informed-consents?lang=ar`
   - `/modules/informed-consents?lang=en`
3. Confirm in-auth DOM presence of:
   - `data-testid="approved-informed-consents-module"`
   - `data-release-surface="approved-informed-consents"`
4. Re-issue final Phase 35C gate decision.
