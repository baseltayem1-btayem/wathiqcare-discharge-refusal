# 04 — Operational Failure Scenarios

## 1. Failure Mode Inventory

| Failure | Detected By | Current Behavior | Verdict |
|---------|-------------|------------------|---------|
| Database unavailable | `runDbOperation` timeout/retry; Prisma errors | Returns 503 with `DatabaseUnavailableError`; auth returns 503 | Handled |
| SMS unavailable | `isTaqnyatConfigured` / send result | OTP request falls back to email; delivery status recorded as failed | Partially handled |
| Email unavailable | Provider diagnostics / exception | Returns `status: "failed"`, audit recorded; no automatic retry | Partially handled |
| PDF render failure | External renderer exception | Falls back to internal Puppeteer; incident logged | Handled |
| Audit failure | `appendAuditChainEvent` exception | `.catch(() => undefined)` in many paths; signature may succeed without audit chain | Risk |
| OTP timeout | Expiry check | Returns 410; patient must request new OTP | Handled |
| Storage unavailable | File read/write errors | Returns 503 on artifact download; PDF generation may fail | Partially handled |
| Renderer unavailable | External fetch failure | Falls back to internal Puppeteer | Handled |
| Background job failure | No active runner observed | Jobs queued in `webhook_events` but not processed | Gap |

## 2. Detailed Findings

### 2.1 Database unavailability handling

- **Description:** `runDbOperation` (`db-resilience.ts`) retries transient
  Prisma errors up to `DB_QUERY_MAX_RETRIES` (default 2) with a 5-second
  timeout, then throws `DatabaseUnavailableError`. `requireAuth` converts this
  to HTTP 503.
- **Severity:** Low (positive finding)
- **Operational Impact:** Degraded availability with clear error codes; no
  silent corruption.
- **Clinical Impact:** Physicians cannot log in during DB outage; in-flight
  consents may fail to save.
- **Recommendation:** Add a synthetic DB health check to `/ready` or a separate
  `/health/db` endpoint.
- **Estimated Effort:** 2–4 hours.
- **Owner:** Engineering.

### 2.2 SMS unavailable fallback

- **Description:** `requestSigningOtp` attempts Taqnyat SMS. If SMS fails but
  a recipient email is configured, the OTP is also emailed. If both fail,
  `deliveryStatus: "failed"` is returned.
- **Severity:** Low
- **Operational Impact:** Patients without a registered email and with SMS
  down cannot receive the OTP.
- **Clinical Impact:** Signing is blocked until SMS recovers or staff manually
  delivers the OTP.
- **Recommendation:** Test email fallback in pilot and document the manual OTP
  delivery SOP for production incidents.
- **Estimated Effort:** 2–4 hours (test + doc).
- **Owner:** Engineering + Operations.

### 2.3 Audit-chain failures are silently swallowed

- **Description:** Many calls to `appendAuditChainEvent` and `writeAuditLog`
  use `.catch(() => undefined)` (e.g., `public-signing-service.ts`,
  `secure-links.ts`, `module-jobs-service.ts`). If audit insertion fails, the
  consent can still be finalized.
- **Severity:** High
- **Operational Impact:** Missing audit rows break the legal evidence package
  and daily integrity checks.
- **Clinical Impact:** Consent may be clinically valid but legally
  indefensible; rollback trigger per `PILOT_READINESS_MASTER.md` §5.1 may fire.
- **Recommendation:** Make audit-chain append transactional with the consent
  state change; return 500 if the audit cannot be written.
- **Estimated Effort:** 1–2 days.
- **Owner:** Engineering + Legal.

### 2.4 Background jobs are queued but not executed

- **Description:** `runScopedModuleJob` (`module-jobs-service.ts`) inserts
  `webhook_events` rows with `provider_key = 'internal-job-runner'` and marks
  them processed immediately. No worker/scheduler consumes unprocessed rows.
- **Severity:** High
- **Operational Impact:** Expired link cleanup, evidence package generation,
  and retention jobs will not run automatically.
- **Clinical Impact:** Expired signing links may persist; retention policies
  may not be enforced.
- **Recommendation:** Implement and deploy a worker that polls
  `webhook_events` for `internal-job-runner` rows, or switch to a managed
  queue with dead-letter handling before go-live.
- **Estimated Effort:** 3–5 days.
- **Owner:** Engineering + Platform SRE.

### 2.5 External PDF renderer missing authentication header

- **Description:** `renderPdfWithExternalRenderer`
  (`informed-consents-final-pdf-payload.ts:1964-1969`) posts HTML to the
  renderer without the `x-wathiq-internal-secret` header that the renderer
  requires (`pdf-renderer/src/server.ts:49-62`). If `PDF_RENDERER_SECRET` is
  set, the renderer returns 401 and the code falls back to internal Puppeteer.
- **Severity:** Medium
- **Operational Impact:** External renderer is effectively unused when secret
  is enabled; internal fallback may be slower and less isolated.
- **Clinical Impact:** Delayed PDF generation under load; possible timeouts.
- **Recommendation:** Add the internal secret header to the external renderer
  request, or configure the renderer to allow unauthenticated calls from the
  web service only.
- **Estimated Effort:** 1–2 hours.
- **Owner:** Engineering.

### 2.6 Renderer health check does not verify Chromium

- **Description:** `/health` on the PDF renderer returns `{ ok: true }`
  regardless of whether Chromium can launch or fonts are available.
- **Severity:** Low
- **Operational Impact:** A renderer with a broken Chromium binary is reported
  healthy and will fail at `/render`.
- **Clinical Impact:** Delayed or failed PDFs during consent finalization.
- **Recommendation:** Extend `/health` to launch a headless smoke page and
  verify Arabic font rendering.
- **Estimated Effort:** 4–8 hours.
- **Owner:** Engineering.

### 2.7 Storage failures on artifact download

- **Description:** `downloadPublicSecureLinkArtifact`
  (`secure-links.ts:940-947`) returns 503 if the file cannot be read, but does
  not log a structured incident.
- **Severity:** Low
- **Operational Impact:** Difficult to diagnose storage outages.
- **Clinical Impact:** Patient cannot download refusal form.
- **Recommendation:** Add `logRuntimeIncident` around storage read failures and
  expose a health probe for the storage mount.
- **Estimated Effort:** 2–4 hours.
- **Owner:** Engineering.

### 2.8 OTP lockout lacks cool-down window

- **Description:** After 3 failed attempts the challenge returns 429 with the
  message "Request a new OTP challenge." A new OTP request immediately creates
  a new challenge.
- **Severity:** Low
- **Operational Impact:** No enforced cool-down; brute-force attempts are
  limited to 3 per challenge but can continue indefinitely by requesting new
  challenges.
- **Clinical Impact:** Low because OTP space is 1,000,000 and delivery is rate-
  limited by the SMS/email provider.
- **Recommendation:** Add a per-token rate limit (e.g., max 5 OTP requests per
  hour) and a short cool-down after 3 failed verifications.
- **Estimated Effort:** 4–8 hours.
- **Owner:** Engineering + Security.
