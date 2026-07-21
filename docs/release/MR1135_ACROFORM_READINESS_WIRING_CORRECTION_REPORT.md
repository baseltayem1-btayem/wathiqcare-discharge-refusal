# MR1135 AcroForm Readiness Wiring Correction Report

## Summary

Corrected the incomplete IMC MR 1135 AcroForm readiness integration so that the
physician workspace recognises the amputation consent, resolves all legitimate
identifiers to one canonical mapping, and wires the governed AcroForm manifest
into the physician completion UI and readiness gates.

## Root Cause

1. **Alias resolution gap.** `getConsentFieldMappingByFormId` only matched
   `mapping.formId` or `mapping.slug`. Identifiers such as `IMC MR 1135`,
   `MR1135`, `MR 1135`, or `imc-mr-1135` reached the workspace but did not
   resolve to `AMPUTATION_FIELD_MAPPING`, causing the mapping to be reported as
   `MISSING`.
2. **Circular AcroForm diagnostics.** The field-mapping API only returned
   AcroForm diagnostics when `readiness.mapping?.layoutFamily ===
   "IMC_MR_1135_ACROFORM"`. If the mapping was not found first, diagnostics
   were skipped, and if the alias was `amputation` the diagnostics service
   itself only registered `imc-approved-amputation`.
3. **No authoritative adapter.** Mapping readiness, AcroForm manifest state,
   and physician-field counting were computed in separate places, so the UI,
   API, and checklist could disagree.
4. **Conditional gates were not enforced.** Interpreter applicability,
   anesthesia `requiredWhen`, and bilingual completeness were not wired into the
   readiness aggregate, so physician fields showed `0/0` or `N/A` and send was
   not blocked until all evidence was present.

## Exact Actual Form Identifiers Found

Identifiers that legitimately reach the workspace for the same MR1135 template:

- `imc-approved-amputation` — canonical manifest id
- `amputation` — manifest slug
- `IMC MR 1135` — human template code
- `imc mr 1135`, `MR 1135`, `MR1135`, `imc-mr-1135` — case/space/punctuation variants
- Database-linked ids (UUIDs) are also resolved because the alias resolver is
  called before the mapping lookup; any id that is not a registered alias falls
  through to the existing lookup, and the adapter is also consulted by the API.

Unrelated ids (e.g. `imc-approved-adenotonsillectomy`, `some-uuid`,
`appendectomy`) do not resolve to MR1135.

## Files Changed

- `apps/web/src/lib/server/acroform/acroform-template-identity.ts` (new)
- `apps/web/src/lib/server/acroform/acroform-template-identity.test.ts` (new)
- `apps/web/src/lib/server/acroform/acroform-readiness-adapter.ts` (new)
- `apps/web/src/lib/server/acroform/acroform-readiness-adapter.test.ts` (new)
- `apps/web/src/lib/server/physician-journey-readiness.test.ts` (new)
- `apps/web/src/lib/server/acroform/acroform-diagnostics-service.ts`
- `apps/web/src/lib/server/consent-field-mappings/index.ts`
- `apps/web/src/lib/server/physician-journey-readiness.ts`
- `apps/web/src/app/api/modules/informed-consents/forms/[formId]/field-mapping/route.ts`
- `apps/web/src/components/informed-consents/production-workspace/hooks/useProductionWorkspace.ts`
- `apps/web/src/components/informed-consents/production-workspace/lib/api.ts`
- `docs/release/MR1135_ACROFORM_READINESS_WIRING_CORRECTION_REPORT.md` (this report)

## API Response Before and After

### Before

For `GET /api/modules/informed-consents/forms/imc-approved-amputation/field-mapping`:

```jsonc
{
  "ok": true,
  "formId": "imc-approved-amputation",
  "hasMapping": true,
  "verificationStatus": "VERIFIED",
  "requiredDoctorFields": [...],       // 13 physician-required text/signature fields
  "requiredPatientFields": [...],      // 2 patient fields
  "requiredAnesthesiaFields": [...],   // 2 anesthesia fields
  "acroForm": { ... READY diagnostics ... }
}
```

For aliases such as `MR 1135` the response was:

```jsonc
{
  "ok": true,
  "formId": "MR 1135",
  "hasMapping": false,
  "verificationStatus": "MISSING",
  "requiredDoctorFields": [],
  "requiredPatientFields": [],
  "requiredAnesthesiaFields": [],
  "acroForm": null
}
```

### After

All registered aliases now return the same canonical readiness, including the
verified AcroForm manifest state:

