# 01 — Production Blockers

**Scope:** WathiqCare Production Go-Live readiness audit for Internal IMC Pilot  
**Date:** 2026-06-28  
**Status:** Active — blocking production activation until resolved or explicitly accepted

---

## How to read this document

- **P0 — Production Blocker:** Unsafe to expose to patients, staff, or IMC systems. Must be resolved or formally excluded from pilot scope with legal/clinical sign-off.
- **P1 — Must Fix Before Go-Live:** High risk to safety, compliance, or operational continuity. Should be resolved before any live patient encounter.
- **P2 — Can Wait Until After Pilot:** Acceptable for a controlled internal pilot with documented workarounds and monitoring.
- **P3 — Future Enhancement:** Not blocking pilot or go-live.

---

## P0 — Production Blockers

### P0-001 — Step-up authentication bypass via HTTP headers
- **Problem:** `getStepUpStatusFromRequest()` treats `x-wathiq-step-up: verified` or `x-mfa-verified: true` request headers as proof of step-up. No challenge/verify API routes exist; the UI panel has no legitimate backend to complete verification.
- **Impact:** Any authenticated user (or attacker with a stolen session cookie) can bypass MFA/step-up for privileged actions such as legal export and admin functions.
- **Root Cause:** A debug/test bypass was left in production code and the step-up challenge/verify backend was never implemented.
- **Recommended Fix:** Remove header bypass; implement server-side challenge issuance and OTP/TOTP verification endpoints; bind step-up state to a signed `HttpOnly` cookie.
- **Estimated Effort:** Large
- **Owner:** Security / Engineering
- **Evidence:** `apps/web/src/lib/server/security-policy-service.ts:239-245`; `apps/web/src/components/security/StepUpVerificationPanel.tsx`

### P0-002 — Secure discharge-link decisions require identity verification
- **Problem:** The patient-facing discharge secure-link flow (`/secure/{token}` / `/api/discharge/secure/{token}/decision`) previously accepted a legally binding accept/refuse decision based only on URL possession. No OTP, Nafath, or identity challenge was enforced.
- **Impact:** A leaked or forwarded link could have allowed an unauthorized party to accept/refuse discharge on behalf of a patient, creating medical-legal liability and invalidating the audit chain.
- **Root Cause:** The service-layer decision functions validated the token but did not wire in a verification gate.
- **Fix Applied:** Added OTP generation, delivery, and verification to the Python secure-link service; decision submission now requires a valid OTP and clears it after use to prevent replay. Added `/api/discharge/secure/{token}/otp` and `/api/discharge/secure/{token}/verify-otp` endpoints. Updated the patient-facing `/secure/[token]` page to request and verify the OTP before enabling decision submission. Applied the same OTP-gating to the Next.js `secure-links.ts` service implementation.
- **Remaining Work:** Add backend rate limiting to the Python OTP endpoints; consider Nafath integration for higher-assurance identity verification.
- **Estimated Effort:** Medium
- **Owner:** Engineering / Security / Legal
- **Evidence:** `apps/api/backend/services/secure_link_service.py`; `apps/api/backend/api/routers/secure_links.py`; `frontend/app/secure/[token]/page.tsx`; `apps/web/src/lib/server/secure-links.ts`

### P0-003 — Raw signing tokens hashed at rest
- **Problem:** `signing_secure_tokens.token` previously stored the raw token value and `validateSigningToken()` queried `WHERE t.token = $1`. A database compromise gave direct access to every live patient signing link.
- **Impact:** Unauthorized signing/finalization of consent documents, PHI exposure, and legally invalid signatures.
- **Root Cause:** Tokens were inserted and looked up by plaintext instead of by hash.
- **Fix Applied:** Added `token_hash` column to `signing_secure_tokens`; `createSigningSession()` now stores only the SHA-256 hash and sets `token = NULL`; `validateSigningToken()` and `markTokenUsed()` query by `token_hash`. Migration `0030_signing_token_hash.sql` adds the column, indexes it, and revokes all pre-existing tokens (they cannot be backfilled without raw values).
- **Remaining Work:** Reissue any pending signing sessions that were active before migration; consider adding a pepper to the hash and using HMAC.
- **Estimated Effort:** Medium
- **Owner:** Engineering / Security
- **Evidence:** `apps/web/prisma/migrations/0030_signing_token_hash.sql`; `apps/web/src/lib/server/signature-orchestration-service.ts`

