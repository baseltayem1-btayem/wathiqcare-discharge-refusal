# WathiqCare Internal IMC Pilot — Release Status

**Release:** WathiqCare v1.0 — Internal IMC Pilot Go-Live  
**Date:** 2026-06-29 (UTC)  
**Release Commander:** Release Commander (automated session)  
**Production URL:** https://wathiqcare.online  
**Validated Preview URL:** https://wathiqcare-discharge-refusal-mgchr0e2r-wathiqcare.vercel.app  
**Source Branch:** `feature/clinical-knowledge-engine-mvp`  
**Source Commit:** `e2b2e7de7ff59199ff5c0e60c8d350cf4c4ee6cc`  

---

## Executive Verdict

| Decision | Status |
|----------|--------|
| **Production Promotion** | **NO GO** |
| **Preview Deployment** | **GO** — validated and stable |
| **IMC Go-Live** | **Blocked** until P0-006/P0-007 and P0-008 are resolved or formally accepted |

**Summary:** A fresh Preview deployment was created from commit `e2b2e7de`, all required environment variables were confirmed present and non-empty, and the complete Playwright smoke suite passed (7/7). All verifiable P0 source-code remediations (P0-001 through P0-005) are working. Production promotion remains blocked by (1) unresolved credential exposure in git history and (2) the FastAPI backend hardening not being verifiable on this Preview deployment.

---

## What Was Done in This Release Command

### Environment & Deployment

| Item | Fix | Location / Method |
|------|-----|-------------------|
| Fresh Preview deployment | Deployed `e2b2e7de` to a new Preview URL | `vercel --target preview` |
| Missing Preview env vars | Added/updated strong random values for `PUBLIC_SIGNING_OTP_PEPPER`, `WATHIQ_STEP_UP_SECRET`, `PUBLIC_LINK_TOKEN_PEPPER`, and `PILOT_DOCTOR_PASSWORD` | Vercel CLI |
| Build command runs SQL migrations | `vercel.json` explicitly runs `node scripts/run-sql-migrations.cjs` before `next build` | `vercel.json` |
| Smoke-physician test account | Ensured user exists and corrected role to `doctor` so module access works | `npm run auth:ensure-user` + direct DB role fix |
| SQL migrations on Preview | Applied; `signing_secure_tokens.token` nullable; legacy raw tokens revoked | Build-time migration |

### P0 Blockers Verified on Preview

| ID | Verification | Result |
|----|--------------|--------|
| P0-001 | Step-up header bypass no longer works (`/api/auth/me` with bypass headers returns `verified: false`) | ✅ Pass |
| P0-002 | Secure-link OTP endpoints exist and enforce OTP | ✅ Pass |
| P0-003 | New signing tokens stored as SHA-256 hash; `token` column nullable; old raw tokens revoked | ✅ Pass |
| P0-004 | `PUBLIC_SIGNING_OTP_PEPPER` set; OTP hashing works; no hardcoded fallback triggered | ✅ Pass |
| P0-005 | Public final-pdf route resolves | ✅ Pass |
| P0-006 / P0-007 | Hardcoded credentials removed from tracked files; pre-commit hook added; history still contains `.env` | ❌ Blocker |
| P0-008 | Backend proxy disabled on Preview; dangerous endpoints not reachable; hardened backend not exercised | ⚠️ Conditional |

---

## Smoke Test Results — Validated Preview

All tests executed against `https://wathiqcare-discharge-refusal-mgchr0e2r-wathiqcare.vercel.app` on 2026-06-29.

