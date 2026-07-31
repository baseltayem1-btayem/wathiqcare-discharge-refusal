# Patient Send-to-Patient Physician Final Step — Implementation Report

**Branch:** `feature/patient-send-physician-final-step`  
**Implementation commit:** `4196edb9` (preserved)  
**Corrective commit:** created only after all gates passed (see final section)  
**Report generated:** 2026-07-14

---

## 1. Mounted physician component / page

- **Route:** `apps/web/src/app/modules/informed-consents/page.tsx` mounts the production workspace for informed consents.
- **Workspace path:** `apps/web/src/components/informed-consents/production-workspace/components/enterprise/`
- **Final-step UI component:** `SendToPatientPanel.tsx`
  - Displays the final dispatch gate after preview review and draft approval.
  - Collects/reflects patient mobile and email, shows allowlist status, and exposes the **"Send to Patient"** primary action.
  - Receives `sendDisabled`, `sendReason`, `sendLoading`, and `signingResult` from the parent page/hook and renders dispatch status safely (only `sessionId` and channel status strings; no raw token or URL).
- **Audit/evidence panel:** `AuditEvidenceTimeline.tsx`
  - Renders the secure-signing session ID, delivery status per channel, and expiration timestamp.
  - Displays the existing consent audit timeline without leaking operational secrets.

---

## 2. Final-step UI component and action

- **Component:** `SendToPatientPanel`
  - Props include `mobile`, `email`, `allowlisted`, `pilotEnabled`, `previewReviewed`, `draftApproved`, `sendDisabled`, `sendReason`, `sendLoading`, `signingResult`, and change/send handlers.
  - The physician must review the preview and approve the draft before the send button is enabled.
  - Allowlist verification is surfaced; if the recipient is not approved, a blocking message is shown.
  - On success, `signingResult` shows the session ID and per-channel dispatch status (`sms`, `email`).

- **Action wiring:** the parent page calls the document-scoped secure-signing API below and updates `signingResult` with the safe workflow summary returned by the server.

---

## 3. Exact document-scoped API route

```
POST /api/modules/informed-consents/documents/{id}/secure-signing
```

**File:** `apps/web/src/app/api/modules/informed-consents/documents/[id]/secure-signing/route.ts`

**Responsibilities:**
1. `requireModuleOperationalAccess(request, "informed-consents")` — physician auth + tenant isolation.
2. Reads `caseId`, `patientName`, and `locale` from the request body. `physicianName` is no longer accepted from the body (server uses `auth.email`/identity).
3. Loads the consent document scoped by `{id, tenantId, caseId}`.
4. Rejects non-sendable document states: `VOID`, `FINALIZED`, `SIGNED` → HTTP 422.
5. Verifies the approved PDF source URL via `verifyPublicAssetSource`. Blocks send if missing/inaccessible and writes a consent audit event.
6. Evaluates and persists witness policy requirements via `enforceWitnessPolicyAtSend` (fail-closed on invalid configuration).
7. Resolves the trusted PDF hash via `resolveTrustedPdfHash(document)` — prefers the first-party `immutablePdfHash` column, then approved metadata fields. Blocks send if missing/untrusted → HTTP 422.
8. Resolves canonical patient contacts server-side via `resolveCanonicalCaseContact({ tenantId, caseId })` from case metadata.
9. Enforces pilot allowlist via `isAllowlistedRecipient` → HTTP 403 if not approved.
10. Derives the canonical server-side idempotency root key with `deriveSendRootOperationKey`, which includes the immutable PDF hash, mobile/email hashes, case/document IDs, and locale.
11. Calls `sendModuleSecureSigningLink(...)` with all server-authoritative values; the request body cannot override contact details.
12. Persists only non-sensitive workflow identifiers back to the document metadata (`secureSigningWorkflow.sessionId`, `dispatchStatuses`, `queuedAt`).
13. Writes a consent audit event (`signing_link_created`) with hashed mobile/email and dispatch statuses.
14. Returns `{ ok: true, workflow }` where `workflow` is a `SafeSecureSigningWorkflow` containing no raw token or full signing URL.

---

## 4. Secure-signing / session / outbox / recipient-resolution service chain

