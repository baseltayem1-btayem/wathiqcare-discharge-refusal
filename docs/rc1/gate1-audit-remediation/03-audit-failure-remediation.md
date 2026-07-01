# 03 — Audit Failure Handling Remediation

## Scope
RC1 Gate 1.3A Finding 3: Remove all silent audit failures.

## Original finding
- `report-access-service.ts`: `logReportAccess` returned `null` for every DB error via `.catch(() => null)`.
- `case-compliance-service.ts`: every `appendAuditChainEvent(...)` call was suffixed with `.catch(() => undefined)`; the consent creation call inside `recordCaseSignature` was also swallowed.
- `public-signing-service.ts`: evidence events were fired-and-forgotten with `void recordEvidenceEvent(...).catch(() => undefined)`.
- `legal-case-pdf-service.ts`: audit-chain reference updates were swallowed with `.catch(() => undefined)` / `.catch(() => null)`.
- Python `discharge_workflow_service.py`: `_log_generation_failure_audit` rolled back and silently closed its session on any exception.

## Root cause
- Availability-first error handling that prioritized not breaking the user flow over preserving legally required evidence.
- No central policy that audit-write failures must be logged, surfaced, and retryable.

## Technical solution
1. **`report-access-service.ts`** — removed `.catch(() => null)`. Audit writes now run through `runAuditOperation()` from `audit-foundation.ts`, which:
   - retries transient DB errors,
   - logs failures via `logRuntimeIncident()`,
   - re-throws the error so the caller can decide whether to fail the operation.

2. **`case-compliance-service.ts`** — removed all `.catch(() => undefined)` on audit/chain/consent calls. Audit writes now use `writeAuditLog({ ..., tx })` inside the same transaction as the business write, so an audit failure rolls back the business mutation.

3. **`public-signing-service.ts`** — replaced all `void recordEvidenceEvent(...).catch(() => undefined)` patterns with `await recordEvidenceEvent(..., tx)` inside the transaction. Removed standalone `.catch(() => undefined)` on `appendAuditChainEvent` calls by folding them into the transaction.

4. **New `runAuditOperation()` helper** in `audit-foundation.ts` for non-transactional audit writes:
   ```ts
   export async function runAuditOperation<T>(
     operation: () => Promise<T>,
     options: { operationName: string; correlationId?: string; entityType?: string; entityId?: string },
   ): Promise<T>
   ```
   This helper wraps `runDbOperation()` and always logs audit failures before re-throwing.

5. **Python `_log_generation_failure_audit`** — changed from silent swallow to explicit logging and re-raise:
   ```python
   except Exception as exc:
       db.rollback()
       logger.exception("audit_failure_persist_failed ...", ...)
       raise
   ```
   Applied to both `backend/core/discharge_workflow_service.py` and `apps/api/backend/core/discharge_workflow_service.py`.

## Verification evidence
- `grep -R '\.catch(() => undefined)'` on the refactored TypeScript files returns no matches for audit write paths.
- `npx eslint` on the changed files reports **0 errors**.
- `npm run test -w apps/web` — 208 unit tests pass.
- `npx tsx --test src/lib/server/audit-foundation.test.ts` confirms `appendAuditEventInTransaction propagates audit failures`.

## Residual risk
- Other modules not touched in this phase still contain silent catches on audit/chain writes, including `legal-case-pdf-service.ts`, `legal-package-module-service.ts`, `backup-dr-service.ts`, `dsr-service.ts`, `incident-response-service.ts`, `module-jobs-service.ts`, and several others identified in the Gate 1.3A exploration. These must be addressed in a follow-up pass.
- Read-only dashboard queries in `report-access-service.ts` still use `.catch(() => [])`/`.catch(() => 0)` because they are not legal-evidence writes; a global no-silent-failure policy should eventually remove these as well.
