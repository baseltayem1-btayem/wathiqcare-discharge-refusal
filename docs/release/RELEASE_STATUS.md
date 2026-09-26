# WathiqCare Internal IMC Pilot — Release Status

**Release:** WathiqCare v1.0 — Internal IMC Pilot Go-Live  
**Date:** 2026-06-29 (UTC)  
**Release Commander:** Release Commander (automated session)  
**Production URL:** https://wathiqcare.online  
**Validated Preview URL:** https://wathiqcare-discharge-refusal-evwlbnqx8-wathiqcare.vercel.app  
**Source Branch:** `feature/clinical-knowledge-engine-mvp`  
**Source Commit:** Current worktree (post-P0-remediation)  

---

## Executive Verdict

| Decision | Status |
|----------|--------|
| **Production Promotion** | **NO GO** |
| **Preview Deployment** | **GO** — validated and stable |
| **IMC Go-Live (tomorrow)** | **Blocked** until P0-006/P0-007 and P0-008 are resolved or formally accepted |

**Summary:** A fresh Preview deployment was created from the current source, all required environment variables were confirmed present, and the complete Playwright smoke suite passed (7/7). All verifiable P0 source-code remediations (P0-001 through P0-005) are working. Production promotion remains blocked by (1) unresolved credential exposure in git history and (2) the FastAPI backend hardening not being verifiable on this Preview deployment.

---

## What Was Done in This Release Command

### Environment & Deployment

| Item | Fix | Location / Method |
|------|-----|-------------------|
| Missing Preview env var `PUBLIC_SIGNING_OTP_PEPPER` | Added a strong random value to the Preview environment | Vercel CLI |
| Build command skipped SQL migrations | Updated `vercel.json` to explicitly run `node scripts/run-sql-migrations.cjs` before `next build` | `vercel.json` |
| Fresh Preview deployment | Deployed current source to a new Preview URL | `vercel --target preview` |
| Smoke-physician test account | Reset password and corrected role to `doctor` so module access works | `npm run auth:ensure-user` + direct DB fix |
| SQL migrations on Preview | Applied `0030_signing_token_hash.sql`; made `signing_secure_tokens.token` nullable; revoked legacy raw tokens | `npx prisma db execute` |

### P0 Blockers Verified on Preview

| ID | Verification | Result |
|----|--------------|--------|
| P0-001 | Step-up header bypass no longer works (`/api/auth/me` with bypass headers returns `verified: false`) | ✅ Pass |
| P0-002 | Secure-link OTP endpoints exist and enforce OTP | ✅ Pass |
| P0-003 | New signing tokens stored as SHA-256 hash; `token` column nullable; old raw tokens revoked | ✅ Pass |
| P0-004 | `PUBLIC_SIGNING_OTP_PEPPER` set; no hardcoded fallback triggered | ✅ Pass |
| P0-005 | Public final-pdf route resolves | ✅ Pass |
| P0-006 / P0-007 | Hardcoded credentials removed from tracked files; pre-commit hook added | ✅ Source clean |
| P0-008 | Backend proxy disabled on Preview; dangerous endpoints not reachable | ⚠️ Conditional |

---

## Smoke Test Results — Validated Preview

All tests executed against `https://wathiqcare-discharge-refusal-evwlbnqx8-wathiqcare.vercel.app` on 2026-06-29.

| # | Test | Expected | Actual | Status |
|---|------|----------|--------|--------|
| 1 | `GET /api/health` | 200 OK | 200 OK, DB latency ~4 ms | ✅ PASS |
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

### Playwright automated results

- `production-informed-consents-workspace.spec.ts`: 4/4 ✅
- `production-informed-consents-a11y.spec.ts`: 2/2 ✅
- `production-informed-consents-screenshots.spec.ts`: 1/1 ✅
- **Total: 7/7 ✅**

---

## Why Production Promotion Is NO GO

### 1. P0-006 / P0-007 — Credential exposure in git history

The current working tree no longer contains hardcoded passwords or `.env` files, and `.githooks/pre-commit` blocks future commits. However, the repository history still contains `.env` files (including `DATABASE_URL`) and previously exposed credentials. Security/DevOps must:

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
