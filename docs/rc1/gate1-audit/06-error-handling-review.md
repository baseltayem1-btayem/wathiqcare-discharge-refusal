# RC1 Gate 1.3 — 06 Error Handling Review

**Scope:** Verify that audit failures are never silently ignored, that critical failures are surfaced, and review retry/fallback behavior.  
**Analysis date:** 2026-06-26  
**Deliverable owner:** Release Manager

---

## Executive Summary

Error handling for audit operations is **inconsistent and risky**. On the Next.js side, most business writes occur **before** audit writes, outside a transaction; audit-chain append failures are often silently swallowed with `.catch(() => undefined)`. On the Python side, audit writes are usually inside the same transaction as business writes (fail-closed), but there is no retry, no outbox fallback, and no operator alerting. Auth/login rate-limiting fails open when the DB is unavailable. There is no centralized middleware or alerting integration for audit failures.

---

## 1. Next.js Audit Failure Handling

### ERR-01 — `writeAuditLog` does not catch `auditLog.create` failures

| Field | Details |
|---|---|
| **Description** | `apps/web/src/lib/server/saas-services.ts` (lines 319–363) calls `prisma().auditLog.create({ data: … })` without a try/catch. Only the subsequent `appendAuditChainEvent` is wrapped. |
| **Risk** | If `AuditLog` creation fails, the promise rejects to the caller after the primary business write has already committed. |
| **Legal Impact** | Clinical/legal actions can be committed without a corresponding audit record. |
| **Clinical Impact** | A consent, signature, or refusal may exist with no audit trail. |
| **Recommendation** | Make audit writing mandatory and transactional. Wrap business + audit writes in a Prisma transaction or use an outbox pattern. Never return success if audit persistence fails. |
| **Priority** | P0 |
| **Estimated Effort** | Large (transaction/outbox refactor) |

### ERR-02 — `appendAuditChainEvent` failures are silently swallowed

| Field | Details |
|---|---|
| **Description** | Multiple files catch and ignore audit-chain failures:
- `saas-services.ts:360` — logged but ignored
- `consent-service.ts:283` — `.catch(() => undefined)`
- `promissory-note-service.ts:211` — `.catch(() => undefined)`
- `consent-library-service.ts:557` — `.catch(() => undefined)`
- `public-signing-service.ts:711, 2032, 2236, 2544` — caught/ignored
- `module-secure-signing-service.ts:366` — caught, `console.error` only |
| **Risk** | Hash-chain gaps can occur without user-facing failure or alert. |
| **Legal Impact** | Tamper-evident chain becomes non-demonstrable. |
| **Clinical Impact** | Signature/OTP/refusal evidence may be missing from the chain. |
| **Recommendation** | Treat chain-append failures as critical. Surface to operators, retry, and fail the user request if the event cannot be durably chained. |
| **Priority** | P0 |
| **Estimated Effort** | Medium |

### ERR-03 — Business writes and audit writes are not atomic

| Field | Details |
|---|---|
| **Description** | Functions such as `recordCaseConsent`, `createTenantPromissoryNote`, `startPromissoryDebtorSigning`, and secure-link decision submission perform the primary DB write first, then call `writeAuditLog` separately. There is no `prisma.$transaction`. |
| **Risk** | Legal records can be created or signed with incomplete or missing audit evidence. |
| **Legal Impact** | Evidence chain is incomplete. |
| **Clinical Impact** | Clinical decisions may rely on unaudited records. |
| **Recommendation** | Adopt an audit outbox table or wrap business + audit writes in a single transaction; fail the request if audit cannot be written. |
| **Priority** | P0 |
| **Estimated Effort** | Large |

### ERR-04 — Secure-link decision audit is written after document update, without transaction

| Field | Details |
|---|---|
| **Description** | `apps/web/src/lib/server/secure-links.ts` updates `Document` status to `SIGNED`, then calls `appendPublicDecisionAudit`. The audit write is not in the same transaction as the document update. |
| **Risk** | If audit writing fails, the signed decision remains committed but unaudited. |
| **Legal Impact** | Patient/legal-representative decision exists without matching audit entry. |
| **Clinical Impact** | Disputes over refusal/acceptance cannot be resolved. |
| **Recommendation** | Perform document update and audit writes inside a single transaction; roll back the decision on audit failure. |
| **Priority** | P0 |
| **Estimated Effort** | Medium |

### ERR-05 — Login rate-limiting fails open when DB is unavailable

