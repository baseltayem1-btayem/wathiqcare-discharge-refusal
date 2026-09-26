# RC1 Gate 1 — 04 Logging

**Scope:** Logging implementations, structured/audit logging, PII/PHI handling, PDPL compliance in logs, and log redaction.  
**Files reviewed:** `apps/web/src/lib/server/runtime-observability.ts`, `apps/web/src/lib/server/saas-services.ts`, `apps/web/src/app/api/auth/password/login/route.ts`, `apps/web/src/lib/server/secure-links.ts`, `apps/web/src/lib/tracking.ts`, `apps/web/src/lib/environment/audit-logging.ts`  
**Review date:** 2026-06-26

---

## Executive Summary

The codebase has a solid structured-event foundation in `runtime-observability.ts` and a widely used database audit logger, but these are not adopted consistently. Raw `console.*` is the dominant logging mechanism, PII/PHI identifiers are logged in plaintext, audit-chain failures are silently swallowed, and there is no centralized log sink. The logging posture is immature for a production healthcare application subject to PDPL.

| Severity | Count |
|----------|-------|
| Critical | 3 |
| High     | 5 |
| Medium   | 5 |
| Low      | 2 |

---

## Findings

### LOG-CRIT-01 — Raw `console.*` is the dominant logging mechanism
- **Priority:** Critical
- **Description:** More than 80 `console.log / error / warn / info` calls were found across `apps/web/src`. Representative locations:
  - `apps/web/src/app/api/auth/password/login/route.ts` lines 132, 165, 311, 329, 607, 634
  - `apps/web/src/lib/server/runtime-observability.ts` lines 156, 161, 165
  - `apps/web/src/lib/server/secure-links.ts` line 249
  - `apps/web/src/lib/server/legal-case-pdf-service.ts` line 160
  - `apps/web/src/lib/server/acknowledgment-telemetry.ts` lines 40, 45
- **Risk:** Production logs are plain stdout; no log levels, retention policy, SIEM forwarding, queryability, or correlation IDs. Compliance forensics and incident response are severely hampered.
- **Recommendation:** Replace all direct `console.*` calls with a single structured logger (pino/winston) configured with env-driven level, JSON output, redaction, and a transport adapter for the chosen observability stack.
- **Estimated effort:** 2–3 sprints

### LOG-CRIT-02 — Authentication route logs plaintext PII/PHI
- **Priority:** Critical
- **Description:** `apps/web/src/app/api/auth/password/login/route.ts` logs:
  - `email` in `AUTH_USER_NOT_FOUND`, `AUTH_PASSWORD_MISMATCH`, `LOGIN_SUCCESS`, and tenant-inactive warnings.
  - `userId`, `tenantId`, `role`, `membershipStatus` in success/failure events.
- **Risk:** Direct identification of users and authentication outcomes in plaintext logs violates PDPL data minimization and security-of-processing requirements. Failed-login logs can reveal account existence.
- **Recommendation:** Hash or tokenize identifiers in logs using the existing `hashIdentifier` helper from `runtime-observability.ts`. Never log raw email or user IDs.
- **Estimated effort:** 1 sprint

### LOG-CRIT-03 — `login_attempts` table stores email in plaintext
- **Priority:** Critical
- **Description:** `apps/web/src/app/api/auth/password/login/route.ts` line 127 inserts `email.toLowerCase()` directly into `login_attempts`; `checkRateLimit` queries by plaintext email and IP.
- **Risk:** Long-term retention of identifiable credentials-adjacent data in a security table; PDPL and MOH retention/anonymization requirements.
- **Recommendation:** Store a deterministic hash (HMAC-SHA256 with a server secret) of the normalized email for rate-limiting; keep plaintext only if legally required and encrypted at rest.
- **Estimated effort:** 1–2 sprints

