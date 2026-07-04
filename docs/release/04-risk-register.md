# 04 — Risk Register

**Scope:** WathiqCare Production Go-Live for Internal IMC Pilot  
**Date:** 2026-06-28  
**Status:** Active

---

## Legend

- **Likelihood:** Low / Medium / High
- **Impact:** Low / Medium / High / Critical
- **Risk Score:** Likelihood × Impact (H=3, M=2, L=1)
- **Status:** Open / Mitigated / Accepted / Transferred

---

## Open Risks

| ID | Risk | Area | Likelihood | Impact | Score | Owner | Mitigation | Status |
|----|------|------|------------|--------|-------|-------|------------|--------|
| R-001 | Step-up authentication bypassed via HTTP headers, allowing privilege escalation without MFA | Authentication | High | Critical | 9 | Security / Engineering | Remove header bypass; implement server-side challenge/verify | Open |
| R-002 | Raw signing tokens in DB lead to unauthorized consent finalization if DB is compromised | Signature | Medium | Critical | 6 | Security / Engineering | Hash tokens at rest; rotate existing tokens | Open |
| R-003 | Hardcoded OTP pepper or fallback allows OTP hash forgery if env var is missed | OTP | High | Critical | 9 | Security / Engineering | Remove fallback; fail startup without strong pepper | Open |
| R-004 | Secure discharge-link decisions accepted without identity verification | Secure Links | High | Critical | 9 | Engineering / Legal | Bind OTP challenge to link; require OTP before decision | Open |
| R-005 | Secrets and credentials recoverable from git history or tracked files | Secrets | High | High | 6 | Security / DevOps | Rotate credentials; rewrite history; pre-commit hooks | Open |
| R-006 | Backend API provides weaker parallel auth path with unauthenticated endpoints | Backend | Medium | Critical | 6 | Security / Engineering | Harden backend or remove from production | Open |
| R-007 | Patient cannot download final signed PDF due to missing route | PDF | High | High | 6 | Engineering | Implement `/api/public/informed-consents/signing/[token]/final-pdf` | Open |
| R-008 | Logout does not revoke session; stolen tokens remain valid | Authentication | Medium | High | 4 | Engineering | Set `session_revoked_at` on logout | Open |
| R-009 | Tenant isolation bypass flag enables access to inactive tenants | Authorization | Low | High | 3 | Security / Engineering | Remove bypass; audit env vars | Open |
| R-010 | Session cookie uses weak `Lax` SameSite and lacks `__Host-` prefix | Web Security | Medium | High | 4 | Security / Engineering | Harden cookie attributes | Open |
| R-011 | Public signing OTP endpoints lack rate limiting, enabling abuse/brute-force | OTP | High | High | 6 | Security / Engineering | Add per-token and per-IP rate limits | Open |
| R-012 | Taqnyat SMS lacks timeouts/retries and is disabled by default | OTP / SMS | High | High | 6 | Engineering / DevOps | Add timeout/retry/circuit-breaker; enable in production | Open |
| R-013 | Email cannot use Microsoft Graph sender, causing deliverability/compliance issues | Email | Medium | High | 4 | Engineering / DevOps | Implement Graph adapter | Open |
| R-014 | Pilot email override redirects patient emails to admin inbox | Email / Compliance | Low | Critical | 3 | Security / Engineering | Fail-closed override in production | Open |
| R-015 | Inconsistent signing-link expiry causes premature expiration | Signature | Medium | Medium | 4 | Engineering / Product | Single source of truth for expiry | Open |
| R-016 | No signature provider registered for external signing orchestrator | Signature | Medium | High | 4 | Engineering | Register provider or remove unused path | Open |
| R-017 | Secure signing link feature flags not enforced | Feature Flags | Medium | Medium | 4 | Engineering | Assert flags at entry points | Open |
| R-018 | Platform admin `/platform` route missing; role dashboards missing | Routes / UX | High | Medium | 6 | Engineering | Implement or update redirect/release gate | Open |
| R-019 | Production release gate and enterprise hardening validation are fake | CI/CD | Medium | High | 4 | Security / QA | Replace with real assertions | Open |
| R-020 | Custom Dialog modal non-accessible; screen-reader users blocked at send confirmation | Accessibility | High | High | 6 | Engineering / UX | Replace with accessible Radix Dialog | Open |
| R-021 | Workspace lacks language switcher and navigation affordance | Accessibility / UX | Medium | Medium | 4 | Engineering / UX | Add LanguageSwitcher and back/logout affordances | Open |
| R-022 | Project-wide TypeScript errors prevent using tsc as release gate | Engineering Quality | Medium | Medium | 4 | Engineering | Remediate 30 errors | Open |
| R-023 | Local DB latency 2.6 s blocks Playwright/screenshot validation | Environment | High | Medium | 6 | DevOps / QA | Tune connection pool; run tests in responsive environment | Open |
| R-024 | No load/concurrency testing performed | Performance | High | High | 6 | QA / DevOps | Execute load tests before GA | Open |
| R-025 | Audit failures may be silently swallowed in some paths | Audit | Medium | High | 4 | Engineering | Make audit writes transactional and alerting | Open |
| R-026 | CORS on backend allows all origins/methods/headers | Backend | Medium | High | 4 | Security / Engineering | Restrict CORS to known origins | Open |
| R-027 | Rate limiter uses in-memory Map and is not shared across instances | Web Security | Medium | Medium | 4 | Engineering / DevOps | Move to Redis-backed limiting | Open |
| R-028 | Legacy frontend discharge path uses weak OTP generation | Legacy Code | Low | High | 3 | Engineering | Migrate or decommission `frontend/` path | Open |
| R-029 | Missing interpreter/witness workflows or legal exclusion sign-off | Clinical / Legal | Medium | High | 4 | Legal / Clinical | Obtain sign-off or implement before GA | Open |
| R-030 | Missing consent withdrawal workflow or manual SOP | Clinical / Legal | Medium | Medium | 4 | Legal / Clinical | Define SOP or implement workflow | Open |