| Step | Service / Module | File |
|------|------------------|------|
| 1. Physician send API | `POST /api/modules/informed-consents/documents/[id]/secure-signing` | `route.ts` |
| 2. PDF hash resolution | `resolveTrustedPdfHash` | `module-secure-signing-service.ts` |
| 3. Contact resolution | `resolveCanonicalCaseContact` / `resolveRecipient` | `recipient-resolution-service.ts` |
| 4. Idempotency root key | `deriveSendRootOperationKey` | `module-secure-signing-service.ts` |
| 5. Secure signing dispatch | `sendModuleSecureSigningLink` | `module-secure-signing-service.ts` |
| 6. Idempotent session creation | `createSigningSessionIdempotent` | `signing-session-service.ts` |
| 7. Token creation | `generateSigningToken`, `computeTokenHash` | `signing-token-service.ts` |
| 8. Outbox enqueue | `createPatientMessageDispatch` (SMS + EMAIL) | `patient-message-outbox-service.ts` |
| 9. Outbox processing | `processPendingDispatches` | `patient-message-outbox-service.ts` |
| 10. Delivery callback | `recordDispatchAccepted`, `recordDispatchSent`, `recordDispatchDelivered` | `patient-message-outbox-service.ts` |
| 11. Session status refresh | `refreshModuleSecureSigningStatus` | `module-secure-signing-service.ts` |

**Key security properties:**
- The raw signing token is generated at dispatch time and is **never persisted** in the signing session, document metadata, or audit records.
- `signerLinks` is stored as an empty object; only `tokenHash` is persisted in `signingSecureToken`.
- The signing URL is built only inside the outbox processor and passed directly to the gateway; it is not stored or returned to the physician UI.
- Contact plaintext is resolved from case metadata server-side; the API request body cannot override mobile/email.
- Recipient hashes are verified at dispatch time via timing-safe equality; a mismatch results in `PERMANENT_FAILURE`.

---

## 5. Immutable PDF hash binding

- At document creation, `consent-document-create-service.ts` computes an `immutablePdfHash` SHA-256 fingerprint over the fixed legal clauses (`legalTextAr`, `legalTextEn`, `pdplTextAr`, `pdplTextEn`, `witnessDeclAr`, `witnessDeclEn`, `physicianCertAr`, `physicianCertEn`) and stores it on the `ConsentDocument` column.
- At send time, `resolveTrustedPdfHash` prefers the first-party `immutablePdfHash` column and falls back only to known approved-source metadata fields (`immutablePdfHash`, `checksum`, `approvedPdfHash`, `pdfHash`).
- The hash is mixed into `deriveSendRootOperationKey` and the payload fingerprint, so a changed PDF invalidates any existing signing session and prevents idempotent reuse.
- Tests assert that a changed PDF hash cannot reuse the previous session.

---

## 6. Server-authoritative readiness and witness gates

### Readiness gates enforced before dispatch
1. Physician module operational access.
2. Document exists and is scoped to the tenant + case.
3. Document status is not `VOID` / `FINALIZED` / `SIGNED`.
4. Approved PDF source URL is verified accessible.
5. Witness policy is evaluated and requirements are issued (`enforceWitnessPolicyAtSend`).
6. Trusted PDF hash is present.
7. Canonical patient contacts exist.
8. Recipient is allowlisted for pilot send.

### Witness gates
- `enforceWitnessPolicyAtSend` evaluates the stored policy decision or re-evaluates from template metadata/flags and triggers.
- For `REQUIRED` policies, independent `consentWitnessRequirement` records are created per required slot.
- `assertWitnessEligibility` blocks:
  - Clinician self-witnessing (`WITNESS_SELF_WITNESSING`).
  - Patient self-witnessing (`WITNESS_SELF_WITNESSING`).
  - Duplicate signatures for the same role (`WITNESS_DUPLICATE_SIGNATURE`).
  - Same person filling two roles unless explicitly allowed (`WITNESS_DUPLICATE_ROLE_SAME_PERSON`).
  - Wrong witness role (`WITNESS_ROLE_MISMATCH`).
- Witness signatures are bound to the exact document hash presented (`WITNESS_STALE_DOCUMENT_HASH`).

---

## 7. Routine zero-witness path

- When the evaluated policy has `requiredWitnessCount === 0` (e.g., `CONDITIONAL` with no fired triggers, or default routine electronic consent), no `consentWitnessRequirement` records are issued.
- The patient signs via secure OTP/electronic authentication.
- Tests assert that a competent patient with complete evidence requires zero human witnesses and that the routine path creates one SMS and one email dispatch.

---

## 8. Triggered witness path

- Any fired trigger (`substituteDecisionMaker`, `lacksCapacity`, `cannotReadOrUseJourney`, `communicationBarrier`, `disputedOrObjected`, `refusalOrAma`) escalates the policy to `REQUIRED`.
- `evaluateWitnessPolicy` returns `requiredWitnessCount` ≥ 1 and `requiredWitnessRoles` (default: `NURSING_REPRESENTATIVE`, `PATIENT_EXPERIENCE_REPRESENTATIVE`).
- `enforceWitnessPolicyAtSend` creates the requirement records before dispatch.
- The responsible clinician and patient cannot self-witness; authorized staff roles must sign in the exact required role.

