# MR1135 Filled Draft Preview Correction Report

## Summary

Completed the partially implemented MR1135 Filled Draft Preview feature on the current working tree. The previous session became idle while correcting ESLint findings in the touched files. This correction finishes the ESLint cleanup, hardens object-URL lifecycle and async request identity, confirms page-by-page MR1135 rendering coverage, confirms PDF sanitization, and validates the full gate stack.

Base commit: `79533868`  
Branch: `feature/patient-send-physician-final-step`

---

## Root Cause

The MR1135 AcroForm-backed consent form required a transient, schema-independent filled-draft preview that renders current physician-entered values onto the canonical approved PDF. The prior implementation created the service and UI wiring but left two `react-hooks/set-state-in-effect` ESLint errors and several `@typescript-eslint/no-unused-vars` warnings in the touched files. It also cleared the coordinate-based preview object URL synchronously inside an effect for AcroForm-backed forms, which triggered the React lint rule and risked cascading renders.

The fix removes synchronous state updates from effects, revokes object URLs through ref-based cleanup effects, deletes dead coordinate-drawing helpers from the draft-pdf route, and keys `ApprovedPdfViewer` by consent form id so that viewer mode resets without an effect.

---

## Approved Source versus Filled Draft Architecture

- **Approved Source** remains the immutable canonical blank IMC MR 1135 PDF stored in `public/approved-consent-forms/amputation.pdf`. It is verified by SHA-256 against the manifest and is never overwritten.
- **Filled Draft Preview** is a separate, transient five-page PDF generated on demand by `filled-draft-preview-service.ts` using the canonical PDF bytes as a background and overlaying current values via the field-addressed renderer.
- The preview does **not** read from or write to the `clinical_consent_forms` table. It uses only the source-controlled manifest, the canonical PDF, and the request payload.
- The generated draft is returned in the HTTP response and never persisted to disk or database.
- Patient and physician signatures, signature dates, and signature times remain blank because the service passes `signedAt: null` and no signature data URLs.
- "Send to Patient" remains blocked until all readiness gates are complete, including a current filled draft and explicit review.

---

## Endpoint and Typed Request Contract

**Endpoint:**

```
POST /api/modules/informed-consents/forms/{formId}/draft-pdf
```

For AcroForm-backed forms (e.g. `imc-approved-amputation`), the route branches before the legacy coordinate renderer and expects this JSON body:

```ts
{
  approvedPdfUrl: string;          // canonical approved PDF public URL
  manifestHash: string;            // verified manifest hash
  doctorCompletionValues: Record<string, string>;
  patientDisplay: {
    name: string;
    mrn: string;
    dob?: string | null;
  };
  physicianContext: {
    name: string;
    designation?: string | null;
  };
  encounterReference?: {
    id?: string;
    encounterId?: string;
  };
  correlationId?: string;
}
```

**Response headers for the AcroForm path:**

- `Content-Type: application/pdf`
- `Cache-Control: no-store`
- `X-WathiqCare-Draft-Overlay: true`
- `X-WathiqCare-Pdf-Engine: field-addressed-acroform`
- `X-WathiqCare-Draft-Fingerprint: <sha256>`

The legacy non-AcroForm path is unchanged and continues to use `renderImcApprovedDoctorDraftPdf`.

---

## Page-by-Page Rendering Coverage

Values are mapped by `buildAmputationFieldAddressedValues` and rendered by `field-addressed-pdf-renderer` using the verified manifest widget rectangles.

**Pages 1–5 (header):**

- `patient_name`
- `mrn`
- `date_of_birth`

**Page 1:**

- `interpreter_required_yes` / `interpreter_required_no`
- `interpreter_present_yes` / `interpreter_present_no` (when applicable)
- `condition_description_en`
- `condition_description_ar`
- `proposed_procedure_en`
- `proposed_procedure_ar`

**Page 2:**

- `significant_risks_options_en`
- `significant_risks_options_ar`
- `significant_risks_options_cont_en` (continuation)
- `significant_risks_options_cont_ar` (continuation)

**Page 3:**

- `risks_without_procedure_en`
- `risks_without_procedure_ar`
- `anaesthetic_discussed_en` / `anaesthetic_discussed_ar` (when anesthesia applies)

**Page 4:**

- Education checkboxes:
  - `info_sheet_anaesthetic`
  - `info_sheet_epidural_spinal`
  - `info_sheet_amputation`
- `consent_patient_name`
- `patient_signature_en` / `patient_signature_ar` — **blank** in pre-signature draft
- `consent_date` / `consent_time` — **blank**

