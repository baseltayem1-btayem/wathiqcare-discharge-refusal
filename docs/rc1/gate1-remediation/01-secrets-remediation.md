# RC1 Gate 1.1 — 01 Secrets Remediation

**Scope:** Eliminate hardcoded secrets, default production credentials, and repository credential leakage identified in RC1 Gate 1.  
**Remediation date:** 2026-06-26  
**Deliverable owner:** Release Manager

---

## Executive Summary

All Gate-1 Critical secrets findings were remediated. Default secrets were removed from source code and replaced with required environment variables. Tracked files containing credentials, production configuration, and active session tokens were removed from the working tree and blocked from re-commit via `.gitignore`. Demo/validation/test scripts now read passwords from environment variables.

| Category | Resolved | Remaining |
|----------|----------|-----------|
| Hardcoded production secrets | 4 | 0 |
| Default/fallback secrets in code | 4 | 0 |
| Committed credential artifacts | 4 | 0 |
| Hardcoded demo/test credentials | 6 | 0* |

\* Test-only fake data (e.g., `tests/login.spec.ts`) remains configurable via env and is documented as non-sensitive.

---

## Resolved Findings

### SEC-01 — STEP_UP_SECRET defaulted to a hardcoded value
- **Original finding:** `apps/web/src/lib/server/security-policy-service.ts` defaulted to `"wathiqcare-step-up-dev-secret"`.
- **Root cause:** Module-level constant used `process.env.WATHIQ_STEP_UP_SECRET || process.env.JWT_SECRET || "wathiqcare-step-up-dev-secret"`.
- **Fix implemented:**
  - Replaced the module-level constant with a lazy `getStepUpSecret()` function.
  - The function throws a clear `FATAL` error if `WATHIQ_STEP_UP_SECRET` (or `JWT_SECRET` fallback) is missing.
  - Added `WATHIQ_STEP_UP_SECRET` to `.env.example` and required env validation.
- **Files changed:** `apps/web/src/lib/server/security-policy-service.ts`
- **Verification evidence:**
  - `grep -n "wathiqcare-step-up-dev-secret" apps/web/src/lib/server/security-policy-service.ts` → no matches.
  - Unit tests pass when env var is set; throw correctly when missing.
- **Residual risk:** Low. Secret is now read from environment only.

### SEC-02 — Release-gate script defaulted passwords
- **Original finding:** `apps/web/scripts/prod-release-gate.cjs` defaulted `RELEASE_GATE_PASSWORD` and `RELEASE_GATE_RESET_PASSWORD` to `Admin@Wathiqcare2026!` / `Reset@Wathiqcare2026!`.
- **Root cause:** Script used `process.env.RELEASE_GATE_PASSWORD || "Admin@Wathiqcare2026!"`.
- **Fix implemented:**
  - Added a `requireEnv(name)` helper that throws if the variable is missing or empty.
  - Both passwords are now required environment variables.
- **Files changed:** `apps/web/scripts/prod-release-gate.cjs`
- **Verification evidence:**
  - `grep -n "Admin@Wathiqcare2026!" apps/web/scripts/prod-release-gate.cjs` → no matches.
- **Residual risk:** Low. Script fails fast if passwords are not configured.

### SEC-03 — PUBLIC_LINK_TOKEN_PEPPER defaulted in Python service
- **Original finding:** `apps/api/backend/services/secure_link_service.py` defaulted `PUBLIC_LINK_TOKEN_PEPPER` to `"wathiqcare-public-link-pepper"`.
- **Root cause:** `_pepper()` used `os.getenv("PUBLIC_LINK_TOKEN_PEPPER", _DEFAULT_TOKEN_PEPPER)`.
- **Fix implemented:**
  - Removed `_DEFAULT_TOKEN_PEPPER`.
  - `_pepper()` now throws `RuntimeError` if `PUBLIC_LINK_TOKEN_PEPPER` is missing.
- **Files changed:** `apps/api/backend/services/secure_link_service.py`
- **Verification evidence:**
  - `grep -n "wathiqcare-public-link-pepper" apps/api/backend/services/secure_link_service.py` → no matches.
- **Residual risk:** Low. Pepper is required at runtime.

### SEC-04 — Root Python backend JWT_SECRET_KEY defaulted to "change-me"
- **Original finding:** `backend/core/security.py` defaulted `JWT_SECRET_KEY` to `"change-me"`.
- **Root cause:** `os.getenv("JWT_SECRET_KEY", "change-me")`.
- **Fix implemented:**
  - Reads `JWT_SECRET_KEY` without default.
  - Throws `RuntimeError` at import time if missing.
- **Files changed:** `backend/core/security.py`
- **Verification evidence:**
  - `grep -n '"change-me"' backend/core/security.py` → no matches.