---

## 9. Retryable / permanent failure behavior

**Outbox retry model (`patient-message-outbox-service.ts`):**
- `PENDING` dispatches are claimed atomically via `SELECT FOR UPDATE SKIP LOCKED`.
- Retryable failures transition to `FAILED` and schedule `nextAttemptAt` with exponential backoff (`BASE_BACKOFF_SECONDS = 15`, cap `MAX_BACKOFF_SECONDS = 3600`).
- `maxAttempts` defaults to 5; exhaustion results in `PERMANENT_FAILURE`.
- Permanent error codes (`invalid_recipient`, `invalid_number`, `invalid_email`, `authentication_failed`, `unauthorized`, `forbidden`, `unknown_provider`, `provider_not_configured`, `bad_request`, `resolver_not_found`, `recipient_not_found`) transition directly to `PERMANENT_FAILURE`.
- Accepted dispatches cannot regress to `FAILED`; session reconciliation failure after provider acceptance is logged but does not roll back acceptance.

**Tests:**
- Fake retryable failure is retried successfully without duplicate gateway calls.
- Permanent failure is surfaced and stops retry.
- Accepted dispatch survives session reconciliation failure.

---

## 10. Explicit resend and idempotency behavior

- The canonical root idempotency key is server-derived from authoritative values (tenant, case, document, PDF hash, contact hashes, locale).
- **Repeat click with same root key:** `createSigningSessionIdempotent` returns the same session; no duplicate dispatches are created.
- **Changed PDF hash:** invalidates idempotency reuse; a new session is created.
- **Explicit resend:** requires a client `resendRequestKey`. The service revokes the previous active session and creates a new one. Repeating the same `resendRequestKey` returns the same replacement session (idempotent).
- **Dispatch idempotency:** each channel uses a deterministic child idempotency key; duplicate dispatches with the same key return the existing record and reject mismatched fingerprints.
- **Provider-side idempotency:** the dispatch ID is passed as the gateway idempotency key so a crashed/replayed claim does not produce duplicate sends.

---

## 11. Audit events

| Event | Source | Data |
|-------|--------|------|
| `WITNESS_POLICY_EVALUATED` | `consent-document-create-service.ts` | Decision, mode, required witness count |
| `consent_document_created` | `consent-document-create-service.ts` | Reference, template code, status, idempotency |
| `send_blocked_missing_approved_pdf_source` | `secure-signing/route.ts` | Document ID, case ID, verification result |
| `WITNESS_REQUIREMENTS_ISSUED` | `witness-requirement-service.ts` | Required count/roles, policy version, triggers |
| `secure_signing_session_created` | `signing-session-service.ts` | Session ID, document ID, channels |
| `signing_link_created` | `secure-signing/route.ts` | Session ID, mobile/email hashes, dispatch statuses, locale |
| `WITNESS_SIGNATURE_CAPTURED` | `witness-requirement-service.ts` | Witness signature ID, role, document hash, authentication reference |

All audit metadata stores hashes, never plaintext tokens, mobile numbers, emails, or full signing URLs.

---

## 12. Exact tests and totals

### Focused test
```bash
cd apps/web
npx tsx --test src/lib/server/patient-send-physician-final-step.test.ts
```

**Result:** 13 tests, 13 passed, 0 failed.

Covered:
- Routine path creates one session and one dispatch per channel.
- Repeat click idempotency.
- No raw token or signing URL persisted in session.
- `resolveTrustedPdfHash` column preference.
- `deriveSendRootOperationKey` determinism and PDF-hash sensitivity.
- Routine conditional zero-witness policy.
- Fired trigger escalation to human witness.
- Self-witnessing, duplicate signatures, role mismatch blocks.
- Retryable failure retried without duplicate gateway calls.
- Permanent failure stops retry.
- Accepted dispatch survives session reconciliation failure.
- Explicit resend invalidates old session and is idempotent.

### Full suite
```bash
cd apps/web
npm test
```

**Result:**
- Tests: 395
- Pass: 392
- Fail: 3
- Cancelled: 0
- Skipped: 0
- Duration: ~51.4 s

**Allowed baseline failures (unchanged, not introduced by this change):**
1. `src/lib/server/demo-account-access.test.ts` — demo account access matrix mismatch (`promissory-notes` vs `wathiqnote`).
2. `src/lib/server/modules-catalog-routing.test.ts` — mounted module subroute resolves to `wathiqnote` instead of `promissory-notes`.
3. `src/lib/server/package1-idempotency.test.ts` — unique idempotency index partial-on-non-null-keys assertion.

