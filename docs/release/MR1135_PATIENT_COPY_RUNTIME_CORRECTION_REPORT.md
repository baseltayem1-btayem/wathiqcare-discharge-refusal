# WathiqCare MR1135 Patient Copy Runtime Correction Report

## Summary

- **Branch:** `feature/patient-send-physician-final-step`
- **Starting HEAD:** `c0d1688997b6e2c094835e2d6eeff23cefaf95f0`
- **Commit created:** pending this report
- **Objective:** Restore the MR1135 amputation consent patient signing journey so the patient sees the same canonical five-page filled PDF and physician-entered bilingual values reviewed in the physician workspace, and the final signed PDF preserves those values.

## Reproduced Defect

Manual end-to-end Preview verification of the MR1135 patient signing flow failed at commit `c0d16889`. The physician workspace showed the filled MR1135 preview with bilingual physician-entered values, but after sending to the patient:

- The public patient signing page rendered the blank Approved Source PDF.
- Physician-entered bilingual values (condition, procedure, risks, education selections, physician identity) were absent.
- The patient-copy-pdf endpoint was not used; the UI consumed `approvedPdfUrl`, which pointed to the blank source.
- After synthetic signing, the final PDF either rebuilt from the blank source or fell back to the legacy overlay engine.

## Root Cause

Three related runtime breaks were identified:

1. **Idempotency root did not include the governed filled-document identity.** `module-secure-signing-service.ts` computed the canonical root idempotency key from tenant, case, document, approved form, PDF hash, recipient and locale, but omitted `filledDraftFingerprint`. A previously created blank/stale signing session could be reused after physician values changed, because the idempotency key remained identical.

2. **Public payload and `final-pdf` fell back to the blank approved source.** `public-signing-document-service.ts` returned `approvedPdfUrl` as the patient-facing URL when no governed copy was bound. The `final-pdf` route rebuilt the PDF from the blank source for AcroForm-backed sessions when `governedPatientCopy` was missing.

3. **Governed patient copy was not bound at dispatch.** `module-secure-signing-service.ts` did not call `generateGovernedPatientCopy` and did not persist the rendered PDF bytes, hash and fingerprint on the `SigningSession.metadata.governedPatientCopy` field. The `patient-copy-pdf` route therefore had no governed bytes to serve.

## Investigation Evidence

### Physician send action

- `useProductionWorkspace.ts` / `production-workspace/lib/api.ts` POST to `/api/modules/informed-consents/documents/[id]/secure-signing` with `caseId`, `patientName`, `locale`.
- `apps/web/src/app/api/modules/informed-consents/documents/[id]/secure-signing/route.ts` reads `document.metadata.filledDraftFingerprint` and passes it to `deriveSendRootOperationKey` and `sendModuleSecureSigningLink`.

### Secure-signing dispatch

- `apps/web/src/lib/server/module-secure-signing-service.ts`: `sendModuleSecureSigningLink` now reads `filledDraftFingerprint` from the consent document metadata, includes it in `buildSendPayloadFingerprint` and `deriveSendRootOperationKey`, and revokes stale active sessions when the idempotency key changes.

### Persisted session

- `SigningSession.metadata.governedPatientCopy` now stores:
  - `acroFormBacked: true`
  - `pdfHash`
  - `pdfBytesBase64`
  - `fingerprint`
  - `filledDraftFingerprint`
  - `formId`
  - `approvedPdfUrl`
  - `manifestHash`
  - `generatedAt`

### Public payload

- `apps/web/src/lib/server/public-signing-document-service.ts`: `buildPublicSigningDocumentPayload` and `buildPreOtpBootstrapPayload` call `resolveGovernedPatientCopyUrl`. If a governed copy is bound, `approvedPdfUrl` in the public payload is replaced with `/api/public/informed-consents/signing/[token]/patient-copy-pdf`. If no governed copy is bound and the document requires one, the service throws `422`.

