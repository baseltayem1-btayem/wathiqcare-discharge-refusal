# IMC Physician Pilot Release Readiness — Go/No-Go Report

**Release:** WathiqCare Internal IMC Physician Pilot  
**Release branch:** `release/imc-physician-pilot-20260704`  
**Branch HEAD:** `37761cfd4c8590fe67b965a870138695363063b2`  
**Validation date:** 2026-07-03  
**Validator:** Automated release-validation session  
**Status:** Release candidate prepared; **no deployment performed**  

---

## Executive Verdict

| Decision | Status | Rationale |
|----------|--------|-----------|
| **Release candidate code freeze** | **GO** | Branch builds, targeted tests pass, pilot scope is complete, and no pilot-related TypeScript/lint errors remain. |
| **Preview / pilot deployment** | **GO — with conditions** | A preview deployment may proceed **only after** the required feature flags and environment variables are set. No live deployment has been run yet. |
| **Production patient-facing promotion** | **NO GO** | Existing production tag `prod-homepage-wathiqcare-online-2026-06-25` (`a52d6b14`) remains the production baseline. Promotion is blocked until credential-history rotation (P0-006/P0-007) and hardened FastAPI backend verification (P0-008) are complete. |

**Summary:** The release branch is ready for internal pilot use. All Batch 5 illustration work and the internal review-mode feature are integrated. The physician workspace has been scoped to pilot-only pages, dead buttons are disabled, and the send workflow is dry-run only. A live preview deployment and final smoke tests are still required before physicians can access the pilot.

---

## Release Scope

This release candidate contains the accepted Batch 5 clinical illustration integration plus the internal clinical illustration review mode.

| Capability | Status |
|------------|--------|
| Batch 5 Part 1 illustrations (procedures 1–10) | ✅ Integrated (`dcb64994`) |
| Batch 5 Part 2 illustrations (procedures 11–20) | ✅ Integrated (`8777d401`) |
| Internal review mode for draft illustrations | ✅ Implemented (`37761cfd` + branch fixes) |
| Pilot navigation scoping | ✅ Prototype-only pages hidden |
| Dead-button cleanup | ✅ Patients / Encounters actions disabled with tooltip |
| Pilot badge | ✅ Added to workspace sidebar |
| Dry-run send safety | ✅ Real "Confirm send" hidden; only dry-run available |
| Dry-run audit logging | ✅ `consent_dry_run_sent` audit event written |
| RBAC for illustration review | ✅ `clinical_knowledge:review_illustrations` permission enforced |

---

## Validation Results

### 1. Registry & Seed Validation

| Test | Result |
|------|--------|
| FigureLabs registry validation (243 rows) | ✅ Pass |
| IMC seed plan idempotency & counts | ✅ Pass |
| Approved illustration presence (Laparoscopic Cholecystectomy) | ✅ Pass |

### 2. Unit / Integration Tests

All targeted tests executed with `npx tsx --test`.

| Suite | Result |
|-------|--------|
| `seed-from-imc.test.ts` | ✅ Pass |
| `illustration-service.test.ts` | ✅ Pass |
| `assembly-service.test.ts` | ✅ Pass |
| `informed-consents-rbac.test.ts` | ✅ Pass |
| `informed-consent-integration.test.ts` | ✅ Pass |
| `route-handler.test.ts` | ✅ Pass |
| **Total** | **30/30 ✅** |

Key behaviors covered:
- Draft illustrations are excluded from patient-facing assemblies.
- `reviewMode` includes draft illustrations with `patientFacing=false` and `status=pending`.
- The resolve endpoint enforces `clinical_knowledge:review_illustrations` in review mode.
- Physician, clinical reviewer, admin, and platform-admin roles can review; viewer cannot.

### 3. Lint

| Command | Result |
|---------|--------|
| ESLint on all changed pilot files | ✅ Clean |

### 4. TypeScript

| Metric | Result |
|--------|--------|
| Pilot-related files (`tsc --noEmit`) | ✅ 0 errors |
| Project-wide `tsc --noEmit` | ⚠️ 27 pre-existing errors in unrelated files |
| `ignoreBuildErrors: true` | ℹ️ Next.js build configured to skip type errors at build time |