### P0-004 — Public signing OTP uses a hardcoded pepper fallback
- **Problem:** `otpHash()` in `public-signing-service.ts` falls back to `"wathiqcare-signing-otp-pepper"` when `PUBLIC_SIGNING_OTP_PEPPER` is unset.
- **Impact:** If the env var is missed in production, OTP hashes become predictable/verifiable by anyone with source access, enabling OTP forgery.
- **Root Cause:** Defensive default was provided instead of failing closed.
- **Recommended Fix:** Remove the fallback; fail startup if `PUBLIC_SIGNING_OTP_PEPPER` is missing or too short.
- **Estimated Effort:** Small
- **Owner:** Engineering / Security
- **Evidence:** `apps/web/src/lib/server/public-signing-service.ts:476-478`

### P0-005 — Public final-pdf download route implemented
- **Problem:** `getPublicFinalPdfUrls()` returned `viewUrl`, `downloadUrl`, and `retryUrl` pointing to `/api/public/informed-consents/signing/{token}/final-pdf`, but no handler existed under `apps/web/src/app/api/public/` or `apps/web/src/app/api/modules/informed-consents/`.
- **Impact:** Patients clicking "Download patient copy" after signing received a 404; post-signature patient copy delivery was broken.
- **Root Cause:** The final-pdf endpoint was never implemented.
- **Fix Applied:** Created `apps/web/src/app/api/public/informed-consents/signing/[token]/final-pdf/route.ts` that validates the public signing token via `getSigningTokenContext()`, then renders and returns the finalized consent PDF using `renderFinalConsentPdfResponse()`. Supports `disposition`, `copy`, and `lang` query parameters.
- **Estimated Effort:** Medium
- **Owner:** Engineering
- **Evidence:** `apps/web/src/app/api/public/informed-consents/signing/[token]/final-pdf/route.ts`; `apps/web/src/lib/server/public-signing-service.ts:360-367`

### P0-006 — Secrets committed in git history
- **Problem:** Git history contains commits that created/modified `.env` files, including a commit titled "Add DATABASE_URL to .env file".
- **Impact:** Database passwords and other secrets are permanently recoverable from repository history even if current files are gitignored.
- **Root Cause:** `.env` files were committed before `.gitignore` rules were enforced; no history rewrite was performed.
- **Fix Applied:** Added `.githooks/pre-commit` that blocks `.env` files and common secret patterns (DATABASE_URL with credentials, JWT_SECRET_KEY, private keys, AWS keys, GitHub tokens). To enable: `git config core.hooksPath .githooks`. Confirmed current working-tree `.env` files are already untracked/ignored.
- **Remaining Work:** Rotate all credentials that ever appeared in `.env` files (database passwords, JWT secrets, API keys, SMTP credentials); rewrite git history with BFG/repo-cleaner or force-push a sanitized history. This must be performed by Security / DevOps with team coordination because it is a destructive, force-push operation on a shared repository.
- **Estimated Effort:** Large
- **Owner:** Security / DevOps
- **Evidence:** `.githooks/pre-commit`; `git log --all --full-history --diff-filter=A --name-only -- '*.env'` shows commit `900d349d` adding `.env`

### P0-007 — Hardcoded credentials in tracked scripts and tests
- **Problem:** Tracked files contained plaintext passwords in ad-hoc PowerShell scripts (`test_login.ps1`, `__witness_matrix_preview.ps1`, `run_task.ps1`, `task.ps1`) and Playwright specs (`[REDACTED]`).
- **Impact:** Production/admin credentials were exposed to anyone with repo access; credentials may have been valid in production or pilot environments.
- **Root Cause:** Test/admin helper scripts were committed without externalizing secrets.
- **Fix Applied:** Removed the credential-bearing PowerShell scripts from the working tree; updated Playwright specs to read `TEST_PHYSICIAN_PASSWORD` from environment variables with no fallback; redacted remaining password strings in historical docs/artifacts; added `__*.ps1`, `task.ps1`, `run_task.ps1`, and `test_login.ps1` to `.gitignore`.
- **Remaining Work:** Rotate any production/pilot passwords that matched the redacted values; verify no similar secrets are reintroduced.
- **Estimated Effort:** Medium
- **Owner:** Security / Engineering
- **Evidence:** `.gitignore`; `apps/web/tests/production-informed-consents-*.spec.ts`; deleted scripts no longer in tree

