# 02 — Production Checklist

**Scope:** WathiqCare Production Go-Live readiness for Internal IMC Pilot  
**Date:** 2026-06-29  
**Status:** P0 blockers remediated in source; remaining P0 items require deployment verification / Security ops (secret rotation, history rewrite). See `01-production-blockers.md`.

---

## Legend

- ✅ — Complete / Passing
- ❌ — Incomplete / Failing / Blocked
- ⚠️ — Conditional / Needs verification
- ⏭️ — Not required for Internal IMC Pilot (post-pilot)

---

## 1. Authentication & Authorization

| # | Item | Status | Evidence / Notes |
|---|------|--------|------------------|
| 1.1 | Password login works and enforces active user, active tenant, active membership | ⚠️ | Code present; local DB latency prevents verification |
| 1.2 | Logout revokes server-side session (`session_revoked_at`) | ❌ | Only clears cookie; P1-001 |
| 1.3 | Session cookie uses `__Host-` prefix, `SameSite=Strict`, `Secure` in production | ❌ | Defaults to `Lax`; P1-004 |
| 1.4 | Legacy `token` cookie / `localStorage` fallback removed | ❌ | Still accepted; P1-003 |
| 1.5 | Page-level auth enforces password-reset and session-revocation states | ❌ | Missing checks; P1-005 |
| 1.6 | Step-up authentication is cryptographically enforced (no header bypass) | ✅ | Header bypass removed; `security-policy-service.ts` now validates signed step-up cookie; P0-001 |
| 1.7 | Step-up challenge/verify backend routes implemented | ⚠️ | Bypass removed; challenge/verify routes still need to be implemented for full MFA flow |
| 1.8 | MFA required for privileged roles | ⏭️ | Post-pilot |
| 1.9 | `TEMP_TENANT_ADMIN_INACTIVE_BYPASS` removed or disabled in production | ❌ | Still present; P1-002 |
| 1.10 | RBAC permission fallback for tenant admins removed | ⚠️ | `TENANT_ADMIN_FALLBACK_PERMISSIONS` still present |
| 1.11 | Platform admin `/platform` route exists and is functional | ❌ | Route missing; P1-014 |

## 2. Audit & Evidence

| # | Item | Status | Evidence / Notes |
|---|------|--------|------------------|
| 2.1 | Every consent dispatch, OTP, signature, refusal, and PDF finalization writes an audit event | ✅ | Code present across public signing and secure-link services |
| 2.2 | Audit events include evidence hashes | ✅ | `evidenceHash` field present in timeline and signature records |
| 2.3 | Audit failures are not silently swallowed | ⚠️ | Some paths log only; `docs/rc2-operational-readiness/09-go-live-readiness.md` notes this |
| 2.4 | Audit log retention policy configured and operational | ⚠️ | Referenced in governance docs; verify DB retention jobs |
| 2.5 | Consent PDF hash is deterministic and reproducible | ✅ | `computeFinalConsentPdfByteHash()` exists |
| 2.6 | Evidence export available for legal review | ⚠️ | `AuditEvidenceExport` component exists in prototype; verify production path |

## 3. OTP / SMS / Email

| # | Item | Status | Evidence / Notes |
|---|------|--------|------------------|
| 3.1 | OTP codes are generated with cryptographic RNG | ⚠️ | Next.js uses `crypto.randomInt`; Python provider uses `random.randint` (P1 issue) |
| 3.2 | OTP hashes use a strong, unique pepper and per-challenge salt | ✅ | Hardcoded fallback removed; startup fails if `PUBLIC_SIGNING_OTP_PEPPER` is missing; P0-004 |
| 3.3 | OTP request/verify endpoints are rate-limited | ❌ | Public signing OTP not rate-limited; P1-006 |
| 3.4 | Taqnyat SMS has timeouts, retries, and is enabled by default in production | ❌ | No timeout/retry; requires explicit flag; P1-008 |
| 3.5 | Email provider supports Microsoft Graph for IMC sender domain | ❌ | SMTP/Resend only; P1-007 |
| 3.6 | Pilot email override is fail-closed in production | ❌ | Can redirect patient emails to admin inbox; P1-009 |
| 3.7 | OTP expiry and attempt limits enforced server-side | ⚠️ | Next.js enforces expiry; Python provider lacks expiry/attempt controls |
| 3.8 | SMS delivery success rate ≥ 98% verified in target environment | ❌ | Not verified; depends on resolving P1-008 |

