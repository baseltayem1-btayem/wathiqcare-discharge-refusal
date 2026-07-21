# MR1135 Patient Copy Rendering Correction Report

## Summary

Corrected the MR1135 patient-copy pipeline so that the structured physician values shown in the physician Filled Draft Preview are carried into the exact document presented to the patient. The previous implementation created a placeholder PDF during secure-signing dispatch and returned the blank Approved Source to the patient. This correction reuses the existing filled-draft-preview service, manifest, field-addressed renderer, canonical PDF, normalized render values, deterministic draft fingerprint, and document/PDF hash binding.

Starting HEAD: `20c3a475`  
Branch: `feature/patient-send-physician-final-step`

---

## Root Cause

`module-secure-signing-service.ts` created a generic placeholder PDF (`buildPdfBuffer`) when initializing a secure signing session, regardless of consent form type. The public signing document service then returned the blank canonical `approvedPdfUrl` to the patient UI. For MR1135 AcroForm-backed consents, this meant the physician-approved values rendered in the Filled Draft Preview were discarded before the patient ever saw the document. The public final-PDF route also fell through to the legacy non-AcroForm renderer.

The fix binds a governed, filled patient copy to the signing session at dispatch and serves only that bound copy to the patient.

---

## Architecture

- **Approved Source** remains the immutable blank canonical PDF. It is used only as the background.
- **Filled Draft Preview** (physician) continues to be a transient preview rendered by `filled-draft-preview-service.ts`.
- **Patient Copy** is now a governed, immutable PDF generated at dispatch by reusing the same service and values. Its bytes and SHA-256 hash are bound to the `SigningSession`.
- **Final Patient Copy** (post-signature) is generated from the same bound values plus the governed patient signature evidence, date, and time.
- No third PDF engine was created; all copies use the field-addressed AcroForm renderer.
- No physician field values are accepted from the public patient request.

---

## Changed Patient-Facing Paths

### Dispatch: `module-secure-signing-service.ts`

When `moduleType === "informed_consent"` and the consent document is AcroForm-backed:

1. Loads the consent document metadata.
2. Verifies `filledDraftReviewed === true`.
3. Regenerates the draft fingerprint from persisted normalized values and compares it with `filledDraftFingerprint`.
4. Generates the filled patient copy PDF.
5. Stores the PDF bytes (base64), SHA-256 hash, fingerprint, and generation metadata in `SigningSession.metadata.governedPatientCopy`.
6. Passes the PDF bytes to `createSigningSessionIdempotent` for the existing immutable hash binding.

### Patient Document Endpoint: `GET /api/public/informed-consents/signing/[token]/patient-copy-pdf`

New public endpoint that:

- Validates the signing token.
- Loads the signing session metadata.
- Returns the exact bound PDF bytes from `governedPatientCopy.pdfBytesBase64`.
- Verifies the returned bytes hash against `governedPatientCopy.pdfHash`.
- Fails closed (404/422/409) instead of falling back to the blank Approved Source.

### Public Signing Payload: `public-signing-document-service.ts`

For sessions that contain `governedPatientCopy`, the payload's `approvedPdfUrl` now points to:

```
/api/public/informed-consents/signing/{token}/patient-copy-pdf
```

Otherwise, the existing blank Approved Source URL is preserved (fail-safe for non-AcroForm forms).

### Final PDF: `GET /api/public/informed-consents/signing/[token]/final-pdf`

For sessions with a governed copy:

- Loads the governed pre-signature PDF.
- Retrieves the patient signature evidence from `ConsentDocumentSignature`.
- Re-renders the patient copy with the patient signature overlay.
- Preserves all physician values and adds only the patient signature evidence.

### Physician Workspace: `useProductionWorkspace.ts`

The consent-document metadata now persists:

- `patientDisplay` (name, MRN, DOB)
- `physicianContext` (name, designation)
- `encounterReference`
- `approvedPdfUrl`
- `filledDraftFingerprint`
- `filledDraftReviewed`
- `fieldMappingReadiness.acroForm.manifestState.hash`

These are the authoritative values used at patient dispatch.

---

## Binding and Governance

At dispatch the server uses:

- canonical form identity (`approvedConsentFormId`)
- canonical PDF hash (computed from the canonical PDF bytes)
- manifest hash (from `fieldMappingReadiness.acroForm.manifestState.hash`)
- normalized physician values (`doctorCompletionValues`)
- patient demographics (`patientDisplay`)
- physician context (`physicianContext`)
- encounter reference
- current approved draft fingerprint (`filledDraftFingerprint`)

Rejection conditions:

