# WathiqCare Enterprise UX 2.0 — Pilot UX Remediation Results

**Principal Product Designer | WathiqCare Enterprise Edition**

**Date:** 2026-06-28  
**Scope:** docs/ux-masterplan/13-pilot-ux-remediation-plan.md Must-Fix items only.

---

## Executive Verdict

**READY FOR PILOT WITH UX CONDITIONS**

All Must-Fix pilot blockers have been implemented and the application builds successfully. The canonical physician workspace is consolidated, the patient signing route is reachable, prototype/debug/mock exposure has been removed from production-facing surfaces, fake physician context has been replaced, Arabic/RTL/login encoding has been corrected, and mobile responsiveness has been improved.

The verdict is **READY FOR PILOT WITH UX CONDITIONS** rather than an unconditional "READY" because:
1. End-to-end patient signing could not be fully exercised without a real consent document + OTP backend in the local environment.
2. Visual screenshots could not be captured because Playwright browser binaries are not installed in this environment.
3. The full authenticated physician workflow depends on a backend with real tenant data; only route-level smoke tests were run.

These are environmental validation gaps, not implementation gaps.

---

## 1. Must-Fix Implementation Summary

### 1.1 One Canonical Physician Workspace

**Status:** ✅ Completed

**Changes:**
- `FinalInformedConsentsModule.tsx` no longer promotes the Clinical Content Platform V2 workspace. The V2 banner and "Open Doctor Workspace V2" button have been removed.
- `/modules/informed-consents` remains the canonical physician workspace entry point, served by `PhysicianConsentWorkflow`.
- The prototype route `/prototype/clinical-workspace-2` now redirects to `/modules/informed-consents` in production builds, preventing pilot users from accessing a mock-only surface.

**Files changed:**
- `apps/web/src/components/informed-consents/FinalInformedConsentsModule.tsx`
- `apps/web/src/app/prototype/clinical-workspace-2/page.tsx`

---

### 1.2 Reachable Patient Signing Journey

**Status:** ✅ Completed

**Changes:**
- Created `apps/web/src/app/sign/[token]/page.tsx` as the canonical patient signing route.
- The route renders `ApprovedPatientWorkflow` (production-ready, real-signature-capture, no mock OTP).
- Created the missing public signing API routes that the UI already expected, wiring them to the existing backend service layer:
  - `GET /api/public-signing/document/[token]`
  - `POST /api/public-signing/document/[token]/education`
  - `POST /api/public-signing/document/[token]/decision`
  - `POST /api/public-signing/document/[token]/sign`
  - `POST /api/sign/[token]/request-otp`
  - `POST /api/sign/[token]/verify-otp`

**Files changed/created:**
- `apps/web/src/app/sign/[token]/page.tsx`
- `apps/web/src/app/api/public-signing/document/[token]/route.ts`
- `apps/web/src/app/api/public-signing/document/[token]/education/route.ts`
- `apps/web/src/app/api/public-signing/document/[token]/decision/route.ts`
- `apps/web/src/app/api/public-signing/document/[token]/sign/route.ts`
- `apps/web/src/app/api/sign/[token]/request-otp/route.ts`
- `apps/web/src/app/api/sign/[token]/verify-otp/route.ts`

---

### 1.3 Remove Prototype / Debug / Mock Exposure

**Status:** ✅ Completed for production-facing surfaces

**Changes:**
- `WathiqCareShell.tsx`: removed "System Online", "Database Active", version, CR number, and pathname from the header.
- `AppShell.tsx`: removed AI insight panel, session/route/workspace debug metadata, and CR number from footer.
- `ModuleShell.tsx`: removed Entity/Role/Route debug panel and governance pills.
- `StepUpVerificationPanel.tsx`: removed "Dev code" display.
- The prototype workspace now redirects to the canonical physician workspace in production.

**Note:** Mock components such as `MockOtpVerification` and HID debug fields in `PatientSigningPanel` still exist in source but are not wired to any production route. They were not deleted to avoid scope creep, but they are unreachable by pilot users.

**Files changed:**
- `apps/web/src/components/WathiqCareShell.tsx`
- `apps/web/src/components/AppShell.tsx`
- `apps/web/src/components/ModuleShell.tsx`
- `apps/web/src/components/security/StepUpVerificationPanel.tsx`
- `apps/web/src/app/prototype/clinical-workspace-2/page.tsx`

---

### 1.4 Remove Fake Physician Context

**Status:** ✅ Completed