## 4. Digital Signature & PDF

| # | Item | Status | Evidence / Notes |
|---|------|--------|------------------|
| 4.1 | Signing tokens stored as hashes, not plaintext | ✅ | `signing_secure_tokens.token_hash` added; new tokens stored as SHA-256 hashes; existing tokens revoked; P0-003 |
| 4.2 | Public signing session lifecycle is correct (request OTP → verify → sign → finalize) | ✅ | Implemented in `public-signing-service.ts` |
| 4.3 | Patient can download final signed PDF after signing | ✅ | `/api/public/informed-consents/signing/[token]/final-pdf` route implemented; P0-005 |
| 4.4 | PDF renderer health endpoint returns healthy | ⚠️ | `/health` exists on renderer; verify in production |
| 4.5 | PDF finalization produces legally defensible patient copy | ⚠️ | Payload builder exists; route gap blocks patient access |
| 4.6 | Signature provider registered for external signing orchestrator | ❌ | No provider registered; P1-011 |
| 4.7 | Secure signing link feature flags enforced | ❌ | Flags exist but not asserted; P1-010 |
| 4.8 | Link expiry is consistent across all code paths | ❌ | 10 min / 30 min / 48 h / 72 h variants; P1-012, P1-013 |

## 5. Backend API / Discharge / Secure Links

| # | Item | Status | Evidence / Notes |
|---|------|--------|------------------|
| 5.1 | Backend API authentication matches Next.js security posture | ⚠️ | CORS tightened and SMS-test disabled by default; full parity (aud-scoped JWT, shared rate limiting, tenant/domain checks, session revocation, MFA, password policy) still required; P0-008 |
| 5.2 | Secure-link decision requires identity verification (OTP) | ✅ | OTP request/verify endpoints added; decision submission requires valid OTP; P0-002 |
| 5.3 | Secure-link creation fails if delivery channel unavailable | ⚠️ | Returns manual-share status; P2 behavior |
| 5.4 | Backend CORS restricted to known origins | ✅ | Fixed origin list, restricted methods/headers; P0-008 |
| 5.5 | System-inspect and SMS-test endpoints require authentication | ✅ | Already require platform-admin roles; SMS-test disabled by default in production; P0-008 |

## 6. Performance, Error Handling, Logging

| # | Item | Status | Evidence / Notes |
|---|------|--------|------------------|
| 6.1 | Health endpoints (`/api/health`, `/health`, `/ready`, renderer `/health`) return healthy | ⚠️ | `/api/health` returns 200; verify `/ready` and renderer health |
| 6.2 | Runtime observability logs structured events | ✅ | `runtime-observability.ts` present |
| 6.3 | All critical errors are logged with correlation IDs | ⚠️ | Pattern exists; verify coverage in auth and signing paths |
| 6.4 | Database query latency ≤ 200 ms in production | ❌ | Local probe shows 2,641 ms; P1-018 |
| 6.5 | Load/concurrency tests executed | ❌ | Not performed |
| 6.6 | PDF rendering optimized for concurrency | ⏭️ | Post-pilot |
| 6.7 | Background jobs worker running or disabled with manual SOP | ⚠️ | Worker exists in `apps/worker/`; verify deployment and queues |

## 7. Feature Flags, Environment Variables, Secrets