---

## Risk Heat Map

| | Low Impact | Medium Impact | High Impact | Critical Impact |
|---|:---:|:---:|:---:|:---:|
| **High Likelihood** | — | R-012, R-018, R-023 | R-011, R-020 | R-001, R-003, R-004 |
| **Medium Likelihood** | — | R-015, R-017, R-021, R-022, R-027 | R-002, R-006, R-007, R-010, R-013, R-019, R-024, R-025, R-026, R-029, R-030 | — |
| **Low Likelihood** | — | — | R-008, R-016 | R-014 |

---

## Top 5 Risks Requiring Immediate Action

1. **R-001 Step-up authentication bypass (Score 9).** Privileged-action gate can be defeated with a single HTTP header.
2. **R-003 Hardcoded OTP pepper (Score 9).** If the env var is missed, OTP verification becomes trivially forgeable.
3. **R-004 Secure-link decisions without identity verification (Score 9).** URL possession is treated as patient authorization for legally binding decisions.
4. **R-002 Raw signing tokens in DB (Score 6).** Database leak equals direct access to all live signing links.
5. **R-007 Missing final-pdf route (Score 6).** Patient cannot obtain a copy of their signed consent.

---

## Risk Trends vs. Prior Reports

| Report | Readiness Score | Top Risk |
|--------|-----------------|----------|
| `docs/enterprise-readiness/08-production-readiness-report.md` (2026-06-26) | 79% | Remote signing route gap / mock CKE |
| `docs/rc2-operational-readiness/09-go-live-readiness.md` | Conditional GO | Secure-link OTP undelivered / audit silent failures |
| **This audit (2026-06-28)** | 51.25% | Authentication bypass, plaintext tokens, hardcoded secrets |

The score drop reflects a deeper security inspection rather than regression: the VE-03B workspace migration is complete, but previously latent authentication, token-handling, and secrets-hygiene gaps are now visible and must be closed before production.