### P0-008 — Backend FastAPI path hardened (full parity pending)
- **Problem:** The Python backend used in-memory failed-login counters, accepted the same JWT as the Next.js app without audience/issuer scoping, lacked tenant-active/domain/subscription checks, session revocation, audit logging, MFA, and password policy, exposed SMS-test endpoints, and CORS allowed all methods/headers.
- **Impact:** If the backend is reachable, it provided a weaker parallel authentication/authorization path and could leak system configuration or be abused for SMS spend.
- **Root Cause:** Backend was built as a workflow service with minimal security controls and is not aligned with the Next.js auth stack.
- **Fix Applied:** Tightened CORS to a fixed origin list and restricted allowed methods/headers. Disabled SMS test endpoints by default; they now require `WATHIQCARE_BACKEND_SMS_TEST_ENABLED=true`. Confirmed `/api/system/inspect` and `/api/sms/*` already require platform-admin roles.
- **Remaining Work:** Bring the backend auth path to parity with Next.js: add `aud` claim and validation (requires coordinated token reissue), shared rate limiting, full tenant/domain/subscription checks, session revocation, audit logging, MFA, and password policy. Alternatively, retire the backend from public ingress and use it only as an internal service.
- **Estimated Effort:** Large
- **Owner:** Engineering / Security / DevOps
- **Evidence:** `apps/api/backend/main.py`; `apps/api/backend/api/routers/system_inspect.py`; `apps/api/backend/api/routers/sms_test.py`; `apps/api/backend/core/security.py`; `apps/api/backend/api/deps.py`

### P0-009 — Custom Dialog component lacks WCAG modal behavior
- **Problem:** `components/design-system/dialog.tsx` implements a modal manually without `role="dialog"`, `aria-modal`, focus trap, Escape-key handler, or focus return. The production workspace's `SendConfirmationModal` uses this component for the safety-critical "send consent" confirmation.
- **Impact:** Keyboard and screen-reader users can tab behind the modal, cannot close it with Escape, and lose focus context after it closes. This blocks assistive-technology users from safely dispatching consents.
- **Root Cause:** A custom Dialog was built even though a Radix-based Dialog exists elsewhere in the repo.
- **Recommended Fix:** Replace the design-system Dialog with the Radix-based implementation, or add focus trap, `role="dialog"`, `aria-modal`, Escape handling, and return focus.
- **Estimated Effort:** Medium
- **Owner:** Engineering
- **Evidence:** `apps/web/src/components/design-system/dialog.tsx`; `apps/web/src/components/informed-consents/production-workspace/components/SendConfirmationModal.tsx`

---

## P1 — Must Fix Before Go-Live

### P1-001 — Logout does not revoke the server-side session
- **Problem:** `POST /api/auth/logout` only clears the browser cookie; it does not update `users.session_revoked_at`. `requireAuth` already checks `sessionRevokedAt`, but nothing sets it on logout.
- **Impact:** A stolen access token remains valid until JWT expiry (default 60 minutes), and logout is ineffective against token theft.
- **Root Cause:** Logout was implemented as client-side cookie removal only.
- **Recommended Fix:** On logout, set `session_revoked_at = NOW()` for the authenticated user and reject tokens issued before that timestamp.
- **Estimated Effort:** Small
- **Owner:** Engineering
- **Evidence:** `apps/web/src/app/api/auth/logout/route.ts`; `apps/web/src/lib/server/auth.ts`

### P1-002 — Tenant-admin inactive-tenant bypass flag
- **Problem:** `TEMP_TENANT_ADMIN_INACTIVE_BYPASS` can be set to `true` to let tenant admins access an inactive tenant.
- **Impact:** A single environment variable disables a critical tenant-isolation guard, allowing access to a deactivated/suspended tenant.
- **Root Cause:** Temporary operational bypass was left in production code.
- **Recommended Fix:** Remove the bypass or make it strictly read-only/alert-only; inactive tenants must always be rejected.
- **Estimated Effort:** Small
- **Owner:** Engineering / Security
- **Evidence:** `apps/web/src/lib/server/auth.ts:224-265`

### P1-003 — Legacy generic cookie name `token` is still accepted
- **Problem:** Page auth and the backend proxy fall back to a cookie named `token` if the primary session cookie is missing, and the client also stores tokens under the legacy key in `localStorage`.
- **Impact:** Increases session fixation and XSS attack surface.
- **Root Cause:** Backward-compatibility fallbacks were kept too broad.
- **Recommended Fix:** Remove the `token` fallback everywhere; use a single `__Host-` prefixed session cookie and do not store access tokens in `localStorage`.
- **Estimated Effort:** Medium
- **Owner:** Engineering / Security
- **Evidence:** `apps/web/src/lib/server/pageAuth.ts`; `apps/web/src/lib/server/backendProxy.ts`; `apps/web/src/utils/api.ts`