### LOG-HIGH-01 — Audit-chain failures are silently swallowed
- **Priority:** High
- **Description:** `writeAuditLog` in `apps/web/src/lib/server/saas-services.ts` line 360 catches `appendAuditChainEvent` errors and only `console.error("audit chain append failed (non-fatal)", auditChainError)`. Many service calls use `.catch(() => undefined)` after `writeAuditLog`.
- **Risk:** A failed audit write is treated as optional. For medico-legal evidence this violates the “immutable audit trail” requirement and could invalidate legal defensibility.
- **Recommendation:** Audit writes must be reliable. Retry with a dead-letter queue, surface failures to operators, or fail the operation for high-sensitivity actions. Never swallow audit errors silently.
- **Estimated effort:** 1–2 sprints

### LOG-HIGH-02 — Environment audit logger is a non-functional placeholder
- **Priority:** High
- **Description:** `apps/web/src/lib/environment/audit-logging.ts` line 38 logs test/demo account events only to `console.log` in development and contains a TODO: “Implement actual audit logging to database / SIEM”.
- **Risk:** Test/demo data mixing, a major production contamination vector, is not actually audited in production.
- **Recommendation:** Wire `auditEnvironmentEvent` to the same `auditLog` table and alert on `data_mixing_attempted` / `demo_sms_attempted` events.
- **Estimated effort:** 1–2 sprints

### LOG-HIGH-03 — Secure-link and signing logs include patient-facing names
- **Priority:** High
- **Description:**
  - `apps/web/src/lib/server/secure-links.ts` line 249: `logSecureLinkPublicEvent` writes arbitrary `data` to `console.warn` without redaction.
  - `appendPublicDecisionAudit` stores typed names in audit details (lines 283–303) — appropriate for the audit table but must not leak to console.
- **Risk:** Patient names / decisions may appear in server stdout if `logSecureLinkPublicEvent` is called with raw data.
- **Recommendation:** Sanitize all fields passed to `logSecureLinkPublicEvent`; route through the structured logger with redaction rules.
- **Estimated effort:** 1 sprint

### LOG-HIGH-04 — No external alerting or observability integration
- **Priority:** High
- **Description:** No Sentry, Datadog, New Relic, PagerDuty, Slack, Teams, or OpsGenie references. No `instrumentation.ts` or `middleware.ts`. Critical incidents are only `console.error` / `logRuntimeIncident`.
- **Risk:** Production incidents are not paged; DB failures, auth anomalies, and audit-chain breaks may go unnoticed.
- **Recommendation:** Integrate an error-tracking/alerting service; at minimum add a webhook dispatcher for `logRuntimeIncident` severity `error`/`critical`.
- **Estimated effort:** 2–4 sprints

### LOG-HIGH-05 — PDPL: audit logs capture email and IP without documented lawful basis
- **Priority:** High
- **Description:** `writePlatformApiAccessAttempt` in `apps/web/src/lib/server/auth.ts` line 319 inserts `email`, `ip_address`, `user_agent` into `platform_api_access_logs`. `writeAuditLog` in `saas-services.ts` also stores IP/User-Agent.
- **Risk:** PDPL requires explicit lawful basis, purpose limitation, and retention limits for personal data in logs. Current logging does not show retention or consent metadata.
- **Recommendation:** Document the lawful basis for IP/email in audit logs; add retention policies and automatic purging; avoid logging email where a hashed user ID suffices.
- **Estimated effort:** 1–2 sprints

### LOG-MED-01 — Runtime redaction is incomplete
- **Priority:** Medium
- **Description:** `apps/web/src/lib/server/runtime-observability.ts` line 40 redacts keys containing `patient`, `mrn`, `full_name`, `name`, `email`, but does not redact `phone`, `mobile`, `nationalId`, `iqama`, `address`, `diagnosis`, `dateOfBirth`, etc.
- **Risk:** PHI may still leak through runtime logs.
- **Recommendation:** Expand the redaction list to match `apps/web/src/lib/tracking.ts` `FORBIDDEN_KEYS` plus email/phone, and centralize the allow-list/deny-list in one policy file.
- **Estimated effort:** 1 sprint

