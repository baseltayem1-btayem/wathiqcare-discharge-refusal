# FINAL GO-LIVE CHECKLIST — Internal IMC Pilot Release Validation

**Release:** WathiqCare v1.0 — Internal IMC Pilot  
**Preview URL:** `https://wathiqcare-discharge-refusal-mgchr0e2r-wathiqcare.vercel.app`  
**Production URL:** `https://wathiqcare.online` (not promoted)  
**Source Commit:** `e2b2e7de7ff59199ff5c0e60c8d350cf4c4ee6cc`  
**Validation Date:** 2026-06-29  
**Validator:** Automated release-validation session  

---

## Executive Summary

| Metric | Result |
|--------|--------|
| Git working tree clean at RC commit | ✅ `e2b2e7de`, no local changes |
| Fresh Preview deployment | ✅ Deployed from `e2b2e7de` |
| Required environment variables | ✅ All present and non-empty in Preview |
| Smoke tests (Playwright) | ✅ 7/7 passed |
| Build (`vercel --target preview`) | ✅ Pass |
| P0 security blockers — source code | ✅ Remediated |
| P0-006 / P0-007 — credential rotation & history rewrite | ❌ Not completed |
| P0-008 — hardened FastAPI backend redeploy/verify | ⚠️ Not verifiable on Preview (backend proxy disabled) |
| **Verdict for Internal IMC Pilot** | **NO GO** |

---

## 1. Authentication

| # | Item | Result | Pass/Fail | Evidence |
|---|------|--------|-----------|----------|
| 1.1 | Login page loads | ✅ 200 OK | Pass | `GET /login` |
| 1.2 | Valid physician login returns access token | ✅ 200 + JWT | Pass | `POST /api/auth/password/login` |
| 1.3 | Unauthenticated request to `/modules/informed-consents` redirects to login | ✅ 307 → `/login?next=...` | Pass | Verified via curl |
| 1.4 | Authenticated request reaches workspace | ✅ 200 OK | Pass | Playwright smoke test |
| 1.5 | **P0-001 — Step-up bypass closed** | ✅ `x-wathiq-step-up: verified` / `x-mfa-verified: true` do **not** mark step-up verified | Pass | `GET /api/auth/me` returned `stepUp.verified: false` with both headers |

---

## 2. Physician Workflow

| # | Item | Result | Pass/Fail | Evidence |
|---|------|--------|-----------|----------|
| 2.1 | Workspace renders with production components | ✅ Rendered | Pass | Playwright workspace test |
| 2.2 | Patient search returns real results | ✅ Results returned | Pass | `DEMO PATIENT CONSENT` found |
| 2.3 | Encounter selection loads encounters | ✅ Encounters loaded | Pass | `DEMO-IC-001` selectable |
| 2.4 | Procedure resolver enables after encounter selection | ✅ Input enabled | Pass | Playwright verified |
| 2.5 | Workspace renders in Arabic RTL | ✅ RTL rendered | Pass | Playwright RTL test |
| 2.6 | Workspace renders on mobile viewport | ✅ Mobile layout | Pass | Playwright mobile test |

---

## 3. Patient Signing Journey

| # | Item | Result | Pass/Fail | Evidence |
|---|------|--------|-----------|----------|
| 3.1 | Patient signing landing page loads | ✅ 200 OK | Pass | `GET /sign/test-token` |
| 3.2 | Public signing OTP request endpoint responds | ✅ 404 document-not-found (no pepper error) | Pass | `POST /api/sign/{token}/request-otp` with body returns `Invalid or expired signing token` |
| 3.3 | **P0-004 — OTP pepper not hardcoded** | ✅ `PUBLIC_SIGNING_OTP_PEPPER` set; OTP hashing works | Pass | Deployment instrumentation confirms `PUBLIC_SIGNING_OTP_PEPPER=set`; OTP request no longer throws missing-pepper 500 |

---

## 4. Secure Signing & Secure Links

| # | Item | Result | Pass/Fail | Evidence |
|---|------|--------|-----------|----------|
| 4.1 | Signing session creation endpoint works | ✅ Returns session + token hash | Pass | `POST /api/modules/informed-consents/send` |
| 4.2 | **P0-003 — Signing tokens hashed at rest** | ✅ `token_hash` populated, `token` NULL for new rows | Pass | DB query on `signing_secure_tokens` |
| 4.3 | Legacy raw tokens revoked | ✅ Existing rows have `token = NULL`, `revoked_at` set | Pass | DB query |
| 4.4 | **P0-002 — Secure-link decisions require OTP** | ✅ OTP request endpoint exists; verify-otp requires `otpCode`; public secure-links verify-otp requires OTP | Pass | API tests + code inspection |
| 4.5 | **P0-005 — Public final-pdf route exists** | ✅ Route resolves (`X-Matched-Path` correct) | Pass | `GET /api/public/informed-consents/signing/{token}/final-pdf` matches `/api/public/informed-consents/signing/[token]/final-pdf` |