| # | Item | Status | Evidence / Notes |
|---|------|--------|------------------|
| 7.1 | Required env vars validated at startup | ✅ | `assertRuntimeEnv()` validates 6 required vars |
| 7.2 | Placeholder/weak secrets rejected at startup | ✅ | `FORBIDDEN_SECRET_VALUES` list present |
| 7.3 | `PUBLIC_LINK_TOKEN_PEPPER` and `WATHIQ_STEP_UP_SECRET` configured | ✅ | Required by runtime validation |
| 7.4 | `PUBLIC_SIGNING_OTP_PEPPER` has no fallback | ✅ | Hardcoded fallback removed; P0-004 |
| 7.5 | `TEMP_TENANT_ADMIN_INACTIVE_BYPASS` unset in production | ⚠️ | Must be verified at deployment; P1-002 |
| 7.6 | `PILOT_EMAIL_NOTIFICATION_OVERRIDE_ENABLED=false` in production | ⚠️ | Must be verified at deployment; P1-009 |
| 7.7 | No secrets in git history or tracked files | ⚠️ | Hardcoded credentials removed from tracked scripts/tests/docs; pre-commit hook added; credential rotation and git history rewrite still required; P0-006, P0-007 |
| 7.8 | Feature flags have production defaults documented | ⚠️ | Defaults exist; enforcement gaps noted in P1-010 |

## 8. Database Migrations, Backup, Monitoring

| # | Item | Status | Evidence / Notes |
|---|------|--------|------------------|
| 8.1 | All migrations are forward-applied and reversible | ⚠️ | Migrations under `prisma/migrations/`; verify in target DB |
| 8.2 | Schema matches production deployment | ⚠️ | Generate Prisma client and run schema diff |
| 8.3 | Backup/restore procedure tested | ⚠️ | Referenced in governance; verify last drill |
| 8.4 | Database connection pooling configured | ⚠️ | `DATABASE_URL_POOLED` present; tune for observed latency |
| 8.5 | Monitoring alerts configured for DB latency, errors, disk | ⏭️ | Post-pilot / DevOps |
| 8.6 | Migration rollback procedure documented and tested | ⚠️ | Referenced in `docs/governance/rollback-readiness-43dff9d.md` |

## 9. Deployment & Rollback

| # | Item | Status | Evidence / Notes |
|---|------|--------|------------------|
| 9.1 | Build succeeds with `npx next build --webpack` | ✅ | Passed 2026-06-28 |
| 9.2 | Production release gate script passes | ❌ | Expects non-existent role dashboards; P1-015 |
| 9.3 | Enterprise hardening validation stage runs real checks | ❌ | Placeholder `echo` steps; P1-016 |
| 9.4 | Rollback target pinned and smoke-tested | ⚠️ | Referenced; verify before deployment |
| 9.5 | Deployment runbook exists and is current | ✅ | Multiple governance docs present |
| 9.6 | `.env` files excluded from build artifacts | ⚠️ | Verify build output does not contain secrets |

## 10. Routes, Links, Dead Code, Prototype Leakage

| # | Item | Status | Evidence / Notes |
|---|------|--------|------------------|
| 10.1 | Production physician workspace has no prototype imports | ✅ | VE-03B completed; verified with grep |
| 10.2 | Prototype route `/prototype/clinical-workspace-2` is not reachable in production | ✅ | Returns `null` when `NODE_ENV=production` |
| 10.3 | All production module routes resolve without 404 | ⚠️ | `/platform` missing; role dashboards missing |
| 10.4 | Dead code and unused components identified and removed | ⚠️ | `frontend/` legacy path still exists; legacy cookie fallbacks exist |
| 10.5 | Patient-facing remote signing route is implemented | ✅ | `/sign/[token]` implemented |
| 10.6 | Secure-link patient-facing routes implemented | ✅ | `/secure/[token]` exists; OTP identity verification added; P0-002 |

## 11. Security Headers & Web Security

