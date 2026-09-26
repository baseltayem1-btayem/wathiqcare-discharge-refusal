# 05 — Recovery Strategy

## 1. Retry

| Component | Retry Mechanism | Configuration |
|-----------|-----------------|---------------|
| Database operations | `runDbOperation` retries transient errors | `DB_QUERY_TIMEOUT_MS` (default 5000), `DB_QUERY_MAX_RETRIES` (default 2) |
| SMS delivery | No automatic retry; single attempt via Taqnyat | N/A |
| Email delivery | No automatic retry; single attempt via SMTP/Resend | N/A |
| External PDF renderer | No retry; immediate fallback to Puppeteer | `PDF_RENDERER_URL` |
| Audit-log write | `.catch(() => undefined)` — no retry | N/A |
| Background jobs | No active runner / no retry | N/A |

## 2. Rollback

The pilot rollback procedure is defined in `pilot-package/PILOT_READINESS_MASTER.md` §5.3:

1. Notify Program Operations + IMC governance lead + on-call engineer.
2. Halt new dispatches at tenant level (operations toggle).
3. Re-alias `wathiqcare.online` to the previous production deployment.
4. Verify smoke harness passes 11/11 on the rollback target.
5. Preserve logs, audit tables, and open signing sessions.
6. Schedule root-cause review within 24 hours; no re-promotion until a smoke
   gate covers the root cause.

## 3. Resume

| Scenario | Resume Behavior |
|----------|-----------------|
| Patient interrupts after OTP verify, before signature | Public signing session cookie persists for 30 minutes; signature submission allowed if session valid. |
| Patient interrupts before OTP verify | OTP challenge valid for 10 minutes; new request invalidates old code. |
| Patient uses expired link | Server returns 410; physician must dispatch a new link. |
| Browser closed/reopened | Session cookie restores state if within TTL. |

## 4. Idempotency and Duplicate Prevention

| Area | Control |
|------|---------|
| OTP requests | New challenge invalidates previous unverified challenge hashes; old codes fail verification. |
| Signature submission | Rejected if a signature already exists for the signer role. |
| Module jobs | `webhook_events` unique constraint on dedupe key prevents duplicate job records. |
| Evidence packages | Generated within the same transaction as signature/state update. |
| Consent dispatch | No explicit idempotency key; repeated dispatches create new documents/links. |

## 5. Findings

### 5.1 No retry for notification failures

- **Description:** SMS and email failures are recorded but not retried. A
  transient provider error results in a failed delivery attempt.
- **Severity:** Medium
- **Operational Impact:** Support must manually re-send links/OTP; pilot OTP
  delivery success target (≥ 98%) may be missed.
- **Clinical Impact:** Signing session may expire before the patient receives
  the OTP/link.
- **Recommendation:** Implement a bounded retry with exponential back-off for
  `notificationDeliveryAttempt` records in `FAILED` status, or expose a manual
  resend action in the physician UI.
- **Estimated Effort:** 1–2 days.
- **Owner:** Engineering.

### 5.2 Audit-log failures are not retried

- **Description:** Audit and audit-chain writes use `.catch(() => undefined)`.
  A transient DB error does not trigger a retry.
- **Severity:** High
- **Operational Impact:** Silent loss of compliance evidence.
- **Clinical Impact:** Legal defensibility of a consent can be compromised.
- **Recommendation:** Treat audit writes as critical path: retry with
  exponential back-off and fail the operation if the audit chain cannot be
  appended.
- **Estimated Effort:** 1–2 days.
- **Owner:** Engineering + Legal.

### 5.3 Background jobs have no replay mechanism

- **Description:** `runScopedModuleJob` marks jobs processed immediately. There
  is no dead-letter queue or retry counter.
- **Severity:** High
- **Operational Impact:** Failed retention/evidence jobs cannot be replayed.
- **Clinical Impact:** Retention policy violations; stale expired links.
- **Recommendation:** Implement a real worker with `processed = FALSE` polling,
  attempt counter, and dead-letter table.
- **Estimated Effort:** 3–5 days.
- **Owner:** Engineering.

### 5.4 No idempotency key on consent dispatch

- **Description:** Re-dispatching the same consent creates a new document and a
  new secure link. There is no idempotency key to prevent accidental duplicate
  consents.
- **Severity:** Low
- **Operational Impact:** Duplicate records in the audit trail and consent
  list.
- **Clinical Impact:** Patient may receive multiple links for the same
  procedure; potential confusion.
- **Recommendation:** Add an optional idempotency key to the dispatch API and
  surface a warning if the same case/procedure/template is dispatched twice
  within a short window.
- **Estimated Effort:** 1 day.
- **Owner:** Engineering.

### 5.5 Rollback target must be verified before each promotion

- **Description:** The rollback target in `PILOT_READINESS_MASTER.md` §5.3
  references a specific Vercel deployment alias. This target must remain valid
  for the duration of the pilot.
- **Severity:** Low
- **Operational Impact:** If the target is pruned or the alias is lost,
  rollback time increases.
- **Clinical Impact:** Prolonged outage during a P1.
- **Recommendation:** Pin the rollback target deployment and add a daily smoke
  check against it.
- **Estimated Effort:** 2–4 hours.
- **Owner:** Platform SRE.
