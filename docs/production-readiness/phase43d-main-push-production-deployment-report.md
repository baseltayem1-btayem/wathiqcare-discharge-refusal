# Phase 43D — Main Push and Production Deployment Report

**Date:** 2 June 2026  
**Branch approved and pushed:** `phase43b-additive-approved-baseline`  
**Merged branch:** `main`  
**Approved feature commit:** `ab9f514a85801b3a63aeebf5edac7768da34c8e3`  
**Production main commit:** `072e993f2bd84a0ed33cf70fc5378f49a8325190`

## Final Classification

**`PRODUCTION DEPLOYED – APPROVED FULL JOURNEY BASELINE ACTIVE`**

## 1. Scope Control

Phase 43D committed and deployed only the approved Phase 43B/43C baseline files.

### Included in commit

- `apps/web/app/page.tsx`
- `apps/web/app/[lang]/page.tsx`
- `apps/web/src/components/landing/WathiqcareWhiteLanding.tsx`
- `apps/web/src/components/informed-consents/final-ui/ConsentBuilder.tsx`
- `apps/web/src/components/informed-consents/final-ui/fixtures/consent-builder.ts`
- `apps/web/src/components/informed-consents/final-ui/steps/StepPatient.tsx`
- `apps/web/src/components/informed-consents/final-ui/steps/StepProcedure.tsx`
- `apps/web/src/components/informed-consents/final-ui/steps/StepPreview.tsx`
- `apps/web/src/components/informed-consents/final-ui/steps/StepSend.tsx`
- `docs/production-readiness/phase43b-additive-approved-baseline-composition-report.md`
- `docs/production-readiness/phase43c-visual-approval-gap-closure-report.md`
- `docs/production-readiness/phase43c-screenshots/*`

### Explicitly excluded from commit

- Prisma schema and migration paths
- projection and shadow-mode files
- signing orchestration files
- public-signing API changes
- OTP/signing/token/session logic changes
- SMS-related changes
- `.env*`, `.next/*`, `.vercel/*`, `node_modules/*`
- temporary `__phase*.cjs` scripts
- deferred request-demo component candidate
- untracked OTP branding component candidates

### Forbidden-file check

`git diff --name-only --cached` was run before commit.

Result: no forbidden file paths were staged.

## 2. Git Execution

### Branch confirmation

Current branch before commit:

- `phase43b-additive-approved-baseline`

### Commit created

```text
feat(wathiqcare): restore approved landing and physician journey baseline
```

Commit SHA:

- `ab9f514a85801b3a63aeebf5edac7768da34c8e3`

### Push and merge

- pushed: `origin/phase43b-additive-approved-baseline`
- merged to `main` with `--no-ff`
- pushed: `origin/main`

Production `main` SHA after merge:

- `072e993f2bd84a0ed33cf70fc5378f49a8325190`

## 3. Build and TypeScript Status

### Local build

Command:

```powershell
cd apps/web
npx next build --webpack
```

Result:

- **PASS**

### Local TypeScript

Command:

```powershell
cd apps/web
npx tsc --noEmit
```

Result:

- **fails on pre-existing baseline noise outside Phase 43B/43C scope**
- prior authoritative local run count for the touched validation pass: `82` error lines
- broader repo baseline still reports many unrelated historical errors in server and test surfaces

This did not block the approved Phase 43B/43C code slice itself.

## 4. Production Deployment Outcome

### Vercel CLI behavior

A direct `npx vercel deploy --prod --yes` attempt first hit a transient Vercel upload/API failure. A retry progressed to deployment processing. The CLI terminal output was noisy and not reliable as the final source of truth.

### Source of truth used for deployment verification

The production runtime endpoint was verified directly:

- `https://wathiqcare.online/api/health/runtime`

Observed response included:

- `status = ok`
- `deployment.gitCommitRef = main`
- `deployment.gitCommitSha = 072e993f2bd84a0ed33cf70fc5378f49a8325190`

This exactly matches `origin/main` and confirms the approved merge is active on the production alias.

## 5. Production Verification

### Runtime health

- `https://wathiqcare.online/api/health/runtime` returned healthy JSON with `status: ok`
- runtime commit SHA matches `main`

### Landing and public routes

Verified live on production:

- `/` renders updated landing page with fixed partner/logo image slot
- `/en` renders updated landing page
- `/ar` remains valid
- `/request-demo` remains valid

### Authenticated physician journey

Verified live on production with existing confirmed account:

- `/modules/informed-consents` opens the physician journey
- Step 1 reachable
- Step 2 reachable
- Step 6 PDF Preview reachable
- Step 7 Validation reachable
- Step 8 Send reachable
- Arabic mode works
- `/modules/informed-consents/create` remains preserved
- `/modules` remains valid
- `/sign/[token]/workflow` route remains mounted and returns the token gate surface

### Safety and preservation constraints

- no migrations were run in this phase
- no SMS enabling action was performed
- no OTP/signing/token/session logic was modified in the approved commit
- no public-signing API files were included in the approved commit
- no patient-journey source outside the approved final-ui files was modified

## 6. Production Screenshots

Saved under:

- `docs/production-readiness/phase43d-production-screenshots/`

Required captures completed:

- `01_landing.png`
- `02_landing_en.png`
- `03_landing_ar.png`
- `04_request_demo.png`
- `05_step1_patient.png`
- `06_step2_procedure.png`
- `07_step6_pdf_preview.png`
- `08_step7_validation.png`
- `09_step8_send.png`
- `10_arabic_mode.png`
- `11_modules_informed-consents_create.png`
- `12_modules.png`
- `13_sign_workflow_token_gate.png`
- `phase43d-production-screenshots-metadata.json`

## 7. Conclusion

Phase 43D completed the approved path end-to-end:

- clean scoped commit created
- approved branch pushed
- merged into `main`
- production runtime confirmed on the new `main` SHA
- updated landing with fixed image slot verified live
- authenticated physician journey verified live
- preserved routes and constraints maintained

**Final status: `PRODUCTION DEPLOYED – APPROVED FULL JOURNEY BASELINE ACTIVE`**