- preview not reviewed → `409 Filled draft preview has not been reviewed`
- fingerprint missing → `409 Filled draft fingerprint is missing`
- fingerprint mismatch → `409 Filled draft fingerprint mismatch: preview is stale or values were altered`
- manifest hash mismatch → `409 Manifest hash mismatch`
- canonical PDF hash mismatch → `409 Canonical approved PDF hash mismatch`
- generated PDF hash does not match the signing-session-bound hash → patient endpoint returns `409`
- missing governed copy binding → `422 No governed patient copy is bound to this signing session`

---

## Page-by-Page Patient Copy Coverage

Same as the physician Filled Draft Preview:

**Pages 1–5 header:** patient name, MRN, date of birth  
**Page 1:** interpreter required/present, condition EN/AR, proposed procedure EN/AR  
**Page 2:** significant risks/options EN/AR + continuation  
**Page 3:** risks of not having procedure EN/AR, anesthesia discussion EN/AR  
**Page 4:** education checkboxes, consent patient name; patient signature/date/time blank before signing  
**Page 5:** physician/delegate name/designation; physician signature/date/time blank before countersign; substitute decision-maker and witness sections blank unless active

---

## PDF Safety

The patient copy shares the same safety properties as the physician preview:

- exactly 5 pages
- 612 × 792 points
- canonical approved PDF used as background
- no AcroForm
- no editable widgets
- no document JavaScript
- no OpenAction
- no URI/Launch/SubmitForm/ImportData/ResetForm actions
- no pdfFiller signature icons
- compatible with the existing PDF.js viewer

---

## Test Results

### Focused patient-copy and MR1135 tests

```
npx tsx --test \
  src/lib/server/acroform/filled-draft-preview-service.test.ts \
  src/lib/server/acroform/patient-copy-dispatch-service.test.ts \
  src/lib/server/acroform/amputation-field-mapping.test.ts \
  src/lib/server/acroform/field-addressed-pdf-renderer.test.ts \
  src/lib/server/physician-journey-readiness.test.ts
```

Result: **38 passed, 0 failed**

Covered:

- physician preview and patient copy contain the same normalized physician values
- patient document is not the blank source
- all five pages retain patient demographics
- bilingual MR1135 values remain present
- pre-signature patient copy has no patient signature
- post-signature final copy preserves physician values
- patient signature is added without replacing existing overlays
- bound PDF hash matches the served patient document
- stale or mismatched fingerprint blocks dispatch
- missing canonical source fails closed
- missing review fails closed
- public requests cannot override physician fields (fields are read from persisted metadata, not request payload)
- MR1168 behavior unchanged

### Full suite (`npm test -w apps/web`)

```
ℹ tests 487
ℹ pass 484
ℹ fail 3
```

The three failures are the known baseline failures:

1. `demo-account-access.test.ts`
2. `modules-catalog-routing.test.ts`
3. `package1-idempotency partial unique-index assertion`

No new failures were introduced.

---

## Validation Gates

- **Production build:** passed with `DATABASE_URL=postgresql://localhost:5432/wathiqcare_placeholder` (migrations auto-skipped)
- **`npx prisma validate`:** valid
- **Differential TypeScript:** zero errors in touched/new files
- **Touched/new-file ESLint:** zero errors, zero warnings
- **`git diff --check`:** no whitespace errors
- **No generated patient-filled PDF tracked**
- **No PHI, tokens, contacts, OTPs, signatures, or signature payloads tracked**

---

## Exact Files Changed

- `apps/web/src/app/api/public/informed-consents/signing/[token]/final-pdf/route.ts`
- `apps/web/src/app/api/public/informed-consents/signing/[token]/patient-copy-pdf/route.ts` (new)
- `apps/web/src/components/informed-consents/production-workspace/hooks/useProductionWorkspace.ts`
- `apps/web/src/lib/server/acroform/filled-draft-preview-service.ts`
- `apps/web/src/lib/server/acroform/patient-copy-dispatch-service.ts` (new)
- `apps/web/src/lib/server/acroform/patient-copy-dispatch-service.test.ts` (new)
- `apps/web/src/lib/server/module-secure-signing-service.ts`
- `apps/web/src/lib/server/public-signing-document-service.ts`
- `apps/web/src/lib/server/signing-session-service.ts`
- `docs/release/MR1135_PATIENT_COPY_RENDERING_CORRECTION_REPORT.md` (this report)

---

## Operational Safeguards

- No push
- No deployment
- No remote database access or modification
- No remote migrations run
- No environment variables changed
- No external PDF provider called
- No real patient data, contacts, OTPs, or signatures used

---

## Remaining Verification Step

End-to-end verification: open the physician workspace, select the MR1135 amputation procedure, fill bilingual values, generate and review the Filled Draft Preview, click Send to Patient, open the secure patient link, confirm the displayed PDF contains the same values, sign, and confirm the final PDF preserves all physician values with the patient signature added.
