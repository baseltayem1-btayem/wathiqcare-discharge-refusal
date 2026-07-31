# AcroForm MR 1135 Amputation — Pilot Report

**Form:** IMC MR 1135 Amputation (البتر)  
**Template version:** 2018-02  
**Pilot date:** 2026-07-15  
**Adapter:** `wathiqcare-acroform-adapter`  
**Canonical approved PDF:** `IMC_MR_1135_Amputation_Canonical_Approved.pdf`  
**Authoring artifact:** `IMC_MR_1135_Amputation_AcroForm_Authoring.pdf` (offline use only)

## 1. Objective

Verify that the AcroForm field-authoring workflow can produce a deterministic,
reviewable manifest for IMC MR 1135 Amputation and that the runtime field-addressed
renderer can overlay physician, patient, substitute, witness and system values onto
the canonical approved PDF without embedding editable AcroForm fields, JavaScript,
or active actions in the patient-facing derivative.

## 2. Implementation Summary

| Component | Path | Purpose |
| --- | --- | --- |
| AcroForm importer | `apps/web/src/lib/server/acroform/acroform-template-import-service.ts` | Parses authoring artifacts, detects security issues, validates against expected manifests |
| Manifest schema & hash | `apps/web/src/lib/server/acroform/field-addressed-template-manifest.ts` | Deterministic JSON schema and integrity hash |
| Verified manifest | `apps/web/src/lib/server/acroform/manifests/imc-mr-1135-amputation.manifest.json` | 56 fields, 10 signatures, 7 buttons, 39 text fields |
| Field-addressed renderer | `apps/web/src/lib/server/acroform/field-addressed-pdf-renderer.ts` | Renders text, checkboxes and signatures onto the canonical PDF, then flattens it |
| Amputation value builder | `apps/web/src/lib/server/acroform/field-mapping/amputation-field-mapping.ts` | Maps doctor completion values and captured signatures to manifest field names |
| Field mapping | `apps/web/src/lib/server/consent-field-mappings/amputation.mapping.ts` | Drives physician-journey readiness and validation |
| Diagnostics | `apps/web/src/lib/server/acroform/acroform-diagnostics-service.ts` | Runtime readiness checks for the verified manifest |
| Integration | `apps/web/src/lib/server/imc-approved-pdf-template-engine.ts` | Uses the field-addressed renderer for `imc-approved-amputation` |
| Readiness API | `apps/web/src/app/api/modules/informed-consents/forms/[formId]/field-mapping/route.ts` | Returns `acroForm` diagnostics alongside field-mapping readiness |
| Generator scripts | `apps/web/scripts/generate-mr1135-manifest.mjs` etc. | Reproducible manifest generation and hash recomputation |

## 3. Field Inventory

- **Total fields:** 56
- **Text fields:** 39
- **Checkbox / button fields:** 7
- **Signature fields:** 10
- **Pages:** 5
- **Page size:** 612 × 792 points (US Letter)

Covered sections:

- Header demographics (`patient_name`, `mrn`, `date_of_birth`)
- Interpreter decision (`interpreter_required`, `interpreter_present`)
- Clinical disclosure blocks A–F in English and Arabic
- Education information sheets
- Patient consent block with bilingual signatures
- Substitute decision-maker block
- Physician / delegate block with bilingual signatures
- Two witness blocks with bilingual signatures, dates and times

## 4. Security Review

| Check | Authoring Artifact | Runtime Derivative |
| --- | --- | --- |
| JavaScript | Detected (offline only) | Removed by flattening |
| OpenAction | Not detected | Removed by flattening |
| Active actions (SubmitForm, Launch, URI, etc.) | Detected (offline only) | Removed by flattening |
| XFA | Not detected | N/A |
| Attachments | Not detected | N/A |
| Non-empty values | Rejected at import | N/A |
| Signed form values | Rejected at import | N/A |

The authoring artifact is explicitly marked `runtimeUsage: "AUTHORING_INPUT_ONLY"`.
The runtime renderer only uses the canonical approved static PDF as a background.

## 5. Validation Results

### 5.1 Focused unit tests

```bash
cd apps/web
npx tsx --test src/lib/server/acroform/*.test.ts src/lib/server/acroform/field-mapping/*.test.ts
```

**Result:** 11/11 passing

Tests cover:

- Manifest generation from a synthetic AcroForm PDF
- Canonical PDF page-size validation
- Rejection of non-empty values
- Expected-manifest verification
- Field-addressed rendering of text, checkbox and signature widgets
- Flattening (no remaining AcroForm fields)
- Page-count mismatch error handling
- Amputation value mapping for demographics, clinical fields, signatures, substitute and witnesses
- Runtime diagnostics returning `READY` for the verified amputation manifest

### 5.2 Build

```bash
cd apps/web && npm run build
```

**Result:** Successful (`next build` completed and wrote deterministic routes manifest).

### 5.3 Lint

Focused lint on changed files:

```bash
cd apps/web
npx eslint src/lib/server/acroform/**/*.ts \
  src/app/api/modules/informed-consents/forms/\[formId\]/field-mapping/route.ts \
  src/lib/server/imc-approved-pdf-template-engine.ts
```

**Result:** 0 errors, 0 warnings from changed/new files.

The repository-wide lint run still reports pre-existing issues in unrelated files
(`public/vendor/pdfjs`, legacy modules); no new issues were introduced by this
work.

### 5.4 Full test suite

```bash
cd apps/web && npm test
```

**Result:** Pre-existing failures in unrelated tests (`modules-catalog-routing`,
`package1-idempotency`, `demo-account-access`). The new AcroForm tests all pass.

### 5.5 Readiness API

GET `/api/modules/informed-consents/forms/{formId}/field-mapping` now returns an
`acroForm` object for forms whose `layoutFamily` is `IMC_MR_1135_ACROFORM`:

```json
{
  "formId": "imc-approved-amputation",
  "manifestPresent": true,
  "manifestHashMatches": true,
  "manifestHash": "64a2f53f3b3e972a6e77e2feb05961a22f5140e3f523c66470af238e0161588f",
  "canonicalApprovedPdf": { "sha256": "ed69899c66be8ef768072fb2e4e6002a152f426dfd6b98a52bbd19a640d16083", ... },
  "fieldCounts": { "total": 56, "text": 39, "button": 7, "signature": 10 },
  "status": "READY",
  "blockers": []
}
```

## 6. Known Limitations & Next Steps

1. **Witness signatures from database records.** The current value builder reads
   witness names/signatures from `doctorCompletionValues`. When witnesses are
   captured via the separate `consentWitnessSignature` flow, the builder should be
   enhanced to merge those records.
2. **Additional AcroForm forms.** Only IMC MR 1135 Amputation is enabled. Other
   IMC forms still fall back to the generic overlay path until their manifests are
   imported and verified.
3. **Route-level signature stale checks.** Amputation bypasses the legacy
   `productionMapping` signature block because `productionMapping` is `null`. The
   field-addressed renderer still validates that signature image data URLs are
   present; stale-hash enforcement is handled earlier in the document lifecycle.

## 7. Conclusion

The IMC MR 1135 Amputation form is ready for pilot use. The AcroForm adapter,
verified manifest, field-addressed renderer, diagnostics API and integration with
the IMC approved PDF template engine all pass focused validation, build and lint
gates for the files touched by this work.