### Patient viewer

- The public patient page (`/public-signing/document/[token]`) consumes `approvedPdfUrl` from the bootstrap payload. The runtime correction ensures this property is the governed patient-copy endpoint when a governed copy exists.

### Patient-copy-pdf endpoint

- `apps/web/src/app/api/public/informed-consents/signing/[token]/patient-copy-pdf/route.ts` reads `governedPatientCopy.pdfBytesBase64`, verifies the SHA-256 hash against `governedPatientCopy.pdfHash`, and returns the bytes with `Cache-Control: no-store` and copy-type headers. Any mismatch or missing binding fails closed with `409`/`422`.

### Final-pdf endpoint

- `apps/web/src/app/api/public/informed-consents/signing/[token]/final-pdf/route.ts` checks `isAcroFormBacked` and `governedPatientCopy`. If AcroForm-backed but no governed copy is bound, it throws `422`. If a governed copy is bound, it calls `generateGovernedPatientCopy` with the stored patient signature and returns the final bytes.

### Legacy session / idempotency

- Active sessions created before the governed-patient-copy binding are revoked when the computed idempotency key differs.
- Repeated sends with the same governed identity reuse the session.
- Repeated sends after physician values change compute a different `filledDraftFingerprint`, produce a different idempotency key, and revoke the stale session.

### Cache / runtime

- `patient-copy-pdf` and `final-pdf` both return `Cache-Control: no-store`.
- Both routes declare `runtime = "nodejs"`, so Node-only PDF APIs are available.
- Both routes are included in the production build route manifest.

## Implemented Correction

### Files changed

1. `apps/web/src/lib/server/module-secure-signing-service.ts`
   - Added `filledDraftFingerprint` to payload fingerprint and canonical root key.
   - Reads `filledDraftFingerprint` from consent document metadata.
   - Revokes stale active signing sessions when the idempotency key changes.
   - Calls `generateGovernedPatientCopy` for AcroForm-backed informed-consent documents and stores the result in `session.metadata.governedPatientCopy`.
   - Added optional `browser?: Browser` to `SendModuleSecureSigningLinkOptions` for deterministic testing.
   - Moved explicit-resend validation before any database lookup so offline/unit-test callers receive the expected `400`.
   - Passes `args.client` through to `loadBadgeFlags` so tests can use an in-memory client.

2. `apps/web/src/app/api/modules/informed-consents/documents/[id]/secure-signing/route.ts`
   - Computes `filledDraftFingerprint` from `document.metadata` and passes it to `deriveSendRootOperationKey` and `sendModuleSecureSigningLink`.

3. `apps/web/src/lib/server/signing-session-service.ts`
   - Exported `revokeActiveSigningSessionsForDocument`.

4. `apps/web/src/lib/server/public-signing-document-service.ts`
   - Added `resolveGovernedPatientCopyUrl` and `documentRequiresGovernedPatientCopy`.
   - Fails closed with `422` when a governed copy is required but missing.
   - Replaces `approvedPdfUrl` with the patient-copy endpoint in the public payload when a governed copy is bound.

5. `apps/web/src/app/api/public/informed-consents/signing/[token]/final-pdf/route.ts`
   - Fails closed when AcroForm-backed but `governedPatientCopy` is missing.
   - Uses `generateGovernedPatientCopy` with the stored patient signature for the final PDF.

6. `apps/web/src/app/api/public/informed-consents/signing/[token]/patient-copy-pdf/route.ts`
   - Returns the governed PDF bytes bound at dispatch, with hash verification and `no-store` cache headers.

7. `apps/web/src/lib/server/test-helpers/memory-prisma-client.ts` (new)
   - Shared in-memory Prisma stub supporting `consentDocument.findFirst`, `signingSession` CRUD, `signingSecureToken.findFirst`, `patientMessageDispatch` and `$queryRaw`.