```jsonc
{
  "ok": true,
  "formId": "imc-approved-amputation",
  "slug": "amputation",
  "hasMapping": true,
  "verificationStatus": "VERIFIED",
  "requiredDoctorFields": [...],       // 15 fields: 13 physician + 2 interpreter decision fields
  "requiredPatientFields": [...],      // 2 fields
  "requiredAnesthesiaFields": [...],   // 2 fields with requiredWhen
  "interpreterApplicable": true,
  "substituteDecisionMakerApplicable": true,
  "witnessApplicable": true,
  "acroForm": {
    "canonicalTemplateIdentity": {
      "formId": "imc-approved-amputation",
      "slug": "amputation",
      "titleEn": "Amputation",
      "templateCode": "IMC MR 1135",
      "layoutFamily": "IMC_MR_1135_ACROFORM"
    },
    "manifestState": {
      "present": true,
      "hashMatches": true,
      "hash": "...",
      "status": "READY",
      "blockers": []
    },
    "semanticPhysicianFields": [...],
    "patientSignatureTargets": [...],
    "physicianSignatureTargets": [...],
    "interpreterApplicable": true,
    "anesthesiaApplicable": true,
    "educationRequired": true,
    "substituteDecisionMakerApplicable": true,
    "witnessApplicable": true
  }
}
```

## Readiness Before and After

### Before

- Physician fields: `0/0` or `N/A`
- Physician signature: `N/A`
- Patient signature mapped: `Blocked`
- Consent field mapping verified: `Blocked`
- Interpreter decision: not evaluated
- Anesthesia content: not evaluated against `requiredWhen`
- Send to Patient: blocked for the wrong reason (missing mapping)

### After

- Physician fields: `BLOCKED` with actual required count (15)
- Physician signature: `REQUIRED`
- Patient signature mapped: `COMPLETE`
- Consent field mapping verified: `COMPLETE` when hash is current
- Interpreter decision: `BLOCKED` while unanswered
- Anesthesia content: `REQUIRED` until applicability is selected; when
  applicable, the anesthesia text fields must also be completed
- Bilingual clinical data: `BLOCKED` when Arabic counterparts are missing
- Preview reviewed: remains `REQUIRED`
- Send to Patient: blocked until all authoritative gates are complete

## Focused Test Results

```text
✔ getAcroFormTemplateDiagnostics reports READY for verified amputation manifest
✔ resolveCanonicalAcroFormTemplateId resolves manifest id/slug/template code
✔ all supported aliases resolve deterministically
✔ unrelated IDs do not resolve
✔ buildAcroFormReadinessAdapter exposes canonical identity, READY manifest, semantic fields, signature targets, applicability flags
✔ mergeAcroFormReadinessIntoFieldMappingReadiness replaces alias with canonical MR1135 identity and fields
✔ initial MR1135 readiness reports required physician fields, not 0/0
✔ physician fields are BLOCKED, not N/A
✔ physician signature is REQUIRED, not N/A
✔ patient signature mapping is COMPLETE
✔ incomplete bilingual clinical data blocks readiness
✔ unanswered interpreter decision blocks readiness
✔ completed synthetic values update the field count correctly
✔ preview reviewed remains required
✔ readiness can reach 100 percent only after all current evidence
✔ adenotonsillectomy MR1168 behavior is unchanged
```

## Full Web Test Suite Results

```text
ℹ tests 473
ℹ pass 470
ℹ fail 3
```

The only failures are the three pre-existing acceptable failures listed in the
task:

- `demo-account-access`
- `modules-catalog-routing`
- `package1-idempotency partial unique-index assertion`

No new full-suite failures were introduced.

## Build / Lint / Prisma / Diff Results

- `npm run build` — passed (production build with safe local placeholder
  `DATABASE_URL=postgresql://localhost:5432/wathiqcare`; SQL migrations skipped
  automatically because URL is localhost).
- `npx tsc --noEmit` — zero errors in touched files; pre-existing errors remain
  in unrelated files.
- `npx eslint --max-warnings 0` on touched files — zero errors, zero warnings.
- `npx prisma validate --schema=./prisma/schema.prisma` — valid.
- `git diff --check` — no whitespace errors (only LF/CRLF autocrlf warnings).
- Working tree — clean except for the intended correction files and this report.

## MR1168 Confirmation

- `adenotonsillectomy` mapping resolution is unchanged.
- `IMC MR 1168` witness-policy tests and profile tests still pass.
- No adenotonsillectomy fields, aliases, or manifest state were modified.

## Anonymous Authorization Boundary Confirmation

- The field-mapping route still calls `requireModuleOperationalAccess` before
  any mapping or adapter logic.
- No anonymous access was added; no auth checks were removed or weakened.
- All existing anonymous-request tests still pass.

## Data and Environment Confirmation

- No real patient data, contacts, or signatures were used.
- No external provider, remote database, push, or deployment was performed.
- All tests and validation used synthetic fixtures and a safe local placeholder
  database URL.

## Remaining Preview Verification Step

After this commit, the physician-facing Preview should be manually verified by
selecting the amputation procedure and confirming:

1. The approved five-page PDF renders.
2. The doctor-completion panel lists 15 required fields (clinical bilingual
   fields, physician name/designation, interpreter decisions, and physician
   signature).
3. Completing all 15 fields plus the physician signature clears the physician
   fields gate.
4. Selecting anesthesia applicability and completing anesthesia content when
   applicable clears the anesthesia gate.
5. Marking Preview Reviewed clears the preview gate.
6. Send to Patient remains blocked until all gates are satisfied and becomes
   eligible only at 100% readiness.