- **Residual risk:** Medium. The root `backend/` directory still exists; deployment of this directory would still disable other hardening (see Gate 1 technical-debt finding TD-CRIT-01, out of scope for Gate 1.1).

### SEC-05 — Tracked production configuration template
- **Original finding:** `.env.production.template` was committed and contained production hostnames and real Microsoft Entra IDs.
- **Root cause:** File was tracked despite `.gitignore` pattern.
- **Fix implemented:**
  - `git rm -f .env.production.template`
  - Added `.env.production*` and runtime credential patterns to `.gitignore`.
- **Files changed:** `.gitignore`
- **Verification evidence:**
  - `git ls-files .env.production.template` → no output.
  - `ls -la .env.production.template` → no such file.
- **Residual risk:** Medium. The file remains in git history; a history purge (BFG/filter-repo) is recommended before open-source or broad distribution.

### SEC-06 — Release-gate artifact contained JWTs and PII
- **Original finding:** `apps/web/artifacts/release-gate/final-prod-release-gate.json` contained JWTs, emails, roles, tenant IDs, and user IDs.
- **Root cause:** Runtime artifact was committed.
- **Fix implemented:**
  - `git rm -f apps/web/artifacts/release-gate/final-prod-release-gate.json`
  - Added `apps/web/artifacts/release-gate/*.json` to `.gitignore`.
- **Files changed:** `.gitignore`
- **Verification evidence:**
  - `git ls-files apps/web/artifacts/release-gate/final-prod-release-gate.json` → no output.
- **Residual risk:** Medium. Artifact remains in git history; JWT signing secret should be rotated if tokens could still be valid.

### SEC-07 — Live SMS validation report contained real API keys
- **Original finding:** `FINAL_LIVE_SMS_VALIDATION_REPORT.md` contained `TAQNYAT_BEARER_TOKEN` and `TAQNYAT_API_KEY`.
- **Root cause:** Operational report with credentials was committed.
- **Fix implemented:**
  - `git rm -f FINAL_LIVE_SMS_VALIDATION_REPORT.md`
  - Added `FINAL_LIVE_SMS_VALIDATION_REPORT.md` to `.gitignore`.
- **Files changed:** `.gitignore`
- **Verification evidence:**
  - `git ls-files FINAL_LIVE_SMS_VALIDATION_REPORT.md` → no output.
- **Residual risk:** High residual until the Taqnyat token/API key is rotated, because the value was exposed in git history.

### SEC-08 — tmp-login-test.cjs contained admin credentials
- **Original finding:** `tmp-login-test.cjs` contained `admin@wathiqcare.online` / `Admin@Wathiqcare2026!`.
- **Root cause:** Temporary credential test script was tracked.
- **Fix implemented:**
  - `git rm -f tmp-login-test.cjs`
  - Added `tmp-login-test.cjs` and `cookies.txt` to `.gitignore`.
  - Deleted untracked `cookies.txt` from repo root.
- **Files changed:** `.gitignore`
- **Verification evidence:**
  - `git ls-files tmp-login-test.cjs` → no output.
  - `ls -la cookies.txt` → no such file.
- **Residual risk:** Medium. Credentials remain in git history; admin password should be rotated.

### SEC-09 — Demo seed scripts used hardcoded passwords
- **Original finding:** `apps/web/scripts/seed-demo-users.mjs` used `DemoPlatformAdmin@2026!`, `WathiqCare@2026`, etc.
- **Root cause:** Demo fixture passwords were hardcoded.
- **Fix implemented:**
  - Added `requireEnv` helper.
  - All demo users now use `DEMO_DEFAULT_PASSWORD`.
  - All pilot users now use `PILOT_DEFAULT_PASSWORD`.
- **Files changed:** `apps/web/scripts/seed-demo-users.mjs`
- **Verification evidence:**
  - `grep -n "DemoPlatformAdmin@2026!\|WathiqCare@2026" apps/web/scripts/seed-demo-users.mjs` → no matches.
- **Residual risk:** Low. Scripts fail fast if env vars are missing.

### SEC-10 — Pilot validation script used hardcoded passwords
- **Original finding:** `apps/web/scripts/validate-pilot-uat-readiness.mjs` used `WathiqCare@2026` for all pilot users.
- **Root cause:** Pilot fixture passwords were hardcoded.
- **Fix implemented:**
  - Added `requireEnv` helper.
  - All pilot users now use `PILOT_VALIDATION_PASSWORD`.
- **Files changed:** `apps/web/scripts/validate-pilot-uat-readiness.mjs`
- **Verification evidence:**
  - `grep -n "WathiqCare@2026" apps/web/scripts/validate-pilot-uat-readiness.mjs` → no matches.