8. `apps/web/src/lib/server/patient-copy-runtime-correction.test.ts` (new)
   - Regression tests covering idempotency, stale-session revocation, governed copy binding, public payload URL resolution, and fail-closed behavior.

## Validation Results

### Focused tests

```
npx tsx --test src/lib/server/acroform/patient-copy-dispatch-service.test.ts \
  src/lib/server/acroform/filled-draft-preview-service.test.ts \
  src/lib/server/module-secure-signing-service.test.ts \
  src/lib/server/patient-send-physician-final-step.test.ts \
  src/lib/server/patient-copy-runtime-correction.test.ts
```

- **51 tests passed, 0 failed.**

### Full test suite

```
npm test -w @wathiqcare/web
```

- **495 tests run, 489 passed, 6 failed.**
- After correcting explicit-resend validation order, failures reduced to the three already-known baseline failures:
  - `demo-account-access.test.ts`: "demo account access matrix matches expected visible modules"
  - `modules-catalog-routing.test.ts`: "module path resolver supports mounted module subroutes"
  - `package1-idempotency.test.ts`: "migration creates real unique signing idempotency index"

### ESLint

```
npx eslint <touched/new files>
```

- **0 errors, 0 warnings.**

### TypeScript

```
npx tsc --noEmit
```

- Repository contains unrelated baseline TypeScript errors.
- Filtered to touched/new files: **NO_TOUCHED_ERRORS**.

### Production build

```
DATABASE_URL="postgresql://user:pass@localhost:5432/wathiqcare" npm run build -w @wathiqcare/web
```

- Build succeeded.
- SQL migrations skipped automatically for localhost URL.
- Routes `api/public/informed-consents/signing/[token]/patient-copy-pdf` and `api/public/informed-consents/signing/[token]/final-pdf` are present in the production route manifest.

### Prisma validation

```
DATABASE_URL="postgresql://user:pass@localhost:5432/wathiqcare" npx prisma validate --schema=./prisma/schema.prisma
```

- Schema valid.

### Git diff check

```
git diff --check
```

- Clean.

### Protected history

- Starting HEAD `c0d1688997b6e2c094835e2d6eeff23cefaf95f0` and all ancestors preserved.
- No reset, amend, rebase, squash, force-push or history rewrite performed.

### No tracked artifacts

- No generated PDFs, screenshots, tokens, OTPs, contacts, MRNs, signatures or PHI are tracked in the new test file or helper.
- Test fixtures are synthetic (e.g. `SYNTHETIC PATIENT`, `TEST-MRN-1135`).

## Safe-Execution Confirmations

- No push performed.
- No deployment or redeployment performed.
- No Vercel call made.
- No remote database accessed or modified.
- No remote migrations run.
- No environment variables or secrets changed.
- No external PDF provider used.
- No SMS or email sent.
- No real patient data, contacts, MRNs, OTPs, tokens or signatures used.

## Next Safe Preview Verification Steps

1. Check out this branch at the new commit (after commit is created).
2. Run the physician MR1135 amputation consent workflow to completion in the Preview environment:
   - Fill all bilingual fields.
   - Confirm physician preview shows filled values.
   - Click Send to patient.
3. Open the patient signing URL in an isolated browser session.
4. Verify the patient viewer loads `/api/public/informed-consents/signing/[token]/patient-copy-pdf` as `approvedPdfUrl`.
5. Confirm the patient-copy PDF:
   - Has five pages.
   - Contains the physician-entered bilingual values.
   - Has blank patient signature fields.
6. Complete OTP verification and synthetic patient signature.
7. Download the final PDF and confirm:
   - Physician values are preserved.
   - Patient signature overlay is added.
   - Response headers include `Cache-Control: no-store` and `X-Wathiq-Pdf-Engine: acroform-field-addressed`.
8. Resend after changing a physician value and confirm a new session is created and the old patient URL returns the updated governed copy.