No `ENOENT` path failures occurred.

---

## 13. TypeScript, Prisma, lint, and git-diff results

### Prisma validate
```bash
cd apps/web
DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma validate --schema=./prisma/schema.prisma
```
**Result:** `The schema at prisma/schema.prisma is valid 🚀`

### TypeScript
```bash
cd apps/web
npx tsc --noEmit
```
**Result:** Errors remain in untouched files outside this feature (pre-existing design-system type mismatches, missing module declarations, etc.).
**Touched files by commit `4196edb9` and this correction have zero TypeScript errors:**
- `apps/web/src/app/api/modules/informed-consents/documents/[id]/secure-signing/route.ts`
- `apps/web/src/components/informed-consents/production-workspace/components/enterprise/AuditEvidenceTimeline.tsx`
- `apps/web/src/components/informed-consents/production-workspace/components/enterprise/SendToPatientPanel.tsx`
- `apps/web/src/components/informed-consents/production-workspace/types.ts`
- `apps/web/src/lib/server/consent-document-create-service.ts`
- `apps/web/src/lib/server/patient-send-physician-final-step.test.ts`

### ESLint
```bash
cd apps/web
npx eslint <touched files>
```
**Result:** 0 errors, 0 warnings after removing avoidable unused imports/variables.

### git diff --check
```bash
git diff --check
```
**Result:** No whitespace errors. (Only routine LF→CRLF warnings for working-copy files that Git will normalize on checkout.)

---

## 14. Repository hygiene

- Removed tracked root-level generated artifacts:
  - `test-output/IMC_MR_1168_CONDITIONAL_WITNESS_TEST_ONLY.manifest.json`
  - `test-output/IMC_MR_1168_CONDITIONAL_WITNESS_TEST_ONLY_PAGE_2.png`
  - `test-output/witness-auth-label-imc-mr-1168-page2.fixture.json`
- Added `/test-output/` to repository root `.gitignore`.
- Verified that `apps/web/test-output/` remains ignored for generated evidence.
- Verified that no generated PDF/PNG/manifest/fixture is tracked by the corrective commit.
- No approved source PDFs were removed or altered.

---

## 15. Remaining Preview and Production prerequisites

- **Gateway configuration:** real SMS/email providers must be configured and allowlisted before patient dispatches leave the sandbox.
- **Environment secrets:** `SIGNING_TOKEN_SECRET`, `RECIPIENT_HASH_PEPPER`, `PUBLIC_SIGNING_OTP_PEPPER`, `SIGNING_BASE_URL`, and `SIGNING_URL_APPROVED_HOSTS` must be set in the target environment.
- **Allowlist population:** the pilot recipient allowlist (`isAllowlistedRecipient`) must contain production-safe test/pilot recipients before enabling patient send in Preview.
- **Database migrations:** witness tables and signing-session migrations must be applied to the target database.
- **Worker / cron:** `processPendingDispatches` must be invoked by a scheduled worker or queue consumer in deployed environments.
- **Preview OTP inspection:** `ENABLE_IMC_PILOT_PATIENTS` and `VERCEL_ENV=preview` gate the preview OTP inspector; it must remain disabled in Production.
- **Operational RBAC:** consent witness roles (`nursing`, `nurse`, `patient_affairs`, `patient_experience`) must be granted `consent:witness_attest` in the deployed authorization layer.
- **Clinical knowledge packages:** approved consent forms and template versions must be published and source-verified before real physician sends.

---

## 16. Safety confirmation

- No push, deploy, Vercel, Production, Preview, remote database connection, real SMS/email/WhatsApp, real signing provider, or real patient data was used.
- No `.env` or secrets were read or written.
- No dependency downloads were performed beyond the existing `node_modules`.
- Commit `4196edb9` was preserved; no amend, reset, rebase, or history rewrite occurred.
- A new corrective commit was created only after every gate passed.

---

## 17. Corrective commit summary

```
fix(consents): activate physician send-to-patient final step
```

**Diff summary (relative to `4196edb9`):**
- `.gitignore`: add `/test-output/` root ignore rule.
- `secure-signing/route.ts`: remove unused `maskMobile`, `maskEmail`, and `physicianName` local.
- `AuditEvidenceTimeline.tsx`: remove unused `CheckCircle2` import.
- `consent-document-create-service.ts`: remove unused `ConsentDocument` and `writeConsentAudit` imports.
- `patient-send-physician-final-step.test.ts`: remove unused `createFakeEmailGateway` import.
- Remove three tracked root `test-output/` artifacts.
- Add this implementation report.

**Previous implementation commit retained:** `4196edb9`  
**New corrective commit hash:** *(recorded at commit time)*