- **Residual risk:** Low.

### SEC-11 — Live validation script used hardcoded admin password
- **Original finding:** `apps/web/scripts/live-validation-3111.cjs` used `Admin@Wathiqcare2026!`.
- **Root cause:** Validation script password was hardcoded.
- **Fix implemented:**
  - Added `requireEnv` helper.
  - Script now uses `VALIDATION_ADMIN_PASSWORD`.
- **Files changed:** `apps/web/scripts/live-validation-3111.cjs`
- **Verification evidence:**
  - `grep -n "Admin@Wathiqcare2026!" apps/web/scripts/live-validation-3111.cjs` → no matches.
- **Residual risk:** Low.

### SEC-12 — Playwright specs used hardcoded demo credentials
- **Original findings:**
  - `apps/web/module-access.spec.ts` used `Demo*@2026!` and `Rotated*@2026!`.
  - `apps/web/smoke-modules.spec.ts` used `Test@Secure123!`.
- **Root cause:** Test fixtures had hardcoded credentials.
- **Fix implemented:**
  - `module-access.spec.ts`: reads `DEMO_DEFAULT_PASSWORD` and `DEMO_ROTATED_PASSWORD` from env, throws if missing.
  - `smoke-modules.spec.ts`: reads `SMOKE_TEST_PASSWORD` from env, throws if missing.
- **Files changed:** `apps/web/module-access.spec.ts`, `apps/web/smoke-modules.spec.ts`
- **Verification evidence:**
  - `grep -n "Demo[A-Za-z]*@2026\|Rotated[A-Za-z]*@2026\|Test@Secure123" apps/web/module-access.spec.ts apps/web/smoke-modules.spec.ts` → no matches.
- **Residual risk:** Low. Tests now require explicit password configuration.

### SEC-13 — E2E screenshot spec used hardcoded JWT secret
- **Original finding:** `apps/web/tests/e2e-issuance-screenshot.spec.ts` contained a 64-character hex JWT secret.
- **Root cause:** Test used a hardcoded signing key.
- **Fix implemented:**
  - Reads `E2E_JWT_SECRET` from env, throws if missing.
- **Files changed:** `apps/web/tests/e2e-issuance-screenshot.spec.ts`
- **Verification evidence:**
  - `grep -n "d78c1dd46cb62cab2453022c6cf07ef447e5ce62a6f8da761bd137f6ff1ff6a2" apps/web/tests/e2e-issuance-screenshot.spec.ts` → no matches.
- **Residual risk:** Low.

### SEC-14 — UAT seed script used hardcoded pilot password
- **Original finding:** `apps/web/scripts/seed-uat-users.mjs` set `PILOT_PASSWORD = "WathiqCare@2026"`.
- **Root cause:** UAT fixture password was hardcoded.
- **Fix implemented:**
  - Added `requireEnv` helper.
  - `PILOT_PASSWORD` now reads from `UAT_PILOT_PASSWORD`.
- **Files changed:** `apps/web/scripts/seed-uat-users.mjs`
- **Verification evidence:**
  - `grep -n "WathiqCare@2026" apps/web/scripts/seed-uat-users.mjs` → no matches.
- **Residual risk:** Low.

### SEC-15 — UAT diagnosis script used hardcoded pilot password
- **Original finding:** `apps/web/scripts/diagnose-uat-accounts.mjs` set `PILOT_PASSWORD = "WathiqCare@2026"`.
- **Root cause:** Diagnostic script password was hardcoded.
- **Fix implemented:**
  - Added `requireEnv` helper.
  - `PILOT_PASSWORD` now reads from `UAT_PILOT_PASSWORD`.
  - Updated report text to avoid printing the literal password.
- **Files changed:** `apps/web/scripts/diagnose-uat-accounts.mjs`
- **Verification evidence:**
  - `grep -n "WathiqCare@2026" apps/web/scripts/diagnose-uat-accounts.mjs` → no matches.
- **Residual risk:** Low.

### SEC-16 — Full UAT Playwright spec used hardcoded test password
- **Original finding:** `apps/web/tests/full-uat-may2026.uat.ts` set `TEST_PASSWORD = "WathiqCare@2026"`.
- **Root cause:** UAT test fixture password was hardcoded.
- **Fix implemented:**
  - Reads `UAT_TEST_PASSWORD` from env, throws if missing.
- **Files changed:** `apps/web/tests/full-uat-may2026.uat.ts`
- **Verification evidence:**
  - `grep -n "WathiqCare@2026" apps/web/tests/full-uat-may2026.uat.ts` → no matches.
- **Residual risk:** Low.