| Field | Details |
|---|---|
| **Description** | `apps/web/src/app/api/auth/password/login/route.ts` `checkRateLimit` catches DB errors, logs them, and returns `{ limited: false }`. Login-attempt recording also catches errors and logs only to console. |
| **Risk** | Attackers can brute-force credentials during a database outage; forensic data is lost. |
| **Legal Impact** | Authentication integrity control is bypassed. |
| **Clinical Impact** | Compromised accounts may access patient data. |
| **Recommendation** | Make rate-limit state resilient (e.g., in-memory circuit breaker with Redis fallback) and fail closed when the audit/check store is unavailable. Emit a critical alert when `recordLoginAttempt` fails. |
| **Priority** | P1 |
| **Estimated Effort** | Small–Medium |

### ERR-06 — `db-resilience.ts` is not used for audit writes

| Field | Details |
|---|---|
| **Description** | `apps/web/src/lib/server/db-resilience.ts` (`runDbOperation`) exists but is not used by `writeAuditLog`, `appendAuditChainEvent`, or any audit caller. |
| **Risk** | Audit writes have no retry logic. |
| **Legal Impact** | Transient DB errors cause audit gaps. |
| **Clinical Impact** | Evidence loss during temporary DB issues. |
| **Recommendation** | Wrap all audit writes in `runDbOperation` or equivalent retry decorator. |
| **Priority** | P1 |
| **Estimated Effort** | Medium |

### ERR-07 — Runtime observability has no alerting integration

| Field | Details |
|---|---|
| **Description** | `apps/web/src/lib/server/runtime-observability.ts` emits JSON to stderr but has no webhook, pager, or Sentry integration. Audit failures are not routed through this utility. |
| **Risk** | Operators are not notified when the audit subsystem fails. |
| **Legal Impact** | Delayed incident response; prolonged gaps in evidence chain. |
| **Clinical Impact** | Audit outages may go unnoticed. |
| **Recommendation** | Wire `logRuntimeIncident` to a real alerting sink (Sentry, PagerDuty, OpsGenie). Add an `AUDIT_FAILURE` incident type classified as `critical`. |
| **Priority** | P1 |
| **Estimated Effort** | Medium |

### ERR-08 — No centralized Next.js middleware for audit/resilience

| Field | Details |
|---|---|
| **Description** | `apps/web/src/middleware.ts` does not exist. There is no centralized ingress logging, correlation, or fail-safe. |
| **Risk** | Every route must remember to audit; omissions are inevitable. |
| **Legal Impact** | Incomplete access log coverage. |
| **Clinical Impact** | Incidents may lack request-level evidence. |
| **Recommendation** | Introduce middleware that records every authenticated request to an append-only audit stream or outbox, carrying correlation IDs. |
| **Priority** | P2 |
| **Estimated Effort** | Medium |

---

## 2. Python Backend Audit Failure Handling

### ERR-09 — Python auth router does not persist login audit

| Field | Details |
|---|---|
| **Description** | `apps/api/backend/api/routers/auth.py` logs login attempts/success/failure to stdout but does not write to `AuditLog` or `WorkflowAuditLog`. Failed attempts are tracked only in an in-memory dict (`_FAILED_LOGIN_ATTEMPTS`). |
| **Risk** | Authentication events are only in volatile logs. |
| **Legal Impact** | No durable record of logins or brute-force attempts. |
| **Clinical Impact** | Cannot forensically investigate account compromise. |
| **Recommendation** | Persist login success/failure to `AuditLog` with masked email, IP, UA, and outcome. |
| **Priority** | P1 |
| **Estimated Effort** | Medium |

### ERR-10 — Python audit writes are transactional but have no retry/fallback

| Field | Details |
|---|---|
| **Description** | `_write_audit` in `secure_link_service.py`, `signature_proof_service.py`, `_log_audit` in `discharge_workflow_service.py`, and `AuditService.log` add audit entries to the same session as business writes. If the audit insert fails, the transaction rolls back and the user gets an error. There is no retry, outbox, or alert. |
| **Risk** | Transient audit-DB blips deny service or, if callers swallow failures, create evidence gaps. |
| **Legal Impact** | Audit availability directly determines business-operation availability. |
| **Clinical Impact** | Signatures/links/decisions cannot complete during audit outages. |
| **Recommendation** | Add an async audit outbox or retry with exponential backoff, plus a dead-letter queue and paging when retries exhaust. |
| **Priority** | P1 |
| **Estimated Effort** | Large |

### ERR-11 — Python signature router hides root cause with generic 500

| Field | Details |
|---|---|
| **Description** | `apps/api/backend/api/routers/signature.py` catches all exceptions and returns a generic Arabic `500 Internal server error` message. Original errors may not be logged at the router layer. |
| **Risk** | Operators cannot distinguish audit outage from signature-provider outage. |
| **Legal Impact** | Misdiagnosis prolongs evidence-chain outages. |
| **Clinical Impact** | Signature failures are hard to troubleshoot. |
| **Recommendation** | Return structured error codes (e.g., `AUDIT_UNAVAILABLE`) for audit failures while keeping generic message for unexpected errors. Log all with correlation IDs. |
| **Priority** | P1 |
| **Estimated Effort** | Small |

