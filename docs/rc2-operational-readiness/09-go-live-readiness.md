# 09 — Go-Live Readiness

## 1. Readiness Summary

| Area | Status | Conditions |
|------|--------|------------|
| Core consent workflow | Ready | Happy path and refusal path implemented; education, OTP, signature, PDF, and audit chain enforced at signature submission. |
| Clinical scenarios | Conditional | General Surgery, Radiology, Endoscopy, Urology, ENT covered; Orthopedics, Emergency, Cardiology rely on generic forms. Interpreter/witness/withdrawal not implemented. |
| RBAC | Conditional | Role model present; platform admin wildcard and lack of MFA are risks. |
| Failure handling | Conditional | DB, PDF fallback, OTP expiry handled; audit failures swallowed, background jobs not running, secure-link OTP not delivered. |
| Recovery | Conditional | Retry and idempotency partial; rollback procedure documented but not automatically tested. |
| Performance | Conditional | No load tests; PDF rendering not optimized for concurrency. |
| Operational documentation | Ready | Runbooks, SOPs, and checklists exist; some consolidation needed. |

## 2. Pilot Acceptance Criteria

From `pilot-package/PILOT_READINESS_MASTER.md` §4:

| Criterion | Readiness |
|-----------|-----------|
| Smoke harness 11/11 PASS | Must be verified before first patient. |
| 100% executed consents have verifiable PDF hash | Supported by code; verify in pilot. |
| 100% executed consents have complete audit chain | Supported if audit writes succeed; failure handling needs hardening. |
| Patient completion rate ≥ 90% | Unknown until pilot. |
| OTP delivery success ≥ 98% | Depends on Taqnyat + email fallback. |
| Physician dispatch median ≤ 90s | Unknown until pilot. |
| Zero P1, ≤ 2 P2 incidents | Objective; monitoring must be active. |

## 3. Conditions for Controlled Production Release

### Must-have before first patient

1. `PILOT_EMAIL_NOTIFICATION_OVERRIDE_ENABLED` set to `false`.
2. `TEMP_TENANT_ADMIN_INACTIVE_BYPASS` unset/`false`.
3. Production SMS and email credentials configured and tested.
4. Smoke harness `__smoke_stabilization.cjs` passes 11/11.
5. `/api/health`, `/health`, `/ready`, and renderer `/health` all return healthy.
6. Audit-chain integrity check runs and passes on a sample.
7. Rollback target pinned and smoke-tested.

### Should-have before cohort expansion

1. Fix or document the secure-link OTP delivery gap.
2. Add the missing `x-wathiq-internal-secret` header to external PDF renderer
   calls, or operate in fallback-only mode with known capacity.
3. Implement a worker for background jobs, or disable the background-jobs flag
   and run cleanup/retention manually.
4. Harden audit writes so they do not silently fail.
5. Add rate limiting.

### Required before general availability

1. ~~Implement interpreter and witness workflows, or formally exclude them from
   scope with legal sign-off.~~  **Pilot decision (2026-06-27): excluded from
   pilot scope.**  Server-side guard added to `createConsentDocument`; issuance
   UI hard-codes witness/interpreter requirements to `false` for the pilot;
   high-risk consent type remains `coming-soon`.  Legal/clinical sign-off
   required before GA.
2. Add consent withdrawal workflow or clear manual SOP.
3. Add MFA for privileged roles.
4. Optimize PDF rendering (browser pool / render queue).
5. Complete load testing and establish latency baselines.
6. Remove or guard platform-admin wildcard access.

## 4. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Secure-link OTP undelivered | High | High | Disable secure-link OTP gating or fix email dispatch before relying on the flow. |
| Audit-chain write fails silently | Medium | High | Make audit writes transactional. |
| PDF renderer overload | Medium | High | Use internal fallback and monitor CPU; schedule render-queue work. |
| Missing specialty forms | Medium | Medium | Use manual fallback; accelerate content mapping. |
| OTP delivery rate < 98% | Low-Medium | Medium | Email fallback + manual OTP delivery SOP. |
| Platform admin wildcard abuse | Low | High | MFA + access logging; scope reduction. |

## 5. Recommendation

The platform is **ready for a controlled Internal IMC Pilot** provided the
must-have conditions above are met and the secure-link OTP and background-job
issues are either resolved or explicitly removed from pilot scope.

It is **not ready for general availability** without addressing interpreter/
witness support, MFA, PDF performance, load testing, and the platform-admin
wildcard.
