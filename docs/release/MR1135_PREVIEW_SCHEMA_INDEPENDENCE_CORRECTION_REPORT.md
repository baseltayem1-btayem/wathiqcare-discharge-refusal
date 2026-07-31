# MR1135 Preview Schema Independence Correction Report

**Date:** 2026-07-15  
**Commit subject:** `fix(consents): decouple mapping readiness from preview schema`  
**Branch:** `feature/patient-send-physician-final-step`  
**Scope:** Informed-consents field-mapping API (`/api/modules/informed-consents/forms/[formId]/field-mapping`)

## 1. Problem Statement

In the Preview environment, the `clinical_consent_forms` table is intentionally absent. The field-mapping route previously queried `prisma.consentForm.findFirst` unconditionally for both reads and writes. When the table was missing, Prisma threw `P2021` and the route returned HTTP 500, even though the governed, source-controlled field mapping and the AcroForm manifest are completely independent of that table.

This blocked the physician production workspace from loading MR1135 readiness in Preview, even though:

- The canonical mapping lives in source-controlled TypeScript modules.
- The AcroForm PDF manifest is verified against static approved assets.
- The Preview database must not be modified to add the missing table.

## 2. Correction Goals

1. Make the **GET** endpoint schema-independent for reads: return authoritative mapping + AcroForm diagnostics even when `clinical_consent_forms` is missing.
2. Catch **only** the specific Prisma `P2021` error for `clinical_consent_forms`; all other database errors must still surface as HTTP 500.
3. Keep **POST verify** fail-closed: writes still require durable persistence in `ConsentForm.metadata`.
4. Add a safe, non-blocking persistence diagnostic to the API response so consumers can tell the difference between "mapping unavailable" and "persistence unavailable".
5. Add unit tests for the new behavior without touching the Preview database.

## 3. Changes Made

### 3.1 Testable route handler factory

Created `apps/web/src/lib/server/field-mapping-route-handler.ts`:

- `isConsentFormTableUnavailableError(error)` — typed guard that checks:
  - `error instanceof Prisma.PrismaClientKnownRequestError`
  - `error.code === "P2021"`
  - message matches `/clinical_consent_forms/i`
- `loadPersistedVerification({ formId, tenantId, prisma })` — wraps `prisma.consentForm.findFirst` and returns `{ persistedVerification, persistence }`. On the specific missing-table error it returns `persistedVerification: null` and `persistence: { available: false, reason: "CONSENT_FORM_TABLE_UNAVAILABLE" }`.
- `createFieldMappingRouteHandlers(deps)` — returns `GET` and `POST`.
  - `GET` calls `loadPersistedVerification`, merges AcroForm readiness, and includes `persistence` in the response.
  - `POST` calls `persistFieldMappingVerification` directly and remains fail-closed.

### 3.2 Thin API route

`apps/web/src/app/api/modules/informed-consents/forms/[formId]/field-mapping/route.ts` now wires real `requireModuleOperationalAccess` and `getPrisma` into the factory.

### 3.3 Persistence diagnostic in the API contract

`apps/web/src/components/informed-consents/production-workspace/lib/api.ts` adds:

```ts
persistence?: {
  available: boolean;
  reason?: string;
};
```

to `ConsentFieldMappingReadiness`.

### 3.4 MR1135 physician-field completeness fix

`apps/web/src/lib/server/acroform/acroform-readiness-adapter.ts` now includes `INTERPRETER_CONDITIONAL` fields in `requiredDoctorFields`. This raises the MR1135 physician field count from 13 to 15 and correctly reflects that interpreter applicability decisions are part of the physician completion gate.

### 3.5 Unit tests

`apps/web/src/lib/server/field-mapping-route-handler.test.ts` covers:

- P2021 guard positive/negative cases.
- GET returns 200 with static MR1135 mapping when the ConsentForm table is unavailable.
- GET uses persisted verification when the table is available.
- GET returns 500 for unrelated Prisma errors.
- Authentication is enforced unchanged.
- Unregistered forms return a missing-mapping response.
- MR1135 aliases resolve to canonical identity even when the table is unavailable.
- POST verify remains fail-closed when the table is unavailable.
- MR1168 adenotonsillectomy behavior is unchanged.

## 4. Validation Results

| Check | Command | Result |
|-------|---------|--------|
| Unit tests | `npm test` (apps/web) | **482 passed, 3 failed** — the 3 failures are pre-existing and unrelated: `demo-account-access`, `modules-catalog-routing`, `package1-idempotency partial unique-index assertion`. The new field-mapping tests all pass. |
| TypeScript build | `npm run build` with placeholder env | **Succeeded** (`Compiled successfully`, static generation complete). Pre-existing type errors elsewhere are skipped by Next.js during builds. |
| Prisma schema validate | `DATABASE_URL=... npx prisma validate` | **Valid** |
| ESLint | `npm run lint` | **Fails on pre-existing errors** in `package1-idempotency.test.ts` (require imports, prefer-const). No new lint errors were introduced in the changed files. |

The Preview database was not modified. No migrations, remote access, push, or deployment were performed.

## 5. API Behavior

### GET `/api/modules/informed-consents/forms/imc-approved-amputation/field-mapping` (Preview, table missing)

```jsonc
{
  "ok": true,
  "source": "consent-field-mapping-foundation",
  "persistence": {
    "available": false,
    "reason": "CONSENT_FORM_TABLE_UNAVAILABLE"
  },
  "formId": "imc-approved-amputation",
  "slug": "amputation",
  "hasMapping": true,
  "verificationStatus": "VERIFIED",
  "acroForm": {
    "canonicalTemplateIdentity": {
      "formId": "imc-approved-amputation",
      "slug": "amputation",
      "titleEn": "Approved Amputation Consent",
      "templateCode": "IMC_MR_1135",
      "layoutFamily": "IMC_MR_1135_ACROFORM"
    },
    "manifestState": {
      "status": "READY",
      "present": true,
      "hashMatches": true,
      "hash": "<sha256>",
      "blockers": []
    },
    "semanticPhysicianFields": [ /* 15 fields */ ],
    "patientSignatureTargets": [ /* 2 targets */ ],
    "physicianSignatureTargets": [ /* 1 target */ ],
    "interpreterApplicable": true,
    ...
  },
  "requiredDoctorFields": [ /* 15 fields */ ],
  "requiredPatientFields": [ /* 2 fields */ ],
  ...
}
```

The `persistence` object is informational and does not block the readiness response.

### POST `/api/modules/informed-consents/forms/imc-approved-amputation/field-mapping` (Preview, table missing)

```jsonc
{
  "ok": false,
  "error": "The table public.clinical_consent_forms does not exist in the current database."
}
```

with HTTP 500, because writes require durable storage.

## 6. Pre-existing Failures (Acknowledged, Not Fixed Here)

- `demo-account-access`: expected module list mismatch (`wathiqnote` vs `promissory-notes`).
- `modules-catalog-routing`: module slug mismatch.
- `package1-idempotency partial unique-index assertion`: migration index definition mismatch.
- TypeScript errors and ESLint errors in unrelated legacy files.

These were present before this correction and are outside the scope of the MR1135 Preview schema-independence fix.

## 7. Sign-off

- No PHI, patient contact, or signature data was used in validation.
- All fixtures are synthetic and marked test-only where applicable.
- The Preview database was left untouched.
