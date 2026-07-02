# Clinical Illustrations Registry — FigureLabs Workflow

This directory contains the production registry for patient-facing medical illustrations used in informed consent education.

## Files

- `procedure_illustration_registry.csv` — the master registry of every procedure in the Clinical Knowledge Engine, with a ready-to-paste FigureLabs prompt, file naming convention, and review status for each row.
- `batches/figurelabs_batch_01_priority_20.csv` — example priority batch for the first 20 clinically clear illustrations. Use additional batch files (`figurelabs_batch_02_*.csv`, etc.) to organize rollout.

## Purpose

The registry maps every seeded Clinical Knowledge Engine procedure to a planned FigureLabs educational illustration. It is the single source of truth for:

- Which procedures need illustrations.
- What each illustration should contain (the FigureLabs prompt).
- Where the exported PNG and authorization certificate must be stored.
- Whether the image is approved and patient-facing.

## Generating the registry

The registry is derived directly from the Clinical Knowledge Engine seed plan so it always matches the seeded procedure list.

```bash
cd apps/web
npx tsx scripts/generate-figurelabs-registry.ts
```

This overwrites `docs/clinical-illustrations/procedure_illustration_registry.csv`. Review the diff before committing.

## Naming convention

For a draft illustration:

```
<canonicalProcedureKey>_<illustrationType>_v1_draft.png
```

Example:

```
appendectomy_anatomy_procedure_education_v1_draft.png
```

For an approved illustration, replace `_draft` with `_approved`:

```
laparoscopic_cholecystectomy_anatomy_procedure_education_v1_approved.png
```

## Folder structure

Exported PNG files belong under the web public directory, grouped by specialty:

```
apps/web/public/educational/clinical-illustrations/<specialty-slug>/<canonicalProcedureKey>/<imageFileName>
```

Example:

```
apps/web/public/educational/clinical-illustrations/general-surgery/laparoscopic-cholecystectomy/laparoscopic_cholecystectomy_anatomy_procedure_education_v1_approved.png
```

Authorization certificates belong under documentation:

```
docs/clinical-illustrations/figurelabs/<canonicalProcedureKey>/<canonicalProcedureKey>_figurelabs_authorization_certificate_v1.pdf
```

## PNG export requirement

- Export a **clean, high-resolution PNG** from FigureLabs.
- Do **not** use screenshots or compressed exports.
- Ensure the image matches the prompt in the registry.
- Keep a white or very light background.
- Do not include patient-identifiable information, hospital logos, or watermarks.

## Authorization certificate storage

Each approved illustration must have a corresponding FigureLabs authorization certificate saved at the path defined in `certificatePath`. Certificates are required for medical governance and audit.

## Medical review workflow

1. A medical reviewer copies the `figureLabsPrompt` from the registry and submits it to FigureLabs.
2. FigureLabs returns a draft illustration.
3. The draft is reviewed by clinical governance for accuracy, non-graphic tone, and cultural appropriateness.
4. If approved, update the registry row:
   - `imageReviewStatus`: `approved`
   - `patientFacing`: `true`
   - `imageFileName`: replace `_draft` with `_approved`
   - Place the exported PNG at `imagePublicPath`.
   - Place the authorization certificate at `certificatePath`.
5. If rejected, leave the row as `draft` (or set `imageReviewStatus` to `rejected`) and do not display it to patients.

## How draft becomes approved

Only rows where `imageReviewStatus = approved` and `patientFacing = true` are eligible for patient display. The application filters out draft, pending, and rejected images at the service layer.

## Patient display enforcement

- The `illustration-service` returns only approved illustrations.
- `patientFacing` must be `true` for the image to appear in the patient workflow.
- Draft, pending, and rejected images are never returned to the patient UI.
- The bilingual disclaimer from `disclaimerEn` / `disclaimerAr` is rendered below every approved image.

## Registry columns

| Column | Meaning |
|---|---|
| `sequence` | Row number for ordering and reference. |
| `specialty` | Clinical specialty name in English. |
| `procedureNameEn` | Procedure name in English. |
| `procedureNameAr` | Procedure name in Arabic. |
| `canonicalProcedureKey` | URL/file safe slug derived from the English procedure name. |
| `aliases` | Pipe-separated synonyms used for procedure-name matching. |
| `anatomyRegion` | Anatomical region or procedural focus for the illustration. |
| `illustrationType` | `anatomy_procedure_education` or `process_education`. |
| `figureLabsPrompt` | Complete prompt to send to FigureLabs. |
| `imageFileName` | Expected exported PNG file name. |
| `imagePublicPath` | Target path in `apps/web/public/...`. |
| `certificatePath` | Target path for the authorization certificate. |
| `imageReviewStatus` | `draft`, `approved`, or `rejected`. |
| `patientFacing` | Whether the image may be shown to patients. |
| `source` | Image source — currently `FigureLabs`. |
| `version` | Illustration version — currently `v1`. |
| `disclaimerEn` | English patient disclaimer. |
| `disclaimerAr` | Arabic patient disclaimer. |
| `notes` | Internal status note. |

## Governance rules

- Do not include patient-identifiable information in prompts, file names, or illustrations.
- Do not use screenshots as source material.
- Do not display any image to patients until it is approved and marked `patientFacing = true`.
- Arabic procedure names in the registry are provided where reasonably clear; rows without a verified Arabic translation keep the English name and include a note for clinical review.
- Keep the registry committed and version-controlled so changes are auditable.
