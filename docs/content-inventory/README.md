# Phase 42 — Clinical Content Inventory

## Objective
Transform the uploaded approved forms into a structured clinical content library by separating **Informed Consent Forms** from **Patient Education Materials** and building a **Procedure-to-Content Mapping Matrix**.

## Source Data
The actual PDF binaries are excluded from the repository by `.gitignore` (`*.pdf`). The analysis is therefore based on the most comprehensive metadata manifest available:

- **File:** `apps/web/src/components/informed-consents/enterprise-workflow/imcApprovedConsentLibrary.generated.ts`
- **Description:** Auto-generated draft manifest from uploaded IMC approved PDF library ZIPs.
- **Contents:**
  - **243 distinct procedures**
  - **243 hospital (consent) PDF references**
  - **145 patient-education PDF references**
  - **388 total content file references**

> **Note on the "407 uploaded forms" target:** No file in the repository contains a literal count of 407. The closest tracked corpus is the manifest above (388 PDF references across 243 procedures). The original upload may have contained ~407 PDF files before de-duplication/consolidation, or additional files may reside in external storage (S3/CDN/Vercel Blob). The outputs below cover the full tracked corpus.

## Generated Outputs

| File | Description |
|------|-------------|
| `master-inventory.json` | Every content file (consent + education) with procedure, specialty, category, language, and version. |
| `consent-forms.json` | Only Informed Consent Forms (hospital PDFs). |
| `education-materials.json` | Only Patient Education Materials (patient-copy PDFs). |
| `procedure-mapping-matrix.json` | One row per procedure with linked consent form(s), education material(s), specialty, language, version, and completeness. |
| `procedure-to-content-catalog.md` | Human-readable catalog table: Procedure × Specialty × Consent Form × Education Material × Language × Version. |
| `coverage-statistics.md` | Coverage stats, specialty/category/language breakdowns, and data-quality flags. |

## Coverage Summary

| Metric | Count |
|--------|-------|
| Total procedures | 243 |
| Consent forms | 243 |
| Education materials | 145 |
| Total content files referenced | 388 |
| Procedures with both consent + education | 145 (59.7%) |
| Procedures with consent only | 98 (40.3%) |
| Procedures with education only | 0 (0.0%) |
| Procedures missing both | 0 (0.0%) |
| Procedures requiring anesthesia | 90 |
| Data-quality flag: same file used as both consent + education | 16 |
| Data-quality flag: missing Arabic title (`titleAr`) | 243 |

## How to Regenerate

```bash
npx tsx scripts/content-inventory/analyze-uploaded-forms.ts
```

## Next Steps (Mapping Complete → UI Ready)

1. Resolve the 16 procedures where the same PDF is referenced as both consent and education.
2. Populate `titleAr` for all 243 procedures.
3. Add the remaining ~19 education materials to reach full 1:1 consent-to-education coverage if the business target is 407 content files.
4. Once the matrix is clean, proceed to import it into the production schema (`ConsentProcedureCatalog`, `ConsentProcedureRiskItem`, `ProcedureEducationAsset`, etc.).