### P1-004 — Session cookie lacks `__Host-` prefix and uses `Lax`
- **Problem:** Cookie construction does not use `__Host-` prefix, defaults `SameSite` to `lax`, and can set domain to `.wathiqcare.online` in production.
- **Impact:** CSRF and session leakage risk, especially if preview or untrusted subdomains share the parent domain.
- **Root Cause:** Cookie options were tuned for development convenience rather than production hardening.
- **Recommended Fix:** In production use `__Host-wathiqcare_access_token`, `SameSite=Strict`, `Secure=true`, and omit `Domain` unless multi-subdomain SSO is explicitly required.
- **Estimated Effort:** Small
- **Owner:** Engineering / Security
- **Evidence:** `apps/web/src/lib/server/sessionCookie.ts`

### P1-005 — Page-level auth does not enforce password-reset or session-revocation states
- **Problem:** `requirePageAuthClaimsOrRedirect` validates JWT and user/tenant state but does not check `password_reset_required` or `session_revoked_at`. API auth does both.
- **Impact:** A user flagged for forced password reset can still browse protected pages after login because the page guard is weaker than the API guard.
- **Root Cause:** Page and API auth logic diverged.
- **Recommended Fix:** Reuse the same post-auth state checks in `pageAuth.ts` that exist in `auth.ts`.
- **Estimated Effort:** Small
- **Owner:** Engineering
- **Evidence:** `apps/web/src/lib/server/pageAuth.ts` vs. `apps/web/src/lib/server/auth.ts`

### P1-006 — Public signing OTP endpoints have no rate limiting
- **Problem:** `/api/sign/[token]/request-otp` and `/api/sign/[token]/verify-otp` do not apply rate limiting. The secure-link OTP routes only rate-limit per token, while public signing OTP can be abused.
- **Impact:** Service abuse, unexpected Taqnyat/Resend costs, and possible brute-force of the 6-digit OTP.
- **Root Cause:** Route handlers call `requestSigningOtp()` / `verifySigningOtp()` without `rateLimitOrThrow()`.
- **Recommended Fix:** Add per-token (and per-IP) rate limits to both request and verify; move to Redis-backed limiting before GA.
- **Estimated Effort:** Small
- **Owner:** Engineering / Security
- **Evidence:** `apps/web/src/app/api/sign/[token]/request-otp/route.ts`; `apps/web/src/app/api/sign/[token]/verify-otp/route.ts`

### P1-007 — Next.js email provider does not implement Microsoft Graph
- **Problem:** The Next.js email stack only supports SMTP/Resend. `.env.example` documents Microsoft Graph credentials, but the code never uses them.
- **Impact:** Inability to send from an IMC-approved sender/domain; higher likelihood of patient emails being filtered/rejected.
- **Root Cause:** `EmailDiagnostics.provider` is typed as `"microsoft-graph" | "smtp"` but only `sendViaSmtp()` is implemented.
- **Recommended Fix:** Implement a Microsoft Graph adapter and make it the default when `MICROSOFT_*` env vars are present; keep SMTP as fallback.
- **Estimated Effort:** Medium
- **Owner:** Engineering / DevOps
- **Evidence:** `apps/web/src/lib/server/email-provider.ts`; `.env.example`

### P1-008 — Taqnyat SMS client lacks timeouts, retries, and production-default configuration
- **Problem:** The Next.js Taqnyat client sends SMS only when `TAQNYAT_SMS_ENABLED` is explicitly set and has no request timeout or retry logic. The adapter falls back to stub mode if the key is missing.
- **Impact:** OTP SMS delivery can silently hang, fail on transient errors, or be disabled by default, breaking the patient signing journey.
- **Root Cause:** The Next.js client is a minimal wrapper around `fetch` with no resiliency controls.
- **Recommended Fix:** Add a configurable `fetch` timeout, exponential retry on 408/429/5xx, circuit-breaker, and a startup health check for Taqnyat.
- **Estimated Effort:** Small
- **Owner:** Engineering / DevOps
- **Evidence:** `apps/web/src/services/sms/taqnyatClient.ts`; `apps/web/src/lib/server/integrations/taqniat-sms-adapter.ts`