The remaining TypeScript errors are in legacy/unrelated files (e.g. promissory-note PDF render, Microsoft auth, test specs) and do not affect the pilot code path.

### 5. Build

| Command | Result |
|---------|--------|
| `npm run build` (from `apps/web`) | ✅ Pass |

Static pages generated successfully; SQL migrations were skipped locally because a placeholder `DATABASE_URL` was detected.

### 6. Smoke Tests

| Test | Result |
|------|--------|
| Playwright smoke suite against a live deployment | ⚠️ **Not executed** — no preview/production deployment was performed |

A live smoke run must be completed after the first preview deployment.

---

## Environment & Configuration Requirements

### Required Secrets (confirmed present in local validation environment)

- `DATABASE_URL`
- `DATABASE_URL_POOLED`
- `DATABASE_URL_UNPOOLED`
- `JWT_SECRET_KEY`
- `PUBLIC_LINK_TOKEN_PEPPER`
- `PUBLIC_SIGNING_OTP_PEPPER`
- `WATHIQ_STEP_UP_SECRET`

### Required Feature Flags for Pilot

The following flags must be enabled for the pilot tenant / deployment:

| Flag | Required Value | Purpose |
|------|----------------|---------|
| `FF_ENABLE_CONTENT_MAPPING_ENGINE` | `true` | Enables procedure-to-content resolution. |
| `FF_ENABLE_CLINICAL_KNOWLEDGE_ENGINE` | `true` | Enables clinical knowledge assembly. |
| `FF_ENABLE_CKE_PACKAGE_ASSEMBLY` | `true` | Enables package assembly for informed consents. |

### Pending Database Migrations

The pilot depends on migrations already present under `apps/web/prisma/migrations/`, including:

- `0028_clinical_knowledge_engine_mvp.sql`
- `0031_clinical_knowledge_illustrations.sql`
- `0032_clinical_knowledge_illustration_synonyms.sql`
- `0033_bilingual_clinical_illustrations.sql`

Ensure these are applied to the target database before launch.

---

## Production Gap Analysis

| Item | Current State |
|------|---------------|
| Production tag | `prod-homepage-wathiqcare-online-2026-06-25` → `a52d6b14` |
| `origin/main` | `4d71cd9f` |
| Verified production Vercel URL | **Not confirmed in repo** — docs reference `https://wathiqcare.online` as an alias; older preview URLs exist. |
| Live pilot deployment | **None performed** |

**Recommendation:** Do not promote this branch to production patient-facing traffic until:
1. P0-006/P0-007 credential rotation and git-history rewrite are complete.
2. P0-008 hardened FastAPI backend is redeployed and verified.
3. A successful preview smoke run is completed.

---

## Rollback Plan

If the pilot deployment fails or must be reverted:

1. Revert the Vercel deployment to the production tag `prod-homepage-wathiqcare-online-2026-06-25` (`a52d6b14`).
2. Alternatively, reset to `origin/main` (`4d71cd9f`).
3. Disable the three pilot feature flags if needed.

---

## Sign-Off

| Role | Name | Signature / Date | Verdict |
|------|------|------------------|---------|
| Release Commander | — | 2026-07-03 | **GO for code freeze / preview deployment**; **NO GO for production patient-facing promotion** |
| Engineering Lead | ________________ | ________________ | _______ |
| Security Lead | ________________ | ________________ | _______ |
| Clinical Governance Lead | ________________ | ________________ | _______ |
| IMC Pilot Sponsor | ________________ | ________________ | _______ |

---

## Next Steps

1. Deploy the release branch to a **Vercel Preview** environment.
2. Set the required feature flags and secrets on that Preview.
3. Apply pending SQL migrations to the Preview database.
4. Run the Playwright smoke suite against the Preview URL.
5. Resolve P0-006/P0-007 and P0-008 before any production promotion.
6. Re-run this validation report and update the verdict.

---

## References

- `docs/release/01-production-blockers.md`
- `docs/release/02-production-checklist.md`
- `docs/release/FINAL_GO_LIVE_CHECKLIST.md`
- `docs/release/RELEASE_STATUS.md`
- `apps/web/prisma/migrations/`
- `apps/web/pilot-evidence/`