| # | Test | Expected | Actual | Status |
|---|------|----------|--------|--------|
| 1 | `GET /api/health` | 200 OK | 200 OK | ✅ PASS |
| 2 | `GET /login` (unauthenticated) | 200 OK | 200 OK | ✅ PASS |
| 3 | `POST /api/auth/password/login` (valid credentials) | 200 + access token | 200 + JWT | ✅ PASS |
| 4 | `GET /modules/informed-consents` (authenticated) | 200 OK | 200 OK, production workspace rendered | ✅ PASS |
| 5 | Workspace text contains required headings | All present | All present | ✅ PASS |
| 6 | Patient search returns `DEMO PATIENT CONSENT` | Results returned | Results returned | ✅ PASS |
| 7 | Encounter `DEMO-IC-001` selectable | Encounters loaded | Encounters loaded | ✅ PASS |
| 8 | Mobile viewport workspace load | 200 OK | 200 OK | ✅ PASS |
| 9 | Arabic RTL workspace load | 200 OK | `dir="rtl"` present | ✅ PASS |
| 10 | `/sign/test-token` (patient signing surface) | 200 OK | 200 OK | ✅ PASS |
| 11 | Public final-pdf route resolves | Route matched | `X-Matched-Path` correct | ✅ PASS |
| 12 | Audit timeline endpoint | 200 + events | Events returned | ✅ PASS |
| 13 | P0-001 step-up bypass | `stepUp.verified: false` | Verified false with bypass headers | ✅ PASS |
| 14 | P0-002 secure-link OTP | Endpoints exist and require OTP | Confirmed | ✅ PASS |
| 15 | P0-003 token hashing | New rows have `token_hash`, no raw `token` | Confirmed via DB query | ✅ PASS |
| 16 | P0-004 OTP pepper | Pepper set and functional | Confirmed | ✅ PASS |
| 17 | P0-005 final-pdf route | Route resolves | Confirmed | ✅ PASS |

### Playwright automated results

- `production-informed-consents-workspace.spec.ts`: 4/4 ✅
- `production-informed-consents-a11y.spec.ts`: 2/2 ✅
- `production-informed-consents-screenshots.spec.ts`: 1/1 ✅
- **Total: 7/7 ✅**

---

## Why Production Promotion Is NO GO

### 1. P0-006 / P0-007 — Credential exposure in git history

The current working tree no longer contains hardcoded passwords or `.env` files, and `.githooks/pre-commit` blocks future commits. However, the repository history still contains `.env` files (including `DATABASE_URL` with password) and previously exposed credentials. Security/DevOps must:

- Rotate every secret that appeared in history.
- Rewrite history (e.g., `git-filter-repo`) or force-push a cleaned tree.
- Confirm old credentials are invalid before patient-facing traffic is accepted.

### 2. P0-008 — FastAPI backend hardening not verified on Preview

The Preview deployment does not configure `BACKEND_API_BASE_URL`, so the Next.js backend proxy returns 404 for all `/api/discharge/*` paths. While this means dangerous endpoints are not reachable on Preview, it also means the hardened FastAPI backend has not been exercised here. If production uses the backend path, it must be redeployed from the hardened source and the following confirmed:

- CORS restricted to known origins.
- SMS-test router disabled unless `WATHIQCARE_BACKEND_SMS_TEST_ENABLED=true`.
- System-inspect endpoints disabled or authenticated.

---

## Path to GO

1. **Complete P0-006 / P0-007** — rotate exposed credentials and rewrite git history.
2. **Complete P0-008** — redeploy the hardened FastAPI backend and run backend-specific smoke tests.
3. **Re-run the full Preview smoke suite** against the updated deployment.
4. **Obtain sign-off** from Engineering Lead, Security Lead, Clinical Governance Lead, and IMC Pilot Sponsor.

---

## Sign-Off

| Role | Name | Signature / Date | Verdict |
|------|------|------------------|---------|
| Release Commander | — | 2026-06-29 | **NO GO** for production promotion |
| Engineering Lead | ________________ | ________________ | _______ |
| Security Lead | ________________ | ________________ | _______ |
| Clinical Governance Lead | ________________ | ________________ | _______ |
| IMC Pilot Sponsor | ________________ | ________________ | _______ |

---

## References

- `docs/release/01-production-blockers.md` — Full RC3 P0/P1/P2/P3 audit findings
- `docs/release/02-production-checklist.md` — Production readiness checklist
- `docs/release/FINAL_GO_LIVE_CHECKLIST.md` — This validation run
- `docs/release/04-risk-register.md` — Risk register
- `vercel.json` — Updated build command with explicit SQL migrations