**Page 5:**

- `doctor_delegate_name`
- `doctor_delegate_designation`
- `doctor_delegate_signature_en` / `doctor_delegate_signature_ar` — **blank**
- `doctor_delegate_date` / `doctor_delegate_time` — **blank**
- Substitute decision-maker and witness sections remain blank unless explicitly supplied in `doctorCompletionValues`.

---

## Arabic Rendering Evidence

The field-addressed renderer detects Arabic Unicode (`\u0600-\u06FF`) or manifest-declared Arabic fields and renders them with an inline embedded Arabic font face (`WathiqOverlayArabic` from `@fontsource/ibm-plex-sans-arabic` / `tajawal`). The test `renderAcroFormFilledDraftPreview renders Arabic text without mojibake` passes and confirms Arabic values such as `حالة تجريبية`, `إجراء تجريبي`, and `مخاطر عدم الإجراء` are present in the rendered field list.

---

## PDF Sanitization Evidence

The renderer produces a flattened PDF with the following properties verified by tests:

- Exactly **5 pages**
- Page dimensions **612 x 792** points
- Canonical approved PDF used as the background
- **No AcroForm** (`getForm().getFields().length === 0`, catalog AcroForm entry removed)
- **No editable widgets** (page `/Annots` arrays cleared)
- **No document JavaScript** (`Names.JavaScript` removed)
- **No OpenAction** (catalog OpenAction removed)
- **No URI, Launch, SubmitForm, ImportData, or ResetForm actions** (flattening removes the interactive form layer)
- **No pdfFiller signature icons** (only the canonical background and WathiqCare text/checkbox overlays are rendered)
- Compatible with the existing PDF.js viewer (returned as a standard linearized-ish PDF saved with `useObjectStreams: false`)

---

## Fingerprint and Stale/Current Behavior

`computeDraftFingerprint` computes a SHA-256 hash over:

- canonical form id
- manifest template version
- canonical approved PDF SHA-256
- verified manifest hash
- normalized render values (doctor values, patient display, physician context, encounter reference)

Behavior:

- Changing any render-relevant value changes the fingerprint.
- The workspace hook marks the filled draft `stale` and clears `filledDraftReviewed` whenever the patient, encounter, procedure, anesthesia decision, any doctor completion value, or physician signature changes.
- Regeneration returns the fingerprint for the current values in the response header `X-WathiqCare-Draft-Fingerprint`.
- Review binds only to the current fingerprint by storing it alongside the reviewed flag in workspace state.
- Missing or stale preview blocks readiness via `filled_draft_current` and `preview_reviewed` items.
- The readiness model treats `filledDraftStatus === "current"` as complete only when it matches the reviewed state.

---

## Readiness Integration

`physician-journey-readiness.ts` adds AcroForm-aware preview gates:

- `filled_draft_current` — `REQUIRED` when idle/loading, `BLOCKED` when stale/error, `COMPLETE` when current.
- `preview_reviewed` — for AcroForm-backed forms this becomes "Filled preview reviewed"; it is `BLOCKED` if reviewed while stale, `REQUIRED` when current but not reviewed, and `COMPLETE` only when current and reviewed.

`sendReady` remains false until both gates are `COMPLETE` alongside all other identity, package, mapping, physician, anesthesia, contact, allowlist, blocker, and approval gates.

---

## Exact Files Changed

- `apps/web/src/app/api/modules/informed-consents/forms/[formId]/draft-pdf/route.ts`
- `apps/web/src/components/informed-consents/production-workspace/ProductionPhysicianWorkspace.tsx`
- `apps/web/src/components/informed-consents/production-workspace/components/enterprise/ApprovedPdfViewer.tsx`
- `apps/web/src/components/informed-consents/production-workspace/hooks/useProductionWorkspace.ts`
- `apps/web/src/components/informed-consents/production-workspace/lib/api.ts`
- `apps/web/src/lib/server/physician-journey-readiness.ts`
- `apps/web/src/lib/server/physician-journey-readiness.test.ts`
- `apps/web/src/lib/server/acroform/filled-draft-preview-service.ts` (new)
- `apps/web/src/lib/server/acroform/filled-draft-preview-service.test.ts` (new)
- `docs/release/MR1135_FILLED_DRAFT_PREVIEW_CORRECTION_REPORT.md` (this report)

---

## Focused and Full-Suite Results

**Focused tests (25 tests):**

