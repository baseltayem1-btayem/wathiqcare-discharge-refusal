# 02 — Atomic Business Transaction + Audit Transaction Remediation

## Scope
RC1 Gate 1.3A Finding 2: If a business write succeeds, its audit write must succeed in the same transaction, or the business transaction must fail.

## Original finding
| Area | Finding |
|------|---------|
| Consent creation | `recordCaseConsent` in `consent-service.ts` was already atomic. |
| Case presentation / signature / witness / legal package export | `case-compliance-service.ts` performed `prisma().case.update` / `prisma().document.create` first, then called `writeAuditLog` and `appendAuditChainEvent` in separate implicit transactions. |
| Public signing OTP request/verify | `public-signing-service.ts` wrote OTP events, evidence events, audit-chain events, and SMS delivery attempts in separate transactions after external SMS/email dispatch. |
| Public signing signature capture | Consent document update, signature creation, evidence package update/creation, consent audit events, and evidence events were sequential and unwrapped. |
| Python workflow | `backend/core/discharge_workflow_service.py` and `apps/api/backend/core/discharge_workflow_service.py` rolled back the main business transaction and then opened a *new* `SessionLocal()` to write a failure-audit record. |

## Root cause
- Audit helpers were treated as optional, post-operation logging rather than as part of the legal evidence unit of work.
- Functions that already supported an optional `tx` parameter were often called without it, or callers added `.catch(() => undefined)` that broke atomicity.
- Complex public-signing flows mixed external network calls (SMS, email) with DB writes, making a naive single transaction unsafe.

## Technical solution
1. **`consent-service.ts`** — kept atomic; added an optional `tx` parameter so outer transactions can include consent creation:
   ```ts
   export async function recordCaseConsent(auth, caseId, payload, request?, tx?) { ... }
   ```
   If `tx` is supplied, the operation uses it; otherwise it starts its own `prisma().$transaction`.

2. **`case-compliance-service.ts`** — wrapped the business mutation + audit write in a single Prisma transaction for:
   - `recordCasePresentation`
   - `recordCaseSignature`
   - `recordCaseWitness`
   - `generateLegalPackageForCase`
   Each function now calls `writeAuditLog({ ..., tx })` so the audit log and audit chain event share the business transaction.

3. **`public-signing-service.ts`** — external network calls (Taqnyat SMS, email OTP) remain outside the DB transaction, but all subsequent DB evidence writes are wrapped:
   - `recordPublicEducationEvent`
   - `recordPublicDecisionEvent`
   - `requestSigningOtp`
   - `verifySigningOtp`
   - `submitPublicSigningSignature`
   Updated helpers to accept an optional transaction client:
   - `insertOtpEvent(..., tx?)`
   - `markOtpChallengeProcessed(..., tx?)`
   - `persistPublicSigningEvidencePackages(..., tx?)`
   - `recordEvidenceEvent(..., tx?)` in `evidence-package-2-service.ts`
   - `recordSmsAuditAttempt(..., tx?)` in `services/sms/smsAuditService.ts`

4. **`report-access-service.ts`** — `logReportAccess` now accepts an optional `tx` so legal-package export can include the report-access audit in the same transaction.

5. **Python failure-audit** — documented as a residual limitation. Because the failure audit is written *after* the main business transaction is rolled back, it cannot be in the same transaction. The helper now logs and re-raises failures instead of swallowing them (see `03-audit-failure-remediation.md`).

## Verification evidence
- `npm run build -w apps/web` succeeded.
- `npm run test -w apps/web` — 208 unit tests pass.
- Audit-specific tests (`audit-foundation.test.ts`, `audit-chain-service.test.ts`) — 12 tests pass.
- `apps/api` Python tests — 220 passed.
- Code review confirmed that the business-mutating Prisma calls and their matching audit writes now occur inside the same `prisma().$transaction` callback in the functions listed above.

## Residual risk
- **External side effects are not transactional.** If Taqnyat sends an SMS or the email provider accepts a message, but the subsequent DB transaction rolls back, the external side effect remains while the audit evidence is absent. This is acceptable for RC1 only because the audit record is the source of legal truth, not the network dispatch.
- **Final PDF generation** (`ensurePublicFinalConsentPdfState`) remains outside the signature transaction. A signature can be persisted while final PDF generation later fails; the audit trail remains consistent because the signature event is already recorded.
- **Python main-tx rollback + separate failure-audit session** means the failure audit is best-effort, not atomic with the original business operation.
