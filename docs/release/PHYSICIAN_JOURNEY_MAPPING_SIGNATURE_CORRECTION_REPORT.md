# Physician Journey — Mapping Verification & Signature Rendering Correction

**Release report** for the specification at `wathiqcare-physician-journey-20260715-005219.md`  
**Spec SHA-256:** `2ee58f8f118edfc6b351deae1e092e51b6598b545ff1684ebde5a1b05d6a556f`  
**Branch:** `feature/patient-send-physician-final-step`  
**Baseline HEAD:** `c4b9a005e6fa05a5a0abc1ae25f010abfc92d761` (preserved, no rebase/reset)

---

## 1. Problem Summary

The physician workflow was stuck at **93 % readiness / mapping** and physician signatures were not being rendered because of three coupled root causes:

1. **Field mapping verification was not persisted.** The mapping review UI returned a hard-coded `verificationStatus: "DRAFT"`, so the 14-gate readiness calculator always stayed at 13/14 gates.
2. **Documents were created in `DRAFT` status.** Physician signature capture only accepts `APPROVED`, `READY_FOR_SIGNATURE`, or `SIGNED` documents, so the capture route rejected every attempt.
3. **Physician signatures were not hash-bound.** There was no cryptographic link between the captured signature and the immutable document it signed, and final PDF generation did not fail closed when a signature no longer matched the document version.

---

## 2. Changes Made

### 2.1 Deterministic mapping hash + persisted verification

- Added `computeConsentFieldMappingHash` in `apps/web/src/lib/server/consent-field-mappings/index.ts`.
  - Canonical SHA-256 over the fixed mapping shape (`id`, `formId`, `tenantId`, `fieldMappings[].formFieldId/fieldLabel/pdfRect/page`, doctor-readiness checkbox, witness-policy fields, etc.).
  - Ignores transient labels / UI text so cosmetic edits do not force re-verification.
- Added `ConsentForm.metadata` (type-safe JSON) to store `fieldMappingVerification` without altering signature-mapping tables.
  - Migration: `apps/web/prisma/migrations/0032_consent_form_metadata.sql`
  - Prisma model updated in `apps/web/prisma/schema.prisma`.
- Added `persistFieldMappingVerification` and `getConsentFieldMappingReadiness` helpers.
  - Returns `VERIFIED` only when the persisted hash matches the current mapping.
  - Returns `STALE` on mismatch, forcing re-review.
  - Enforces tenant isolation at the database layer.

### 2.2 Mapping review endpoint

- Extended `POST /api/modules/informed-consents/forms/[formId]/field-mapping` in `apps/web/src/app/api/modules/informed-consents/forms/[formId]/field-mapping/route.ts`.
  - New action: `{ action: "verify" }` persists a verification record under module auth.
  - `GET` returns the persisted verification status alongside the mapping.

### 2.3 Production-workspace integration

- `apps/web/src/components/informed-consents/production-workspace/lib/api.ts`
  - Added `verifyFieldMapping` client helper.
- `apps/web/src/components/informed-consents/production-workspace/hooks/useProductionWorkspace.ts`
  - Exposes verification action and wiring so the UI can move readiness from 93 % to 100 %.

### 2.4 Document creation ready for physician signature

- `apps/web/src/lib/server/consent-document-create-service.ts`
  - Added optional `initialStatus` payload field (defaults to `DRAFT`).
  - The production workspace now creates physician-facing documents with `initialStatus: "READY_FOR_SIGNATURE"`, satisfying the signature-capture status guard while keeping DRAFT creation for all other paths.
- `apps/web/src/app/api/modules/informed-consents/documents/route.ts`
  - Uses `READY_FOR_SIGNATURE` when creating a document in the production workspace context.

### 2.5 Hash-bound physician signatures

- New shared helpers in `apps/web/src/lib/server/signature-hash-binding.ts`:
  - `resolveTrustedDocumentHash` — prefers `immutablePdfHash`, falls back to a deterministic fixed-clause checksum.
  - `isSignatureHashStale` — accepts legacy signatures with no hash for safe migration, rejects mismatched hashes.
- `apps/web/src/app/api/modules/informed-consents/documents/[id]/physician-signature/route.ts`
  - Computes the trusted document hash at capture time and stores `documentHash` + `documentHashSource` in signature metadata.