### P1-009 — Pilot email override can redirect all patient emails to an admin inbox
- **Problem:** If `APP_ENV` is set to `pilot`/`uat` or `PILOT_EMAIL_NOTIFICATION_OVERRIDE_ENABLED=true`, every patient-facing signing-link/OTP email is redirected to `Admin@wathiqcare.med.sa`.
- **Impact:** Patients cannot complete signing; all OTPs and links delivered to a single internal account; PDPL/confidentiality breach.
- **Root Cause:** `getPilotEmailOverrideConfig()` defaults the override on in pilot/UAT and only checks an explicit env flag.
- **Recommended Fix:** Make the override fail-closed in production; require explicit tenant-level allow-list, not a global env var.
- **Estimated Effort:** Small
- **Owner:** Engineering / Security
- **Evidence:** `apps/web/src/lib/server/pilot-email-override.ts`

### P1-010 — Secure signing link feature flags are off by default and not enforced
- **Problem:** `FF_ENABLE_EXTERNAL_SIGNATURES=false` and `FF_ENABLE_SECURE_SIGNING_LINKS=false` by default. `assertSecureLinksEnabled()` is exported but never called.
- **Impact:** Production may launch with secure signing links disabled, or the flag may be bypassed, leading to inconsistent behavior.
- **Root Cause:** Feature-flag gating was partially wired.
- **Recommended Fix:** Enforce `assertSignaturesEnabled()` / `assertSecureLinksEnabled()` at every entry point that creates or uses external signing sessions.
- **Estimated Effort:** Small
- **Owner:** Engineering
- **Evidence:** `apps/web/src/lib/config/feature-flags.ts`; `apps/web/src/lib/core/signature-core.ts`; `apps/web/src/lib/server/module-secure-signing-service.ts`

### P1-011 — No signature provider registered for external signing orchestrator
- **Problem:** `signature-orchestration-service.ts` defines `registerSignatureProvider()`, but no provider is registered anywhere in the codebase. `createSigningSession()` therefore throws when it tries to submit to a provider.
- **Impact:** The module secure-signing flow cannot create sessions in production unless a provider is registered at startup.
- **Root Cause:** Provider registration is missing from application bootstrap.
- **Recommended Fix:** Register a production PDF-Filler/Taqnyat adapter at app startup, or remove the external-orchestration path if public signing is the only supported path.
- **Estimated Effort:** Small
- **Owner:** Engineering
- **Evidence:** `apps/web/src/lib/server/signature-orchestration-service.ts`

### P1-012 — Inconsistent secure-link expiry across stacks
- **Problem:** Secure-link expiry is 10 minutes in the Python backend, 72 hours in Next.js `secure-links.ts`, and 48 hours in `platform-config.ts`.
- **Impact:** Patients receive links that expire before they can complete the workflow; support burden and incomplete consents.
- **Root Cause:** Expiry constants were set independently and not aligned with product/SLA requirements.
- **Recommended Fix:** Define a single source of truth and align all consumers; set production expiry based on operational SLO.
- **Estimated Effort:** Small
- **Owner:** Engineering / Product
- **Evidence:** `apps/api/backend/services/secure_link_service.py`; `apps/web/src/lib/server/secure-links.ts`; `apps/web/src/lib/config/platform-config.ts`

### P1-013 — Signing link expiry configuration is inconsistent
- **Problem:** `platform-config.ts` uses `SIGN_LINK_EXPIRY_HOURS` (default 48 h), but `module-secure-signing-service.ts` uses `SIGNING_LINK_EXPIRY_MINUTES` (default 30 min).
- **Impact:** Operators setting `SIGN_LINK_EXPIRY_HOURS=48` will still produce 30-minute links.
- **Root Cause:** Two independent env vars control the same concept; the sending code ignored the platform-config value.
- **Recommended Fix:** Consolidate on a single env var or make `module-secure-signing-service.ts` read the canonical config.
- **Estimated Effort:** Small
- **Owner:** Engineering
- **Evidence:** `apps/web/src/lib/config/platform-config.ts`; `apps/web/src/lib/server/module-secure-signing-service.ts`

