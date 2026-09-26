# 08 — Production Checklist

## 1. Environment & Secrets

| Item | Required Value | Verified |
|------|----------------|----------|
| `JWT_SECRET_KEY` | Strong, non-default secret | ☐ |
| `AUTH_COOKIE_DOMAIN` | Set to production domain only | ☐ |
| `AUTH_COOKIE_SAME_SITE` | `lax` or `strict` (avoid `none` in production) | ☐ |
| `NEXT_PUBLIC_APP_BASE_URL` | `https://wathiqcare.online` | ☐ |
| `DATABASE_URL` | Production Postgres with SSL | ☐ |
| `PDF_RENDERER_URL` | Internal renderer endpoint | ☐ |
| `PDF_RENDERER_SECRET` | Shared secret, sent by web service | ☐ |
| `TAQNYAT_API_KEY` | Production SMS credentials | ☐ |
| `TAQNYAT_SENDER` | Approved sender ID | ☐ |
| `SMTP_HOST` / `SMTP_PASS` OR `RESEND_API_KEY` | Production email | ☐ |
| `PILOT_EMAIL_NOTIFICATION_OVERRIDE_ENABLED` | `false` for production | ☐ |
| `TEMP_TENANT_ADMIN_INACTIVE_BYPASS` | `false` or unset | ☐ |
| `ENABLE_BACKGROUND_JOBS` | Resolve to expected tenant flag | ☐ |

## 2. Integrations

| Integration | Health Endpoint / Test | Verified |
|-------------|------------------------|----------|
| Next.js web | `GET /api/health` returns 200 | ☐ |
| Python API | `GET /health` and `/ready` return 200 | ☐ |
| PDF renderer | `GET /health` returns 200; render smoke test passes | ☐ |
| Taqnyat SMS | Test SMS delivery to pilot number | ☐ |
| Email provider | Test email delivery and acceptance diagnostics | ☐ |
| Database | Connection pool and SSL verified | ☐ |
| Backup/restore | Latest backup job succeeded and restore test passed | ☐ |

## 3. Monitoring & Alerting

| Item | Verified |
|------|----------|
| Log sink configured (JSON, redacted) | ☐ |
| Application dashboards created | ☐ |
| Alert thresholds from `07-operational-runbooks.md` configured | ☐ |
| Pager rotation active and tested | ☐ |
| Error tracking (Sentry or equivalent) integrated | ☐ |
| Audit-chain integrity daily job scheduled | ☐ |

## 4. Security

| Item | Verified |
|------|----------|
| Platform admin wildcard reviewed and accepted | ☐ |
| MFA enabled for admin/legal/platform accounts | ☐ |
| Session TTL and revocation tested | ☐ |
| Rate limiting deployed | ☐ |
| Internal secrets (`PDF_RENDERER_SECRET`, etc.) rotated from defaults | ☐ |
| PII redaction verified in production logs | ☐ |
| Penetration test or security review completed | ☐ |

## 5. Clinical & Legal

| Item | Verified |
|------|----------|
| Pilot physician cohort provisioned and trained | ☐ |
| Patient workflow tested on iOS and Android | ☐ |
| Refusal flow signed off by Legal | ☐ |
| Interpreter/witness workflows either implemented or explicitly excluded | ☐ |
| Consent withdrawal process documented if not implemented | ☐ |
| Evidence package format signed off by Legal | ☐ |
| Retention policy configured (default 10 years) | ☐ |

## 6. Smoke Tests

| Test | Expected Result | Verified |
|------|-----------------|----------|
| `__smoke_stabilization.cjs` | 11/11 PASS | ☐ |
| Happy-path signing (S1) | PDF + audit chain complete | ☐ |
| Refusal flow (S2) | Refusal PDF + evidence complete | ☐ |
| Expired link (S3) | 410 / expired view, no 500 | ☐ |
| Invalid OTP (S4) | Inline error, audit counter | ☐ |
| Cross-tenant isolation (S10) | 401/404 with no data leakage | ☐ |

## 7. Rollback Readiness

| Item | Verified |
|------|----------|
| Rollback target deployment pinned | ☐ |
| Rollback alias procedure tested | ☐ |
| Smoke harness passes against rollback target | ☐ |
| Tenant-level dispatch disable toggle documented | ☐ |
| Incident response channel created | ☐ |

## 8. Findings

### 8.1 No single environment-validation script

- **Description:** The checklist is manual; there is no automated pre-flight
  script that verifies all required environment variables and integrations.
- **Severity:** Low
- **Operational Impact:** Risk of missing a required configuration during
  deployment.
- **Clinical Impact:** Could delay go-live or cause degraded service.
- **Recommendation:** Add a `/api/ready` or startup probe that validates
  secrets and integration health and returns detailed failure reasons.
- **Estimated Effort:** 1–2 days.
- **Owner:** Engineering + Platform SRE.

### 8.2 Background jobs flag not validated

- **Description:** `ENABLE_BACKGROUND_JOBS` is resolved via
  `resolveFeatureFlag`. Even if enabled, there is no worker to consume jobs.
- **Severity:** High
- **Operational Impact:** Feature flag may be toggled on without an actual
  runner, giving false confidence.
- **Clinical Impact:** Retention and cleanup policies silently fail.
- **Recommendation:** Add a readiness check that fails if background jobs are
  enabled but no worker heartbeat is detected.
- **Estimated Effort:** 4–8 hours.
- **Owner:** Engineering.