### ERR-12 — Python failure-audit logging is silently swallowed

| Field | Details |
|---|---|
| **Description** | `apps/api/backend/core/discharge_workflow_service.py` `_log_generation_failure_audit` catches audit-write errors, rolls back, and does not re-raise or log. |
| **Risk** | Failure of a legally required document may leave no record at all. |
| **Legal Impact** | Compliance officers cannot see that a required form could not be generated. |
| **Clinical Impact** | Missing required documentation may go unnoticed. |
| **Recommendation** | If failure audit cannot be written, emit a `critical` runtime incident and write a fallback local log file or outbox message. |
| **Priority** | P2 |
| **Estimated Effort** | Small |

### ERR-13 — Python `AuditService.log` has no retry or error isolation

| Field | Details |
|---|---|
| **Description** | `apps/api/backend/services/audit_service.py` calls `db.flush()` with no retry or circuit breaker. |
| **Risk** | Transient DB errors propagate immediately, aborting the surrounding transaction. |
| **Legal Impact** | Service unavailability during audit DB hiccups. |
| **Clinical Impact** | Clinical workflows interrupted. |
| **Recommendation** | Wrap audit persistence in a retry decorator or move to an outbox worker. |
| **Priority** | P1 |
| **Estimated Effort** | Medium |

### ERR-14 — Python global exception handlers lack operational alerting

| Field | Details |
|---|---|
| **Description** | `apps/api/backend/main.py` checks `SENTRY_DSN` but only logs a placeholder; Sentry is never initialized. `core/http_hardening.py` logs unhandled exceptions but does not alert. |
| **Risk** | Audit subsystem degradation can go unnoticed. |
| **Legal Impact** | Delayed remediation of evidence-chain gaps. |
| **Clinical Impact** | Prolonged audit outages. |
| **Recommendation** | Initialize Sentry (or equivalent) and add alert rules for `AUDIT_FAILURE`, `DB_FAILURE`, and `unhandled_exception`. |
| **Priority** | P1 |
| **Estimated Effort** | Small–Medium |

### ERR-15 — In-memory Python `AuditLogger` is lost on restart

| Field | Details |
|---|---|
| **Description** | `apps/api/backend/audit/audit_logger.py` stores hash-chained entries in memory only. |
| **Risk** | All discharge-engine audit evidence disappears on process restart/deploy. |
| **Legal Impact** | Critical evidence lost. |
| **Clinical Impact** | Cannot reconstruct clinical decisions from Python discharge engine. |
| **Recommendation** | Persist `AuditLogger` entries to PostgreSQL on every log call or replace with `AuditLog`/`WorkflowAuditLog`. |
| **Priority** | P0 |
| **Estimated Effort** | 2–3 days |

---

## 3. Retry / Fallback Behavior Summary

| Component | Retry | Fallback | Alert | Fail Mode |
|---|---|---|---|---|
| Next.js `writeAuditLog` | No | No | No | Silent gap (caller may return 500) |
| Next.js `appendAuditChainEvent` | No | No | No | Silent gap (often caught/ignored) |
| Next.js login rate-limit | No | No | Console only | Fail-open |
| Next.js `runDbOperation` | Yes | No | No | Not used for audit |
| Python `_write_audit` | No | No | No | Fail-closed (transaction rollback) |
| Python `AuditService.log` | No | No | No | Fail-closed |
| Python auth login audit | No | In-memory dict | No | Not persisted |
| Python `AuditLogger` | No | No | No | Lost on restart |

---

## 4. Recommendations Summary

1. Stop swallowing audit-chain errors; replace `.catch(() => undefined)` with retry and ultimately fail-closed behavior.
2. Make Next.js business + audit writes atomic or use an audit outbox.
3. Wrap all audit writes in existing retry helpers (`runDbOperation` on Next.js, retry decorator on Python).
4. Add retry + alerting to both runtimes for audit-DB failures.
5. Persist Python auth events to `AuditLog`.
6. Return structured error codes from Python signature/discharge routers when audit is the cause.
7. Create `apps/web/src/middleware.ts` for centralized request correlation and ingress logging.
8. Initialize Sentry (or equivalent) and route `AUDIT_FAILURE`/`DB_FAILURE` incidents to on-call.
9. Persist Python `AuditLogger` to PostgreSQL.
10. Implement an audit outbox table with a worker for retries and dead-letter queue.