### P1-014 — `/platform` route for platform admins does not exist
- **Problem:** Platform admins are redirected to `/platform` by login, `AppShell`, and `pageAuth`, but there is no `apps/web/src/app/platform` directory.
- **Impact:** Platform administrators logging in land on a 404 page.
- **Root Cause:** Platform admin UI was removed or never created while redirect logic remained.
- **Recommended Fix:** Implement the platform admin landing page or redirect platform admins to a valid operational route.
- **Estimated Effort:** Small
- **Owner:** Engineering
- **Evidence:** `apps/web/src/lib/server/password-login-policy.ts`; `apps/web/src/components/AppShell.tsx`

### P1-015 — Login redirects and release gate test non-existent role dashboards
- **Problem:** `buildPostLoginRedirect` only returns `/platform` or `/modules`. The production release gate expects `/tenant/dashboard`, `/doctor/dashboard`, `/nurse/dashboard`, `/legal/dashboard`, and `/medical-director/dashboard`, but none of these routes exist.
- **Impact:** Release gate will fail or test 404 pages; role-based post-login navigation does not match the actual application.
- **Root Cause:** Role-specific dashboards were never built; release gate expectations are stale.
- **Recommended Fix:** Either implement the role dashboards or update the release gate and login redirect policy to match the real route structure.
- **Estimated Effort:** Medium
- **Owner:** Engineering / QA
- **Evidence:** `apps/web/src/lib/server/password-login-policy.ts`; `apps/web/scripts/prod-release-gate.cjs`

### P1-016 — Enterprise hardening validation is fake
- **Problem:** Stage 5 "Enterprise Hardening Validation" runs steps that only `echo "✓ ... passed"` with no actual RBAC, audit-log, or tenant-isolation checks.
- **Impact:** Production gets false assurance of enterprise hardening; no automated verification of critical security controls.
- **Root Cause:** Placeholder steps added for pipeline structure.
- **Recommended Fix:** Replace with real assertions: enumerate expected RBAC roles, verify audit log table/schema, run tenant-isolation tests.
- **Estimated Effort:** Medium
- **Owner:** Security / Engineering
- **Evidence:** `.github/workflows/enterprise-cicd-pipeline.yml`

### P1-017 — TypeScript project-wide check fails with 30 errors
- **Problem:** `npx tsc --noEmit` reports 30 errors across promissory-note PDF, prisma middleware, runtime observability, StepUp panel, and several test files. None are in the VE-03B production-workspace path, but they block a clean engineering gate.
- **Impact:** Cannot trust TypeScript as a release gate; unrelated type errors mask future regressions.
- **Root Cause:** Accumulated technical debt in non-pilot modules and tests.
- **Recommended Fix:** Remediate or suppress-with-ticket the 30 errors; add `tsc --noEmit` to the release gate.
- **Estimated Effort:** Medium
- **Owner:** Engineering
- **Evidence:** `apps/web/src/lib/server/prisma.ts`; `apps/web/src/components/security/StepUpVerificationPanel.tsx`; `apps/web/tests/*.spec.ts`

### P1-018 — Playwright production-workspace tests cannot authenticate in local environment
- **Problem:** `POST /api/auth/password/login` times out after 120 s in the local dev/production server, preventing execution of `production-informed-consents-workspace.spec.ts` and `production-informed-consents-screenshots.spec.ts`.
- **Impact:** Cannot obtain fresh screenshot evidence or automated end-to-end validation for the physician workspace in this environment.
- **Root Cause:** Database latency (~2.6 s per query) causes the multi-query auth flow to hang; possibly a connection pool or network issue with the configured `DATABASE_URL`.
- **Recommended Fix:** Run tests in an environment with responsive DB (≤200 ms query latency); tune connection pool; verify the smoke-physician account exists.
- **Estimated Effort:** Small (environment)
- **Owner:** DevOps / QA
- **Evidence:** `apps/web/tests/production-informed-consents-workspace.spec.ts`; DB probe `latencyMs: 2641`

---

## Blocker Summary

| Priority | Count | Themes |
|----------|-------|--------|
| P0 | 9 | Authentication bypass, plaintext secrets/tokens, hardcoded credentials, missing patient PDF route, insecure backend API, inaccessible critical modal |
| P1 | 18 | Session revocation, tenant isolation, cookie hardening, rate limiting, email/SMS delivery, feature flags, route inconsistencies, CI/CD fake checks, TypeScript/test environment |

**Top 3 blockers to resolve first:**
1. P0-001 Step-up authentication bypass via headers.
2. P0-003 Raw signing tokens persisted in the database.
3. P0-006 / P0-007 Secrets and credentials in git history and tracked files.