### LOG-MED-02 — Client tracking `FORBIDDEN_KEYS` omits email and phone
- **Priority:** Medium
- **Description:** `apps/web/src/lib/tracking.ts` line 42 drops `patient`, `mrn`, `diagnosis`, `iqama`, `national_id`, `id_number`, `case_id` but not `email` or `phone`.
- **Risk:** Client analytics events could include personal identifiers.
- **Recommendation:** Add `email`, `phone`, `mobile`, `national_id`, `user_id`, `tenant_id`, and any `*name*` pattern to `FORBIDDEN_KEYS`.
- **Estimated effort:** 3–5 days

### LOG-MED-03 — Fire-and-forget `void flushBufferedEvents` in tracking
- **Priority:** Medium
- **Description:** `apps/web/src/lib/tracking.ts` lines 290, 298, 304 call `void flushBufferedEvents()` without awaiting.
- **Risk:** Analytics loss; no visibility into persistent failures.
- **Recommendation:** Emit a metric or log when `postBatch` fails repeatedly.
- **Estimated effort:** 3–5 days

### LOG-MED-04 — Large number of `.catch(() => undefined)` swallow failures
- **Priority:** Medium
- **Description:** 40+ instances across audit writes, cleanup, DB writes, and Prisma operations. Representative files: `case-compliance-service.ts`, `public-signing-service.ts`, `legal-case-pdf-service.ts`, `secure-links.ts`.
- **Risk:** Silent data loss, missed audit events, unreported DB degradation, and masking of bugs.
- **Recommendation:** Replace with `.catch(logAndContinue)` that at minimum calls the structured logger with error name, operation, and trace ID. For audit writes, apply LOG-HIGH-01 guidance.
- **Estimated effort:** 2–3 sprints

### LOG-MED-05 — Consent audit metadata may contain un-redacted PHI
- **Priority:** Medium
- **Description:** `writeConsentAudit` in `apps/web/src/lib/server/consent-library-service.ts` line 509 stores arbitrary `metadata` into `consentAuditEvent` and `auditLog`. Callers control the payload.
- **Risk:** PHI could be persisted in audit metadata without classification.
- **Recommendation:** Apply data-classification policy before persisting metadata; strip or tokenize sensitive fields unless required for the audit purpose.
- **Estimated effort:** 1–2 sprints

### LOG-LOW-01 — `logout` route has no audit or error handling
- **Priority:** Low
- **Description:** `apps/web/src/app/api/auth/logout/route.ts` clears the cookie but does not write an audit event or handle serialization errors.
- **Risk:** Session termination events are missing from the compliance trail.
- **Recommendation:** Add `writeAuditLog` for `logout` and wrap in `try/catch`.
- **Estimated effort:** 2–3 days

### LOG-LOW-02 — Legacy rejected UI directory still contains console logs
- **Priority:** Low
- **Description:** `apps/web/src/components/informed-consents/_legacy-rejected/final-ui-rejected-20260608/` contains many `console.log/error/warn` calls.
- **Risk:** Dead/legacy code still executes if imported; noise in logs.
- **Recommendation:** Delete the `_legacy-rejected` tree if truly unused or guard all logs behind a debug flag.
- **Estimated effort:** 1–2 days

---

## Positive Observations

1. **Database audit logger is widely used.** `writeAuditLog` in `saas-services.ts` is called from 30+ services (auth, case-compliance, consent, discharge-refusal) and captures IP and User-Agent.
2. **`runtime-observability.ts` has good primitives.** It includes structured runtime events, SHA-256 hashing of user/tenant IDs, redaction, metrics, and incident types.
3. **Secure-link audit details are intentionally stored in the audit table**, separating audit persistence from console logging.

---

## Gate 1 Exit Criteria for Logging

1. Replace all production `console.*` calls with a structured, redacting logger.
2. Hash/tokenize identifiers in auth logs and the `login_attempts` table.
3. Stop silently swallowing audit-chain and audit-log failures; make them observable or fail-safe.
4. Integrate an alerting sink for `error`/`critical` runtime incidents.
5. Expand PII/PHI redaction lists in both server and client logging.
6. Document PDPL lawful basis for IP/email in audit logs and add retention/purging.

Logging does not currently satisfy RC1 Gate 1.