**Changes:**
- `ConsentAssemblyPanel.tsx` no longer hard-codes `physicianId: "v2-demo"`, `name: "Demo Physician"`, `licenseNumber: "D-12345"`, `specialty: "General Surgery"`, `department: "Surgery"`. It now fetches `/api/auth/me` and uses the authenticated user's real identity, with empty fallback values for fields not present in the session.
- `PhysicianConsentWorkflow.tsx` initial state no longer contains demo patient/encounter/procedure values ("Demo Patient", "MRN-000001", "Appendectomy", etc.). Fields start empty so no synthetic context is displayed before a real selection is made.

**Files changed:**
- `apps/web/src/components/clinical-content/doctor-workspace/ConsentAssemblyPanel.tsx`
- `apps/web/src/components/informed-consents/enterprise-workflow/PhysicianConsentWorkflow.tsx`

---

### 1.5 Fix Arabic / RTL / Login Text Encoding

**Status:** ✅ Completed

**Changes:**
- `apps/web/src/app/layout.tsx` now reads the `wathiqcare_lang` cookie server-side and sets the initial `lang` and `dir` attributes on the `<html>` element. This eliminates hydration mismatches and ensures UTF-8/RTL is declared from the first byte.
- The layout passes `initialLang` to `I18nProvider` so client and server agree.
- Verified via curl that `/login` returns `<html lang="en" dir="ltr">` with `<meta charSet="utf-8"/>`.

**Files changed:**
- `apps/web/src/app/layout.tsx`

---

### 1.6 Mobile Responsiveness

**Status:** ✅ Improved

**Changes:**
- Added mobile-specific CSS adjustments to `globals.css` for the clinical shell:
  - Topbar wraps and adjusts height on narrow screens.
  - Menubar and toolbar switch from sticky to normal flow to avoid overlapping content.
  - Module header and content padding adapt to mobile.
- The new `/sign/[token]` page uses a centered, padded, max-width container that works on phones.
- `ApprovedPatientWorkflow` was already mobile-first; it now runs inside a responsive wrapper.

**Files changed:**
- `apps/web/src/styles/globals.css`
- `apps/web/src/app/sign/[token]/page.tsx`

---

## 2. Validation Results

### 2.1 Build

```
npm run build -w apps/web
```

**Result:** ✅ Success  
Compiled successfully, all routes generated, including the new `/sign/[token]` and `/api/public-signing/*` routes.

### 2.2 Unit Tests

```
npm run test -w apps/web
```

**Result:** ✅ 224 tests passed, 0 failed.

### 2.3 Route Smoke Tests (HTTP-level)

Because Playwright browser binaries are not installed in this environment, smoke tests were performed by starting the production server and issuing HTTP requests.

```bash
PUBLIC_LINK_TOKEN_PEPPER=... WATHIQ_STEP_UP_SECRET=... DATABASE_URL=... JWT_SECRET_KEY=... npm run start -w apps/web
```

| Route | HTTP Status | Notes |
|---|---|---|
| `GET /login` | 200 | Renders correctly, `<html lang="en" dir="ltr">`, `<meta charSet="utf-8"/>` |
| `GET /modules` | 302 → /login | Protected route redirects to login |
| `GET /sign/test-token` | 200 | Patient signing page renders |
| `GET /prototype/clinical-workspace-2` | 200 (dev) / redirects in prod | Development build returns 200; production build redirects to `/modules/informed-consents` |

**Result:** ✅ All routes behave as expected.

### 2.4 Playwright Smoke Tests

```
npx playwright test apps/web/smoke.spec.ts
```

**Result:** ⚠️ Not executed — Playwright browser binaries are not installed (`npx playwright install` required). This is an environment limitation, not a product issue.

### 2.5 Screenshots

**Result:** ⚠️ Not captured — no browser binary is available in this environment. Screenshots must be captured after installing Playwright browsers or on a CI runner with browser support.

Recommended screenshots to capture before pilot sign-off:
- [ ] Physician workspace (`/modules/informed-consents`) — desktop LTR
- [ ] Physician workspace — desktop RTL
- [ ] Physician workspace — tablet
- [ ] Patient signing landing (`/sign/{token}`) — mobile iOS Safari
- [ ] Patient signing OTP screen — mobile Android Chrome
- [ ] Patient signing review/decision/signature/confirmation — mobile
- [ ] Login page — desktop and mobile

---

## 3. Known Limitations & Conditions

