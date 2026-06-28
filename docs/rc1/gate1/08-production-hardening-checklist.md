# RC1 Gate 1 — 08 Production Hardening Checklist

**Scope:** Security headers, CORS, rate limiting, authentication/authorization, secret management, input validation, dependency vulnerabilities, tenant isolation, and infrastructure hardening.  
**Files reviewed:** `apps/web/next.config.ts`, `apps/api/backend/main.py`, `backend/main.py`, `apps/api/backend/core/http_hardening.py`, `apps/web/src/app/api/auth/password/login/route.ts`, `apps/web/src/lib/server/auth.ts`, `apps/web/src/lib/server/security-policy-service.ts`, `apps/api/backend/services/secure_link_service.py`  
**Review date:** 2026-06-26

---

## Executive Summary

Production hardening is inadequate for RC1. Default/hardcoded secrets exist in multiple paths, the Content Security Policy is permissive, CORS is overly broad, rate limiting is in-memory and not distributed, API input validation is inconsistent, and known high-severity dependency CVEs are unpatched. A tenant-admin bypass flag and two divergent Python backends further weaken the posture.

| Severity | Count |
|----------|-------|
| Critical | 3 |
| High     | 6 |
| Medium   | 3 |
| Low      | 2 |

---

## Findings

### PH-CRIT-01 — Default/hardcoded secrets in production paths
- **Priority:** Critical
- **Description:** Multiple secrets fall back to hardcoded values if environment variables are unset:
  - `apps/web/src/lib/server/security-policy-service.ts` lines 29–32: `STEP_UP_SECRET` defaults to `"wathiqcare-step-up-dev-secret"`.
  - `apps/web/scripts/prod-release-gate.cjs` lines 15–16: release-gate passwords default to `Admin@Wathiqcare2026!` / `Reset@Wathiqcare2026!`.
  - `apps/api/backend/services/secure_link_service.py` lines 40, 60: `PUBLIC_LINK_TOKEN_PEPPER` defaults to `"wathiqcare-public-link-pepper"`.
  - `backend/core/security.py` line 12: `JWT_SECRET_KEY` defaults to `"change-me"`.
- **Risk:** Token forgery and backdoor authentication if any env var is omitted.
- **Recommendation:** Remove all default secrets; require these variables in production and fail startup if missing.
- **Estimated effort:** 0.5 day

### PH-CRIT-02 — Two divergent Python backends
- **Priority:** Critical
- **Description:** `apps/api/backend/` and `backend/` both exist. The root `backend/` lacks CORS hardening, security middleware, rate limiting, and uses a default JWT secret.
- **Risk:** Deploying the wrong directory disables all API hardening.
- **Recommendation:** Delete or archive the root `backend/`; make `apps/api/backend/main.py` the single source of truth.
- **Estimated effort:** 1–2 days

### PH-CRIT-03 — High-severity dependency CVEs are unpatched
- **Priority:** Critical
- **Description:** `npm audit` reports 10 vulnerabilities, including high-severity `next` (DoS, middleware bypass, cache poisoning, XSS) and `nodemailer` (CRLF/header injection, TLS bypass, SSRF).
- **Risk:** Known exploitable vulnerabilities in production-facing packages.
- **Recommendation:** Run `npm audit fix`; upgrade `next` and `nodemailer`; add audit gate to CI.
- **Estimated effort:** 1–2 days

### PH-HIGH-01 — CSP is permissive and missing hardening headers
- **Priority:** High
- **Description:** `apps/web/next.config.ts` lines 9–20 sets CSP with `script-src 'self' 'unsafe-inline' 'unsafe-eval'`, `connect-src` allows `*.app.github.dev`, and there is no `Strict-Transport-Security`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, or `Cross-Origin-Resource-Policy`.
- **Risk:** XSS, downgrade attacks, and abuse of browser features.
- **Recommendation:** Remove `'unsafe-eval'` in production (use nonces/strict-dynamic), restrict `connect-src` to production domains, add HSTS, Permissions-Policy, COOP/CORP.
- **Estimated effort:** 0.5–1 day

### PH-HIGH-02 — Python CORS is overly permissive
- **Priority:** High
- **Description:** `apps/api/backend/main.py` lines 53–59 uses `allow_methods=["*"]`, `allow_headers=["*"]`, `allow_credentials=True`.
- **Risk:** Credential leakage / CSRF if origins are broadened or if wildcard-with-credentials pattern is exploited.
- **Recommendation:** Restrict to exact production origins, avoid `*` with credentials, add `Vary: Origin`.
- **Estimated effort:** 0.5 day

### PH-HIGH-03 — Rate limiting is not distributed / missing on root backend
- **Priority:** High
- **Description:**
  - `apps/api/backend/core/http_hardening.py` lines 18–76 uses per-process in-memory rate limiting.
  - `backend/main.py` has no rate limiting.
  - `apps/web/src/app/api/auth/password/login/route.ts` lines 136–168 uses DB-backed rate limiting but falls open on DB error.
- **Risk:** Brute-force / DoS across multiple serverless instances or if the wrong backend is used.
- **Recommendation:** Implement Redis-backed rate limiting and a global Next.js middleware layer.
- **Estimated effort:** 2–3 days

### PH-HIGH-04 — API input validation is inconsistent
- **Priority:** High
- **Description:** Many route handlers cast `request.json()` with `as` and validate only one or two fields manually. Some use Zod, but no project-wide standard. Examples:
  - `apps/web/src/app/api/modules/clinical-content/assemble/route.ts` line 41
  - `apps/web/src/app/api/modules/informed-consents/content-mapping/audit/route.ts` lines 27–33
  - `apps/web/src/app/api/modules/clinical-knowledge/assembly/route.ts` line 61
  - `apps/web/src/app/api/auth/password/login/route.ts` line 402