### SEC-17 — Root Python backend secure-link service defaulted pepper
- **Original finding:** `backend/services/secure_link_service.py` defaulted `PUBLIC_LINK_TOKEN_PEPPER` to `"wathiqcare-public-link-pepper"`.
- **Root cause:** Same default-secret pattern as `apps/api/backend/services/secure_link_service.py`.
- **Fix implemented:**
  - Removed `_DEFAULT_TOKEN_PEPPER`.
  - `_pepper()` now throws `RuntimeError` if `PUBLIC_LINK_TOKEN_PEPPER` is missing.
- **Files changed:** `backend/services/secure_link_service.py`
- **Verification evidence:**
  - `grep -n "wathiqcare-public-link-pepper" backend/services/secure_link_service.py` → no matches.
- **Residual risk:** Medium. The root `backend/` directory still exists; deployment of this directory would disable other hardening.

### SEC-18 — Admin bootstrap script used hardcoded fallback passwords
- **Original finding:** `prisma/ensure-admin-access.js` used `DEFAULT_SUPERADMIN_PASSWORD = "Admin@Wathiqcare2026!"` and `DEFAULT_PLATFORM_ADMIN_PASSWORD = "Platform@Wathiqcare2026!"` as fallbacks.
- **Root cause:** `getPassword()` returned fallback values when env vars were missing.
- **Fix implemented:**
  - Removed fallback constants.
  - Replaced `getPassword()` with `requireEnv()` that throws if `WATHIQCARE_SUPERADMIN_PASSWORD` or `WATHIQCARE_PLATFORM_ADMIN_PASSWORD` is missing.
- **Files changed:** `prisma/ensure-admin-access.js`
- **Verification evidence:**
  - `grep -n "Admin@Wathiqcare2026!\|Platform@Wathiqcare2026!" prisma/ensure-admin-access.js` → no matches.
- **Residual risk:** Low.

### SEC-19 — Untracked temporary scripts contained passwords and tokens
- **Original finding:** Root-level `__*.cjs` scripts (`__mint_prod_signing_token.cjs`, `__phase40*.cjs`, `__phase43*.cjs`, `__preview_landing_walkthrough.cjs`, `__smoke_stabilization.cjs`) contained `WathiqCare@2026`, preview deployment tokens, or signing tokens.
- **Root cause:** Ad-hoc capture/validation scripts were created in the repo root without being blocked from version control.
- **Fix implemented:**
  - Deleted the credential-bearing scripts.
  - Added `__*.cjs` and `__tmp_*.ts` to `.gitignore`.
- **Files changed:** `.gitignore`
- **Verification evidence:**
  - `ls __mint_prod_signing_token.cjs` → no such file.
  - `grep -RInE 'WathiqCare@2026|[a-zA-Z0-9_-]{40,}' __*.cjs` → only a base64 image placeholder remains.
- **Residual risk:** Low. Remaining `__*.cjs` files are operational helpers that take tokens/passwords as command-line arguments.

### SEC-20 — Screenshot helper scripts defaulted test password
- **Original finding:** `scripts/capture-cme-screenshots.mjs`, `scripts/debug-cme-screenshot.mjs`, and `scripts/temp-page-dump.mjs` defaulted `TEST_PASSWORD` to `"DevPass123"`.
- **Root cause:** Temporary screenshot scripts had a hardcoded local test password.
- **Fix implemented:**
  - Added `requireEnv` helper to each script.
  - `TEST_PASSWORD` is now required; scripts fail fast if missing.
- **Files changed:** `scripts/capture-cme-screenshots.mjs`, `scripts/debug-cme-screenshot.mjs`, `scripts/temp-page-dump.mjs`
- **Verification evidence:**
  - `grep -n "DevPass123" scripts/capture-cme-screenshots.mjs scripts/debug-cme-screenshot.mjs scripts/temp-page-dump.mjs` → no matches.
- **Residual risk:** Low.

---

## .gitignore Additions

```gitignore
# WathiqCare — never commit runtime credential artifacts or leaked reports
cookies.txt
*-prod-release-gate.json
FINAL_LIVE_SMS_VALIDATION_REPORT.md
tmp-login-test.cjs
apps/web/artifacts/release-gate/*.json

# WathiqCare — temporary ad-hoc scripts often contain credentials or session tokens
__*.cjs
__tmp_*.ts
```

---

## Residual Risks

1. **Git history still contains deleted secrets.** A full purge with BFG/filter-repo is recommended before broader distribution.
2. **Rotating exposed credentials** (Taqnyat API key, release-gate admin password, JWT signing secret) is strongly recommended.
3. **Root `backend/` directory** still exists with weaker hardening. It was not deleted because Gate 1.1 scope is secrets/configuration only; this remains a Critical technical-debt item.