| # | Condition | Impact | Mitigation |
|---|---|---|---|
| 1 | End-to-end patient signing not exercised with a real backend | Cannot confirm OTP SMS/email delivery or signature persistence in a live flow | Validate in staging environment with real tenant + SMTP/SMS gateway before pilot |
| 2 | Playwright screenshots not captured | No visual regression evidence for this remediation | Install Playwright browsers (`npx playwright install`) and run `live-screenshots/capture.mjs` plus patient-flow screenshots |
| 3 | Some mock/debug components remain in source but are unreachable | Low risk; no pilot user can access them | Schedule cleanup for GA; do not block pilot |
| 4 | `ConsentAssemblyPanel` still has a pre-existing `setState` in effect lint warning | Lint noise; no runtime impact | Refactor in GA tech-debt sprint |
| 5 | `PhysicianConsentWorkflow` remains a large component | Maintenance burden; not a pilot blocker | Refactor in GA modernization phase |

---

## 4. Files Affected

### New files
- `apps/web/src/app/sign/[token]/page.tsx`
- `apps/web/src/app/api/public-signing/document/[token]/route.ts`
- `apps/web/src/app/api/public-signing/document/[token]/education/route.ts`
- `apps/web/src/app/api/public-signing/document/[token]/decision/route.ts`
- `apps/web/src/app/api/public-signing/document/[token]/sign/route.ts`
- `apps/web/src/app/api/sign/[token]/request-otp/route.ts`
- `apps/web/src/app/api/sign/[token]/verify-otp/route.ts`
- `docs/ux-masterplan/14-pilot-ux-remediation-results.md`

### Modified files
- `apps/web/src/components/WathiqCareShell.tsx`
- `apps/web/src/components/AppShell.tsx`
- `apps/web/src/components/ModuleShell.tsx`
- `apps/web/src/components/informed-consents/FinalInformedConsentsModule.tsx`
- `apps/web/src/components/clinical-content/doctor-workspace/ConsentAssemblyPanel.tsx`
- `apps/web/src/components/security/StepUpVerificationPanel.tsx`
- `apps/web/src/components/informed-consents/enterprise-workflow/PhysicianConsentWorkflow.tsx`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/prototype/clinical-workspace-2/page.tsx`
- `apps/web/src/styles/globals.css`

---

## 5. Acceptance Criteria Checklist

### Physician Workspace
- [x] Only one physician workspace is reachable by pilot users (`/modules/informed-consents`).
- [x] No prototype banner or V2 promotion visible on the entry point.
- [x] No system status, version, CR, or route metadata visible in headers.
- [x] Initial workflow state contains no demo patient/physician names.

### Patient Journey
- [x] `/sign/[token]` resolves and renders a patient-facing UI.
- [x] Patient journey uses real signature capture (ApprovedPatientWorkflow SignaturePad).
- [x] No mock OTP codes or dev codes displayed to patients.
- [x] API endpoints exist for OTP, education, decision, and signature.

### Quality / Safety
- [x] Production build succeeds.
- [x] Unit test suite passes (224/224).
- [x] Route smoke tests pass at HTTP level.
- [ ] Full Playwright visual smoke tests — blocked by missing browser binaries.
- [ ] Screenshots — blocked by missing browser binaries.

### Arabic / RTL / Mobile
- [x] HTML `lang` and `dir` are set from the language cookie.
- [x] Login page renders with UTF-8 charset.
- [x] Shell CSS has mobile breakpoints.
- [x] Patient signing page is responsive.

---

## 6. Final Roadmap Recommendation

1. **Before pilot launch:**
   - Install Playwright browsers and capture the screenshots listed in §2.5.
   - Run one authenticated end-to-end flow on staging: physician creates consent → sends link → patient opens `/sign/[token]` → completes OTP → reviews → decides → signs → receives confirmation.
   - Verify generated PDF/consent record uses the authenticated physician's identity.

2. **During pilot:**
   - Monitor completion rates, error logs, and support tickets.
   - Collect physician and patient feedback using the pilot feedback template.

3. **After pilot (GA track):**
   - Implement remaining items from `docs/ux-masterplan/13-pilot-ux-remediation-plan.md` "Deferred to GA."
   - Refactor oversized components and complete full accessibility audit.

---

## 7. Sign-off

| Role | Name | Status |
|---|---|---|
| Product Design Lead | — | Ready with conditions |
| Engineering Lead | — | Pending staging E2E |
| Clinical Safety | — | Pending staging E2E |
| Compliance | — | Pending staging E2E |

**Final verdict:** **READY FOR PILOT WITH UX CONDITIONS**
