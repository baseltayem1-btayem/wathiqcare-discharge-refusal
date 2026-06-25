# Form Taxonomy V2

## Overview
The Approved Forms V2 taxonomy defines how consent templates are classified so physicians and administrators can discover, filter, and audit forms consistently.

## Hierarchy

```
Category
  └── Consent Type
        └── Specialty
              └── Department
                    └── Template
```

## Categories

| Code | English | Arabic | Risk Profile |
|------|---------|--------|--------------|
| GENERAL_TREATMENT | General Treatment Consent | الموافقة العامة على العلاج | Medium |
| SURGICAL | Surgical Procedure Consent | موافقة الإجراء الجراحي | High |
| ANESTHESIA | Anesthesia Consent | موافقة التخدير | High |
| BLOOD_TRANSFUSION | Blood Transfusion Consent | موافقة نقل الدم | High |
| HIGH_RISK | High-Risk Procedure Consent | موافقة الإجراءات عالية الخطورة | Critical |
| SEDATION | Procedural Sedation Consent | موافقة التهدئة الإجرائية | High |
| DAMA | Discharge Against Medical Advice | خروج ضد النصيحة الطبية | Critical |
| RADIOLOGY_CONTRAST | Radiology / Contrast Consent | موافقة الأشعة والصبغة | Medium |
| TELEMEDICINE | Telemedicine Consent | موافقة الطب عن بُعد | Low |
| MEDIA | Photography / Media Consent | موافقة التصوير والإعلام | Low |

## Consent Types

| Consent Type | Description |
|--------------|-------------|
| GENERAL_CONSENT | Broad consent for routine care and services. |
| SURGERY_CONSENT | Procedure-specific surgical consent. |
| ANESTHESIA_CONSENT | Anesthesia-specific consent. |
| BLOOD_TRANSFUSION_CONSENT | Blood and blood-product transfusion. |
| HIGH_RISK_PROCEDURE_CONSENT | Documented high-risk interventions. |
| SEDATION_CONSENT | Procedural sedation and analgesia. |
| DAMA_REFUSAL_OF_DISCHARGE | Refusal of recommended admission/treatment. |
| DIAGNOSTIC_IMAGING_CONSENT | Imaging with contrast or radiation. |
| TELEMEDICINE_CONSENT | Remote consultation consent. |
| PHOTOGRAPHY_MEDIA_CONSENT | Clinical photography and media use. |

## Risk Levels

| Level | Use |
|-------|-----|
| LOW | Minimal-risk informational consents (telemedicine, media). |
| MEDIUM | Routine diagnostic or general treatment consents. |
| HIGH | Surgical, anesthesia, transfusion, and sedation consents. |
| CRITICAL | DAMA, high-risk procedures, and life-sustaining interventions. |

## Requirements Matrix

| Category | Witness | Guardian | Interpreter | Separate Consent |
|----------|:-------:|:--------:|:-----------:|:----------------:|
| GENERAL_TREATMENT | No | No | No | Yes |
| SURGICAL | Yes | No | No | Yes |
| ANESTHESIA | Yes | No | No | Yes |
| BLOOD_TRANSFUSION | Yes | No | No | Yes |
| HIGH_RISK | Yes | No | No | Yes |
| SEDATION | No | No | No | Yes |
| DAMA | Yes | No | Yes | Yes |
| RADIOLOGY_CONTRAST | No | No | No | Yes |
| TELEMEDICINE | No | No | No | Yes |
| MEDIA | No | Yes | No | Yes |

## Template Statuses

| Status | Meaning |
|--------|---------|
| IMC_APPROVED | Approved by the medical staff committee. |
| PILOT_READY | Cleared for pilot use, pending final approval. |
| CLINICAL_REVIEW | Under clinical review. |
| LEGAL_REVIEW | Under legal/PDPL review. |
| DRAFT | Internal draft, not for clinical use. |

## V2 Template Catalog

| ID | Template Code | Title | Category | Risk | Status |
|----|---------------|-------|----------|------|--------|
| V2-TPL-001 | GENERAL_TREATMENT_CONSENT | General Treatment Consent | GENERAL_TREATMENT | MEDIUM | IMC_APPROVED |
| V2-TPL-002 | SURGICAL_PROCEDURE_CONSENT | Surgical Procedure Consent | SURGICAL | HIGH | IMC_APPROVED |
| V2-TPL-003 | ORTHOPEDIC_SURGERY_CONSENT | Orthopedic Surgery Consent | SURGICAL | HIGH | IMC_APPROVED |
| V2-TPL-004 | CARDIAC_SURGERY_CONSENT | Cardiac Surgery Consent | SURGICAL | CRITICAL | IMC_APPROVED |
| V2-TPL-005 | ANESTHESIA_CONSENT | Anesthesia Consent | ANESTHESIA | HIGH | IMC_APPROVED |
| V2-TPL-006 | BLOOD_AND_PRODUCTS_TRANSFUSION_CONSENT | Blood and Blood Products Transfusion Consent | BLOOD_TRANSFUSION | HIGH | IMC_APPROVED |
| V2-TPL-007 | HIGH_RISK_MEDICAL_PROCEDURE_CONSENT | High-Risk Medical Procedure Consent | HIGH_RISK | CRITICAL | PILOT_READY |
| V2-TPL-008 | PROCEDURAL_SEDATION_CONSENT | Procedural Sedation Consent | SEDATION | HIGH | IMC_APPROVED |
| V2-TPL-009 | DAMA_DISCHARGE_AGAINST_MEDICAL_ADVICE | Discharge Against Medical Advice | DAMA | CRITICAL | IMC_APPROVED |
| V2-TPL-010 | CT_CONTRAST_CONSENT | CT with IV Contrast Consent | RADIOLOGY_CONTRAST | MEDIUM | IMC_APPROVED |
| V2-TPL-011 | TELEMEDICINE_CONSENT | Telemedicine Consultation Consent | TELEMEDICINE | LOW | PILOT_READY |
| V2-TPL-012 | PHOTOGRAPHY_MEDIA_CONSENT | Clinical Photography and Media Consent | MEDIA | LOW | LEGAL_REVIEW |

## Source Files
- Type definitions: `apps/web/src/lib/prototype/types.ts`
- Data: `apps/web/src/lib/prototype/form-taxonomy.ts`
- UI: `apps/web/src/components/prototype/ApprovedFormsV2/ApprovedFormsLibrary.tsx`
