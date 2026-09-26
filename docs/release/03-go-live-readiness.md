# 03 — Go-Live Readiness

**Scope:** WathiqCare Production Go-Live for Internal IMC Pilot  
**Date:** 2026-06-28  
**Auditor:** Enterprise Release Manager / Production Readiness Lead

---

## 1. Executive Summary

WathiqCare is **not ready for full production go-live** inside IMC. The platform has made significant progress on the physician consent workspace (VE-03B), the patient signing journey, and the Clinical Knowledge Engine integration, but multiple **P0 production blockers** remain in authentication, token handling, secrets hygiene, and backend API security.

A **controlled Internal IMC Pilot** may be considered only if all P0 blockers are either resolved or explicitly excluded from pilot scope with written legal/clinical sign-off, and all P1 items are either resolved or covered by a documented workaround with active monitoring.

---

## 2. Readiness Matrix

| Area | Status | Score | Key Condition |
|------|--------|-------|---------------|
| Core physician consent workflow | Conditional | 80% | VE-03B wiring complete; UI components promoted from prototype; patient PDF download route missing |
| Patient signing journey | Conditional | 70% | `/sign/[token]` implemented; OTP pepper fallback and rate-limit gaps remain |
| Authentication & session management | Not Ready | 35% | Step-up bypass, logout revocation, cookie hardening, legacy fallbacks |
| Authorization & RBAC | Conditional | 60% | Role model present; tenant bypass flag, fallback permissions, missing role dashboards |
| Audit & evidence | Conditional | 75% | Audit chain implemented; silent failures and export path need verification |
| OTP / SMS / Email | Not Ready | 45% | Taqnyat lacks timeouts/retries; Graph email unsupported; pilot override unsafe |
| PDF & digital signature | Conditional | 65% | Signing works; token storage plaintext, final-pdf route missing, provider unregistered |
| Backend API / secure links | Not Ready | 30% | Weak auth, CORS, unauthenticated endpoints, no identity verification on decisions |
| Performance & error handling | Conditional | 55% | Local DB latency 2.6 s blocks verification; no load tests |
| Feature flags & configuration | Conditional | 60% | Validation exists; enforcement gaps and unsafe defaults remain |
| Secrets & environment | Not Ready | 25% | Secrets in git history, hardcoded credentials in tracked files |
| Database & migrations | Conditional | 65% | Migrations present; latency/pool tuning and backup verification needed |
| Deployment & rollback | Conditional | 50% | Build passes; release gate and hardening stage are fake |
| Security headers & web hardening | Not Ready | 40% | Cookie policy, CORS, rate limiting gaps |
| Accessibility & mobile | Not Ready | 35% | Critical modal non-accessible; workspace lacks language switcher/navigation |
| Build / TypeScript / tests | Conditional | 55% | Build passes; 30 TypeScript errors; Playwright/screenshots blocked |

### Weighted Readiness Score

| Dimension | Weight | Score | Weighted |
|-----------|--------|-------|----------|
| Security & authentication | 25% | 35% | 8.75 |
| Consent workflow correctness | 20% | 75% | 15.00 |
| OTP/SMS/email delivery | 15% | 45% | 6.75 |
| PDF & signature integrity | 15% | 65% | 9.75 |
| Deployment & operational readiness | 15% | 50% | 7.50 |
| Accessibility & usability | 10% | 35% | 3.50 |
| **Total** | **100%** | — | **51.25%** |

**Readiness threshold for GO:** ≥ 90% with zero P0 and ≤ 2 P1 open.  
**Current:** 51.25% with 9 P0 and 18 P1 open.

---

## 3. Conditions for Controlled Internal IMC Pilot

### Must-have before first patient

1. Resolve or formally exclude from pilot scope:
   - P0-001 Step-up authentication bypass via headers.
   - P0-002 Secure-link decisions without identity verification.
   - P0-003 Raw signing tokens persisted in database.
   - P0-004 Hardcoded OTP pepper fallback.
   - P0-005 Missing public final-pdf route.
2. Rotate all credentials that appeared in git history and remove hardcoded credentials from tracked files.
3. Confirm `TEMP_TENANT_ADMIN_INACTIVE_BYPASS` is unset and `PILOT_EMAIL_NOTIFICATION_OVERRIDE_ENABLED=false` in production.
4. Configure and test Taqnyat SMS and email delivery in the target environment.
5. Verify `/api/health`, `/health`, `/ready`, and renderer `/health` all return healthy.
6. Confirm audit-chain integrity check on a sample of dispatched consents.
7. Pin and smoke-test rollback target.
8. Remediate P0-009 Custom Dialog WCAG failure or replace the SendConfirmationModal component before exposing to assistive-technology users.

### Should-have before cohort expansion

1. Implement session revocation on logout (P1-001).
2. Harden session cookies (P1-003, P1-004).
3. Add rate limiting to public signing OTP endpoints (P1-006).
4. Implement Microsoft Graph email adapter or confirm SMTP sender is IMC-approved (P1-007).
5. Add Taqnyat timeouts/retries/circuit-breaker (P1-008).
6. Align secure-link expiry across stacks (P1-012, P1-013).
7. Register a signature provider or remove unused external-orchestration path (P1-011).
8. Fix or update production release gate and role dashboards (P1-014, P1-015).
9. Replace fake enterprise hardening validation with real checks (P1-016).
10. Resolve project-wide TypeScript errors (P1-017).

### Required before general availability

1. Implement MFA for privileged roles.
2. Complete third-party WCAG audit.
3. Implement interpreter/witness workflows or obtain legal exclusion sign-off.
4. Add consent withdrawal workflow or manual SOP.
5. Optimize PDF rendering for concurrency (browser pool / render queue).
6. Complete load testing and establish latency baselines.
7. Implement Redis-backed shared rate limiting.
8. Harden backend API or retire it from production.

---

## 4. Evidence Summary

| Check | Result | Evidence |
|-------|--------|----------|
| Build (`npx next build --webpack`) | ✅ Pass | Build completed 2026-06-28; `/modules/informed-consents` present in route manifest |
| TypeScript production-workspace path | ✅ Pass | Zero errors in `components/informed-consents/production-workspace/` |
| TypeScript project-wide | ❌ Fail | 30 errors across promissory-note, prisma, runtime observability, StepUp panel, and tests |
| Playwright production-workspace tests | ❌ Blocked | Login endpoint times out after 120 s due to DB latency |
| Fresh screenshots | ❌ Blocked | Same DB/auth timeout; existing screenshots in `pilot-evidence/ve-03b-production-workspace-screenshots/` remain valid |
| Prototype leakage into production path | ✅ Clear | No imports from `@/app/prototype/clinical-workspace-2` in production workspace |
| Backend API security posture | ❌ Fail | In-memory counters, no tenant checks, unauthenticated system-inspect/sms-test endpoints |
| Secrets hygiene | ❌ Fail | `.env` in git history; hardcoded passwords in tracked scripts/tests |
