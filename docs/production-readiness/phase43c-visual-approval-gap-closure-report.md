# Phase 43C — Visual Approval Gap Closure Report

**Date:** 2 June 2026  
**Branch:** `phase43b-additive-approved-baseline`  
**Scope:** close the remaining Phase 43B visual approval gaps without touching signing, OTP, SMS, or migrations.

## Result

**`MAIN PUSH – VISUAL GAPS CLOSED`**

Phase 43C closed the two explicit Phase 43B caveats:

1. The broken landing partner/logo image slot was repaired by replacing the missing local asset reference with an existing approved asset.
2. The authenticated visual evidence set was re-captured successfully from a local production build using a confirmed working existing demo credential.

## 1. Landing Image Gap Closure

### Root cause

The shared landing component [apps/web/src/components/landing/WathiqcareWhiteLanding.tsx](apps/web/src/components/landing/WathiqcareWhiteLanding.tsx) referenced a non-existent local file:

- broken reference: `/images/branding/imc-logo.jpg`

The approved local assets already present in `apps/web/public/images/` include:

- `/images/imc-logo.png`
- `/images/imc-logo-white.png`
- `/images/imc-logo-orig.jpg`

### Fix applied

The partner/logo tile now uses the approved existing local asset:

- replacement: `/images/imc-logo.png`

No external image URL was introduced.

### Visual evidence

- landing screenshot after fix: `docs/production-readiness/phase43c-screenshots/00_landing_partner_logo_fixed.png`

## 2. Authenticated Visual Re-Capture

### Credential used

Authenticated re-capture succeeded with the existing confirmed account:

- `medicaldirector@wathiqcare.med.sa`

### Capture method

- local production build served from `apps/web`
- authenticated capture script: `__phase43c_capture.cjs`
- base URL: `http://localhost:3000`
- output directory: `docs/production-readiness/phase43c-screenshots/`

### Captured surfaces

- `00_landing_partner_logo_fixed.png` — landing post-fix evidence
- `01_step1_patient.png` — `/modules/informed-consents` Step 1
- `02_step2_procedure.png` — Step 2
- `03_step6_pdf_preview.png` — Step 6 PDF Preview
- `04_step7_validation.png` — Step 7 Validation
- `05_step8_send.png` — Step 8 Send
- `06_arabic_mode.png` — Arabic mode
- `07_modules_informed-consents_create.png` — `/modules/informed-consents/create`
- `08_modules.png` — `/modules`
- `09_sign_workflow_token_gate.png` — `/sign/[token]/workflow` preservation smoke
- metadata: `phase43c-screenshots-metadata.json`

The required authenticated 43C screenshot set completed successfully.

## 3. Preservation Checks

The following protected areas were preserved and not modified in Phase 43C:

- `/sign/[token]/workflow`
- OTP/signing/public-signing APIs
- SMS disabled
- no migrations

Additional preservation evidence:

- `/sign/[token]/workflow` token gate screenshot captured successfully from the local production build.
- `npx next build --webpack` still generated the protected routes, including `/sign/[token]/workflow`, `/api/sign/[token]/request-otp`, `/api/sign/[token]/verify-otp`, and `/api/public-signing/document/[token]/*`.

## 4. Required Validation Runs

### Build

Command:

```powershell
cd apps/web
npx next build --webpack
```

Result:

- **PASS**
- Next.js 16.2.4 webpack build compiled successfully
- static pages generated: `106/106`

### TypeScript

Command:

```powershell
cd apps/web
npx tsc --noEmit
```

Result:

- **FAIL — pre-existing baseline noise remains outside Phase 43C scope**
- authoritative error count from this run: `82`

Observed failures remain in untouched files outside the landing fix and capture scope, including examples such as:

- `src/lib/server/legal-risk-dashboard-service.ts`
- `src/lib/server/operations.ts`
- `src/lib/server/password-login-policy.test.ts`
- `src/lib/server/pilot-email-override.test.ts`
- `src/lib/server/privacy-service.ts`
- `src/lib/server/promissory-note-service.ts`
- `src/lib/server/public-signing-service.ts`

No new TypeScript error was introduced in the Phase 43C landing component change.

## 5. Files Added or Changed for Phase 43C

- modified: `apps/web/src/components/landing/WathiqcareWhiteLanding.tsx`
- added: `__phase43c_capture.cjs`
- added: `docs/production-readiness/phase43c-screenshots/*`
- added: `docs/production-readiness/phase43c-visual-approval-gap-closure-report.md`

Note: `apps/web/app/page.tsx` and `apps/web/app/[lang]/page.tsx` were already part of the pre-existing Phase 43B working-tree state and were not changed by this 43C closure step.

## 6. Conclusion

Phase 43C closed the remaining Phase 43B visual approval gaps:

- broken landing image/logo slot: fixed with an approved existing local asset
- authenticated physician journey evidence: captured successfully
- protected signing and public-signing surfaces: preserved
- SMS: still disabled
- migrations: none run

Phase 43C is ready for user visual approval on the updated screenshot bundle in `docs/production-readiness/phase43c-screenshots/`.