---

## 5. PDF Generation

| # | Item | Result | Pass/Fail | Evidence |
|---|------|--------|-----------|----------|
| 5.1 | Public final-pdf route | ✅ Resolves | Pass | See 4.5 |
| 5.2 | Promissory-note PDF route | ✅ Resolves (401 without auth) | Pass | `GET /api/modules/promissory-notes/{id}/pdf` |

---

## 6. Audit / Evidence

| # | Item | Result | Pass/Fail | Evidence |
|---|------|--------|-----------|----------|
| 6.1 | Audit timeline endpoint returns events | ✅ 200 + events | Pass | `GET /api/modules/informed-consents/timeline` |
| 6.2 | Evidence bundle endpoint | ⚠️ 404 on Preview | Not Validated | Backend proxy disabled (`BACKEND_API_BASE_URL` not set in Preview) |

---

## 7. Security / Secrets / Governance

| # | Item | Result | Pass/Fail | Evidence |
|---|------|--------|-----------|----------|
| 7.1 | No hardcoded production credentials in tracked files | ✅ Removed | Pass | `.env` is gitignored; current tracked files clean |
| 7.2 | Pre-commit hook blocks secrets | ✅ Added | Pass | `.githooks/pre-commit` |
| 7.3 | **P0-006 / P0-007 — Credentials rotated and git-history rewritten** | ❌ Not completed | Fail | `git log --all --full-history -- .env` shows `.env` (with database password) still exists in repository history; Security/DevOps rotation + history rewrite required |
| 7.4 | **P0-008 — Backend dangerous endpoints gated/disabled** | ⚠️ Not verifiable on Preview | Not Validated | FastAPI backend is not linked to Preview (`BACKEND_API_BASE_URL` absent); hardened backend must be redeployed/verified separately |

---

## 8. Build / TypeScript / Tests

| # | Item | Result | Pass/Fail | Evidence |
|---|------|--------|-----------|----------|
| 8.1 | Preview build | ✅ Pass | Pass | `vercel --target preview` |
| 8.2 | SQL migrations applied during build | ✅ `vercel.json` buildCommand explicitly runs `node scripts/run-sql-migrations.cjs` | Pass | Build config verified |
| 8.3 | Project-wide TypeScript | ⚠️ 30 pre-existing errors | Fail | P1-017; build ignores errors (`ignoreBuildErrors: true`) |
| 8.4 | Playwright smoke suite | ✅ 7/7 passed | Pass | Against fresh Preview URL |

---

## Screenshot Evidence

| File | Description |
|------|-------------|
| `apps/web/pilot-evidence/ve-03b-production-workspace-screenshots/desktop-default.png` | English LTR desktop workspace on Preview |
| `apps/web/pilot-evidence/ve-03b-production-workspace-screenshots/mobile-default.png` | English LTR mobile workspace on Preview |
| `apps/web/pilot-evidence/ve-03b-production-workspace-screenshots/desktop-rtl.png` | Arabic RTL desktop workspace on Preview |

---

## Mandatory Items Summary

| Status | Count |
|--------|-------|
| ✅ Pass | 23 |
| ⚠️ Not Validated / Conditional | 3 |
| ❌ Fail / Blocker | 2 |

---

## Exact Blockers (NO GO)

The following P0 items remain unresolved and prevent Internal IMC Pilot go-live:

1. **P0-006 / P0-007 — Credential rotation and git-history rewrite required.**  
   The current working tree no longer contains hardcoded passwords or `.env` files, and `.githooks/pre-commit` blocks future commits, but the repository history still contains `.env` files (including `DATABASE_URL` with password) and previously exposed credentials. Security/DevOps must rotate all affected secrets and rewrite history (e.g., `git-filter-repo` + force-push) before promotion.

2. **P0-008 — Hardened FastAPI backend must be redeployed and verified.**  
   The Preview deployment does not expose the FastAPI backend (`BACKEND_API_BASE_URL` is not configured in Preview), so dangerous-endpoint gating cannot be verified here. If production uses the backend path, the hardened backend image must be redeployed and the inspect/SMS-test endpoints confirmed disabled before go-live.

---

## Verdict

**NO GO**

The fresh Preview deployment from commit `e2b2e7de` is stable, passes functional smoke tests, and all verifiable P0 source-code remediations are working. Promotion to the Internal IMC Pilot is blocked until the exposed credentials in git history are rotated/rewritten and the hardened backend path is independently redeployed and verified.
