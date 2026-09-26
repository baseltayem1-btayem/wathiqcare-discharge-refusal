# 04 — Retry Strategy and Fail-safe Behaviour

## Scope
RC1 Gate 1.3A Findings 4 and 5: implement a safe retry strategy for transient audit failures and define fail-safe behaviour for database unavailability, audit table unavailability, deadlocks, timeouts, and transaction rollbacks.

## Original finding
- Audit writes had no dedicated retry strategy outside ad-hoc provider loops (SMS, Graph, TSA).
- `db-resilience.ts` provided `runDbOperation()` with timeout and retry, but audit helpers did not consistently use it.
- There was no idempotency mechanism, so a retried audit write could create duplicate events.
- Fail-safe behaviour was undefined: silent catches allowed business operations to complete without audit evidence.

## Root cause
- Retry logic was scattered across integration clients and not applied to the audit persistence layer.
- No shared concept of an audit-operation unit of work with stable identity.

## Technical solution

### Retry strategy
1. **Reuse `runDbOperation()` for all non-transactional audit writes.**
   - `runAuditOperation()` in `audit-foundation.ts` wraps `runDbOperation()` and adds audit-specific failure logging.
   - `withAtomicAuditTransaction()` wraps `prisma().$transaction(...)` inside `runDbOperation()` so the entire business+audit transaction is retried on transient failures.

2. **Configurable limits** (env-driven, with safe defaults):
   - `DB_QUERY_TIMEOUT_MS` (default `5000` ms)
   - `DB_QUERY_MAX_RETRIES` (default `2`)
   - These values are documented and can be tuned per environment.

3. **Transient error detection** in `db-resilience.ts`:
   - Prisma codes `P1001` (cannot reach DB), `P1017` (server closed connection)
   - Messages containing `Can't reach database server`, `Connection terminated unexpectedly`, `timed out`, `ECONNRESET`
   - Deadlocks and lock timeouts are retried implicitly by Postgres/Prisma; our wrapper catches the resulting connection/timeout exceptions.

4. **Idempotency to avoid duplicate audit events.**
   - `appendAuditEventInTransaction()` computes an `idempotencyKey` (hash of tenant, entity, action, and a stable caller-provided nonce such as `correlationId`/`requestId`).
   - Before inserting, it queries `auditChainEvent` for an existing record with the same `metadataJson.idempotencyKey`.
   - If found, it returns the existing `auditLogId` and `auditChainEventId` without creating new rows.
   - A new test verifies this behaviour.

### Fail-safe behaviour
| Scenario | Behaviour |
|----------|-----------|
| **Database unavailable** | `runDbOperation()` throws `DatabaseUnavailableError` after retries are exhausted. The error carries a `traceId` and is logged via `logRuntimeIncident()`. Callers must surface a 503 or equivalent. |
| **Audit table unavailable** | If the audit table is unreachable inside a business transaction, the whole transaction rolls back. The business operation fails; no inconsistent evidence is produced. |
| **Deadlocks** | Prisma/Postgres aborts one transaction. Our retry wrapper re-executes the operation up to `DB_QUERY_MAX_RETRIES`. |
| **Timeouts** | Operation is rejected after `DB_QUERY_TIMEOUT_MS` per attempt and retried up to the max. If still failing, `DatabaseUnavailableError` is thrown. |
| **Transaction rollback** | Any failure inside `prisma().$transaction()` rolls back both business and audit writes. The error is logged and propagated. |
| **Failure-audit write fails (Python)** | `_log_generation_failure_audit()` logs the exception and re-raises so the original workflow error is not masked. |

## Verification evidence
- New unit test: `appendAuditEventInTransaction skips creation when idempotency key already exists` passes.
- `npm run test -w apps/web` — 208 unit tests pass.
- `npm run build -w apps/web` succeeded.
- `apps/api` Python tests — 220 passed.

## Residual risk
- **Idempotency key stability:** Callers that do not provide `correlationId`/`requestId` fall back to the current ISO timestamp, which changes between retries and can produce duplicates if a transaction commits but the client times out. Future callers should pass stable logical identifiers.
- **JSON-path idempotency query:** The lookup uses a Postgres JSON-path filter. If the runtime driver does not support it, the helper falls back to creating a new event, losing duplicate suppression.
- **Deadlock retry is implicit:** We do not explicitly detect Postgres error code `40P01`; we rely on Prisma/Postgres to surface it as a retryable transaction failure. A dedicated deadlock-aware retry decorator may be added later.
- **No audit outbox:** If the DB is unavailable for an extended period, audit events are not durably queued. A future phase should introduce an outbox table or message queue for guaranteed delivery.