- **Risk:** Malformed payloads, type confusion, missing field validation.
- **Recommendation:** Standardize Zod schemas for every route; reject unknown fields.
- **Estimated effort:** 2–3 days

### PH-HIGH-05 — Tenant-admin inactive bypass flag
- **Priority:** High
- **Description:** `apps/web/src/lib/server/auth.ts` lines 224–232 include `TEMP_TENANT_ADMIN_INACTIVE_BYPASS`, which allows inactive-tenant admins to authenticate.
- **Risk:** Backdoor for disabled tenants if the env var is left enabled.
- **Recommendation:** Remove the bypass before production; treat tenant inactivity as absolute.
- **Estimated effort:** 15 minutes

### PH-HIGH-06 — Root Python backend uses default JWT secret and no issuer check
- **Priority:** High
- **Description:** `backend/core/security.py` line 12: `JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me")`; `create_access_token` does not set or verify issuer.
- **Risk:** If the root backend is deployed, tokens can be forged/validated with the default secret.
- **Recommendation:** Delete root `backend/` or make it fail on missing `JWT_SECRET_KEY` and add issuer validation.
- **Estimated effort:** 0.5 day

### PH-MED-01 — Audit logging not persisted to database for environment events
- **Priority:** Medium
- **Description:** `apps/web/src/lib/environment/audit-logging.ts` line 58 contains a TODO and logs environment events only to `console.log` in development.
- **Risk:** Test/demo data mixing is not audited in production.
- **Recommendation:** Implement persistent audit logging before RC1.
- **Estimated effort:** 1–2 days

### PH-MED-02 — Public signing payloads lack size limits
- **Priority:** Medium
- **Description:** `apps/api/backend/api/routers/secure_links.py` line 102 and `backend/api/routers/secure_links.py` line 102 accept `signature_data: Optional[str]` with no maximum length.
- **Risk:** Large payload DoS / storage abuse.
- **Recommendation:** Enforce a maximum length and validate base64 format.
- **Estimated effort:** 0.25 day

### PH-MED-03 — Python dependencies are unpinned
- **Priority:** Medium
- **Description:** `apps/api/requirements.txt` lists packages without versions.
- **Risk:** Supply-chain drift and unexpected breaking changes.
- **Recommendation:** Pin versions and add a `requirements.lock` file.
- **Estimated effort:** 0.5 day

### PH-LOW-01 — `.env.example` exposes real Microsoft tenant/client IDs
- **Priority:** Low
- **Description:** `.env.example` lines 80–81 contain real GUIDs.
- **Risk:** Exposes Entra tenant and application registration metadata.
- **Recommendation:** Replace with placeholder values.
- **Estimated effort:** 15 minutes

### PH-LOW-02 — Local env files exist in working tree
- **Priority:** Low
- **Description:** `.env`, `.env.local`, `apps/web/.env`, and `apps/web/.env.local` are present.
- **Risk:** Accidental commit or leak during artifact upload.
- **Recommendation:** Verify they are never staged and rotate any exposed values.
- **Estimated effort:** 1 hour

---

## Hardening Checklist

| # | Control | Status | Evidence / Finding |
|---|---------|--------|-------------------|
| 1 | No default secrets in production code | ❌ FAIL | PH-CRIT-01 |
| 2 | Single source of truth for Python API | ❌ FAIL | PH-CRIT-02 |
| 3 | Dependency CVEs patched | ❌ FAIL | PH-CRIT-03 |
| 4 | Strict Content Security Policy | ❌ FAIL | PH-HIGH-01 |
| 5 | Restrictive CORS with credentials | ❌ FAIL | PH-HIGH-02 |
| 6 | Distributed rate limiting | ❌ FAIL | PH-HIGH-03 |
| 7 | Standardized API input validation (Zod) | ❌ FAIL | PH-HIGH-04 |
| 8 | No tenant/auth bypass flags | ❌ FAIL | PH-HIGH-05 |
| 9 | JWT issuer validation and strong secrets | ❌ FAIL | PH-HIGH-06 |
| 10 | Persistent environment audit logging | ❌ FAIL | PH-MED-01 |
| 11 | Payload size limits on public endpoints | ❌ FAIL | PH-MED-02 |
| 12 | Pinned Python dependencies | ❌ FAIL | PH-MED-03 |
| 13 | HSTS / Permissions-Policy / COOP / CORP | ❌ FAIL | PH-HIGH-01 |
| 14 | No secrets in `.env.example` | ❌ FAIL | PH-LOW-01 |
| 15 | No local env files in working tree | ❌ FAIL | PH-LOW-02 |

---

## Gate 1 Exit Criteria for Production Hardening

1. Remove all default/hardcoded secrets and require them at startup.
2. Delete the root `backend/` directory and unify on `apps/api/backend/`.
3. Patch all high/moderate dependency CVEs.
4. Harden CSP and add HSTS, Permissions-Policy, COOP, CORP.
5. Restrict Python CORS to exact origins and avoid wildcard with credentials.
6. Implement Redis-backed distributed rate limiting.
7. Standardize Zod validation for every API route.
8. Remove the tenant-admin inactive bypass.
9. Implement persistent environment audit logging.

Production hardening does not currently satisfy RC1 Gate 1.