| # | Item | Status | Evidence / Notes |
|---|------|--------|------------------|
| 11.1 | Security headers configured (CSP, HSTS, X-Frame-Options, etc.) | ⚠️ | Verify Next.js headers config |
| 11.2 | CORS restricted to known origins | ⚠️ | Backend CORS tightened to `allow_origins` list; SMS-test router disabled by default; full auth/tenant parity remains; P0-008 |
| 11.3 | Rate limiting shared across instances | ❌ | In-memory `Map`; P2 |
| 11.4 | CSRF protection on state-changing endpoints | ⚠️ | SameSite cookie policy needed; P1-004 |

## 12. Accessibility, Mobile, RTL, Browser

| # | Item | Status | Evidence / Notes |
|---|------|--------|------------------|
| 12.1 | Physician workspace renders in Arabic RTL | ⚠️ | Existing screenshots show RTL support; fresh verification blocked |
| 12.2 | Physician workspace renders on mobile viewport | ⚠️ | Test exists; execution blocked |
| 12.3 | Critical modals are WCAG-compliant (focus trap, roles, Escape) | ❌ | `SendConfirmationModal` uses non-accessible Dialog; P0-009 |
| 12.4 | Radio groups expose correct ARIA semantics | ❌ | `RadioGroupItem` lacks `role="radio"` and `aria-checked`; P1 in swarm |
| 12.5 | Workspace provides language switcher and navigation affordance | ❌ | No language switcher or back button in production workspace; P1 in swarm |
| 12.6 | Third-party WCAG audit completed | ⏭️ | Post-pilot |
| 12.7 | Cross-browser compatibility verified | ⚠️ | Playwright/Chromium; verify Safari/Firefox separately |

## 13. Build, TypeScript, Lint, Tests

| # | Item | Status | Evidence / Notes |
|---|------|--------|------------------|
| 13.1 | `npx next build --webpack` passes | ✅ | Passed 2026-06-28 |
| 13.2 | `npx tsc --noEmit` passes project-wide | ❌ | 30 pre-existing errors; P1-017 |
| 13.3 | TypeScript clean for production-workspace path | ✅ | No errors in `components/informed-consents/production-workspace/` |
| 13.4 | Lint passes | ⚠️ | Not executed in this audit |
| 13.5 | Unit tests pass | ⚠️ | Not executed in this audit |
| 13.6 | Playwright production-workspace tests pass | ❌ | Blocked by DB auth timeout; P1-018 |
| 13.7 | Fresh production-workspace screenshots captured | ❌ | Blocked by DB auth timeout; existing screenshots remain valid |
| 13.8 | Smoke harness `__smoke_stabilization.cjs` passes 11/11 | ⚠️ | Not executed in this audit |

---

## Summary Counts

| Category | ✅ | ❌ | ⚠️ | ⏭️ |
|----------|----|----|----|----|
| Authentication & Authorization | 0 | 7 | 3 | 1 |
| Audit & Evidence | 2 | 0 | 2 | 0 |
| OTP / SMS / Email | 0 | 5 | 2 | 0 |
| Signature & PDF | 1 | 5 | 2 | 0 |
| Backend API / Secure Links | 0 | 4 | 1 | 0 |
| Performance / Errors / Logging | 1 | 2 | 3 | 1 |
| Feature Flags / Env / Secrets | 2 | 3 | 3 | 0 |
| Database / Backup / Monitoring | 0 | 0 | 6 | 0 |
| Deployment / Rollback | 1 | 3 | 2 | 0 |
| Routes / Dead Code / Prototype | 2 | 2 | 2 | 0 |
| Security Headers | 0 | 2 | 2 | 0 |
| Accessibility / Mobile / RTL | 0 | 3 | 3 | 1 |
| Build / TypeScript / Tests | 3 | 4 | 2 | 0 |
| **Total** | **12** | **44** | **35** | **4** |
