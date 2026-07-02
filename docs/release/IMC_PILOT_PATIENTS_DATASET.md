# IMC Pilot Patients Dataset

**Status:** PILOT TEST DATA ONLY — NOT REAL PATIENT DATA  
**Source file:** `apps/web/src/components/informed-consents/production-workspace/lib/pilot-patients.ts`  
**Records:** 5  
**Feature flag:** `ENABLE_IMC_PILOT_PATIENTS` (default: false)  

## Purpose

This dataset provides synthetic HIS-like inpatient records for the WathiqCare Internal IMC Pilot. It is used to validate the informed-consent workflow end-to-end without touching production real patient data.

## Important safety rules

1. **Do not connect to real patient records** unless explicitly instructed.
2. **Do not use outside the pilot environment** unless approved.
3. **All records are clearly prefixed with "PILOT"** in the patient name.
4. **Exposure to the workspace is gated** by `ENABLE_IMC_PILOT_PATIENTS=true`.

## Record summary

| # | Pilot ID | Name | MRN | Procedure | Consultant |
|---|----------|------|-----|-----------|------------|
| 1 | IMC-PILOT-PT-001 | PILOT - Asma Matar Alzahrani | 100246781 | Laparoscopic Cholecystectomy | Dr. Suhaib Khayat |
| 2 | IMC-PILOT-PT-002 | PILOT - Mohammed Abdullah Alharbi | 100246782 | Right Inguinal Hernia Repair | Dr. Abdulaziz M. Saleem |
| 3 | IMC-PILOT-PT-003 | PILOT - Noura Ahmed Alghamdi | 100246783 | Thyroid Lobectomy | Dr. Abrar Youssef Nawawi |
| 4 | IMC-PILOT-PT-004 | PILOT - Khalid Saeed Alotaibi | 100246784 | Laparoscopic Appendectomy | Dr. Ahmad Jan Mohammed |
| 5 | IMC-PILOT-PT-005 | PILOT - Fatimah Ali Alqahtani | 100246785 | Excision of Breast Fibroadenoma | Dr. Bashaer S. Albayhani |

## Field coverage

Each record includes the full field schema required for pilot testing. Fields not provided in the source brief are left empty / null and marked as Pending where applicable.

## Artifacts

- `docs/release/IMC_PILOT_PATIENTS_DATASET.csv` — full dataset in CSV form.
- `apps/web/src/components/informed-consents/production-workspace/lib/pilot-patients.ts` — typed TypeScript source.

## Wiring

When `ENABLE_IMC_PILOT_PATIENTS=true` is set, the workspace patient search will include these records as a static pilot fallback. When the flag is false or unset, the records are not exposed through the API.