- `apps/web/src/lib/server/informed-consents-final-pdf-payload.ts`
  - Fails closed with HTTP 409 / `PHYSICIAN_SIGNATURE_STALE` if the physician signature does not match the current document hash.
- `apps/web/src/lib/server/imc-approved-pdf-template-engine.ts`
  - Same fail-closed guard before rendering the approved doctor draft PDF.

### 2.6 Test coverage

- Added `apps/web/src/lib/server/physician-journey-mapping-signature.test.ts` with 19 focused tests covering:
  - Deterministic mapping hash, transient-label immunity, and shape-change detection.
  - Persisted verification round-trip, tenant isolation, and malformed-record rejection.
  - Doctor readiness gating and 100 % progress when all 14 gates are satisfied.
  - Signature hash binding: legacy acceptance, mismatch rejection, match acceptance.
  - End-to-end PDF rendering with a synthetic physician signature (adenotonsillectomy template) and coordinate-validation failure path.

---

## 3. Validation Results

| Gate | Command | Result |
|---|---|---|
| Spec SHA-256 | `certutil -hashfile ... SHA256` | Verified `2ee58f8f...556f` |
| Branch / HEAD | `git rev-parse --abbrev-ref HEAD && git rev-parse HEAD` | `feature/patient-send-physician-final-step`, `c4b9a005...` preserved |
| Focused tests | `npx tsx --test src/lib/server/physician-journey-mapping-signature.test.ts` | **19/19 pass** |
| Full suite | `npm test` | **453/456 pass**; 3 known baseline failures unrelated to this change (see §4) |
| Production build | `npm run build` | **Succeeded** |
| Prisma schema | `DATABASE_URL=postgresql://placeholder... npx prisma validate` | **Valid** |
| ESLint (touched/new files) | `npx eslint <touched files>` | **0 errors**, 6 pre-existing warnings in untouched parts of `imc-approved-pdf-template-engine.ts` |
| Diff whitespace | `git diff --check` | **No whitespace errors** (only LF→CRLF normalization warnings) |

### Full-suite known baseline failures

The following tests fail on the baseline and were **not introduced or altered** by this change:

1. `demo-account-access.test.ts` — `promissory-notes` is missing from the demo module catalog.
2. `modules-catalog-routing.test.ts` — mounted module subroute resolves to `wathiqnote` instead of `promissory-notes`.
3. `package1-idempotency.test.ts` — unique signing idempotency index is not partial on non-null keys.

---

## 4. Security & Compliance Notes

- **No real patient data, signatures, tokens, or mobile numbers were used.** All test fixtures are synthetic.
- **No auth boundary changes.** The c4b9a005 module authorization and role checks are preserved.
- **Additive schema only.** Migration `0032` adds a single nullable `metadata` JSON column; no DROP, TRUNCATE, destructive ALTER, or data rewrite.
- **Fail-closed behavior.** Stale physician signatures now block final PDF generation with a structured error rather than silently rendering an outdated document.
- **Legacy compatibility.** Signatures captured before this change (without a document hash) are accepted to avoid breaking existing records; all new signatures are hash-bound.

---

## 5. Files Changed

```text
 M apps/web/prisma/schema.prisma
 M apps/web/src/app/api/modules/informed-consents/documents/[id]/physician-signature/route.ts
 M apps/web/src/app/api/modules/informed-consents/documents/route.ts
 M apps/web/src/app/api/modules/informed-consents/forms/[formId]/field-mapping/route.ts
 M apps/web/src/components/informed-consents/production-workspace/hooks/useProductionWorkspace.ts
 M apps/web/src/components/informed-consents/production-workspace/lib/api.ts
 M apps/web/src/lib/server/consent-document-create-service.ts
 M apps/web/src/lib/server/consent-field-mappings/index.ts
 M apps/web/src/lib/server/imc-approved-pdf-template-engine.ts
 M apps/web/src/lib/server/informed-consents-final-pdf-payload.ts
 A apps/web/prisma/migrations/0032_consent_form_metadata.sql
 A apps/web/src/lib/server/physician-journey-mapping-signature.test.ts
 A apps/web/src/lib/server/signature-hash-binding.ts
 A docs/release/PHYSICIAN_JOURNEY_MAPPING_SIGNATURE_CORRECTION_REPORT.md
```

---

## 6. Commit

When all gates passed, the change set was committed as:

```
fix(consents): complete mapping and physician signature rendering
```

No push or remote deployment actions were performed.