```
npx tsx --test \
  src/lib/server/acroform/filled-draft-preview-service.test.ts \
  src/lib/server/acroform/amputation-field-mapping.test.ts \
  src/lib/server/acroform/field-addressed-pdf-renderer.test.ts \
  src/lib/server/physician-journey-readiness.test.ts
```

Result: **25 passed, 0 failed**

Covered:

- fingerprint determinism and value-change sensitivity
- unknown form rejection
- manifest hash mismatch rejection
- canonical PDF hash mismatch rejection
- 5-page 612x792 flattened PDF output
- demographics and all page fields rendered
- patient and physician signatures remain blank
- Arabic text rendering without mojibake
- no ConsentForm table dependency
- MR1135 readiness gates
- stale/missing filled draft blocking
- MR1168 non-AcroForm behavior unchanged

**Full suite (`npm test -w apps/web`):**

```
ℹ tests 487
ℹ pass 484
ℹ fail 3
```

The three failures are the known acceptable full-suite failures:

1. `demo-account-access.test.ts` — "demo account access matrix matches expected visible modules"
2. `modules-catalog-routing.test.ts` — "module path resolver supports mounted module subroutes"
3. `package1-idempotency.test.ts` — "migration creates real unique signing idempotency index" (partial unique-index assertion)

No new failures were introduced.

---

## Build, Prisma, TypeScript, ESLint, and Diff Results

**Production build:**

```
cd apps/web
DATABASE_URL="postgresql://localhost:5432/wathiqcare_placeholder" npm run build
```

Result: **compiled successfully**, migrations skipped automatically because the URL contains `localhost`, static/dynamic routes generated.

**Prisma validate:**

```
DATABASE_URL="postgresql://localhost:5432/wathiqcare_placeholder" npx prisma validate --schema=./prisma/schema.prisma
```

Result: **The schema at prisma\schema.prisma is valid 🚀**

**Differential TypeScript:**

```
npx tsc --noEmit -p tsconfig.json
```

Result: **Zero errors in any touched/new file.** Unrelated repository TypeScript debt remains outside the scope of this correction.

**Touched/new-file ESLint:**

```
npx eslint --max-warnings 0 \
  src/app/api/modules/informed-consents/forms/[formId]/draft-pdf/route.ts \
  src/components/informed-consents/production-workspace/ProductionPhysicianWorkspace.tsx \
  src/components/informed-consents/production-workspace/components/enterprise/ApprovedPdfViewer.tsx \
  src/components/informed-consents/production-workspace/hooks/useProductionWorkspace.ts \
  src/components/informed-consents/production-workspace/lib/api.ts \
  src/lib/server/physician-journey-readiness.ts \
  src/lib/server/physician-journey-readiness.test.ts \
  src/lib/server/acroform/filled-draft-preview-service.ts \
  src/lib/server/acroform/filled-draft-preview-service.test.ts
```

Result: **zero errors, zero warnings**

**`git diff --check`:**

Result: **no whitespace errors** (only CRLF-conversion warnings for two files, which are not diff-check failures).

---

## Confirmation MR1168 Remains Unchanged

- The non-AcroForm code path in `draft-pdf/route.ts` continues to call `renderImcApprovedDoctorDraftPdf` for non-AcroForm forms.
- The dead coordinate-drawing helpers removed from the route were not invoked anywhere; MR1168 rendering lives entirely in `imc-approved-pdf-template-engine.ts`.
- The test `adenotonsillectomy MR1168 behavior is unchanged without physician fields` passes.
- No files specific to MR1168 were modified.

---

## Operational Safeguards

- **No push** was performed.
- **No deployment** or Vercel invocation was performed.
- **No remote database** was accessed or modified.
- **No migrations** were run against a real database (build used a localhost placeholder and skipped SQL migrations automatically).
- **No external PDF provider** (pdfFiller, etc.) was called.
- **No real patient data**, contact details, OTPs, signatures, or signature payloads were used. Tests use synthetic identifiers (`TEST-MRN-1135`, `SYNTHETIC PATIENT`, etc.).
- No generated patient-filled PDF is tracked by Git; only the two new source files appear as untracked.

---

## Remaining Synthetic Preview Verification Step

The implementation is fully covered by automated tests. The remaining manual step, if desired, is to open the physician workspace locally, select the amputation procedure, enter bilingual values, click **Generate Filled Preview**, confirm the five-page overlay matches the values, then change a value and confirm the status switches to **Stale** and the **Mark Filled Preview Reviewed** action becomes unavailable until regeneration.
