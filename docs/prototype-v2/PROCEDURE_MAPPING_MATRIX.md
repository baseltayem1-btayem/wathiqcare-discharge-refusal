# Procedure Mapping Matrix

## Overview
The Procedure Mapping Engine V2 links clinical procedures to the consent forms, risk disclosures, alternatives, refusal consequences, and patient education assets required for valid informed consent.

## Mapping Structure

Each mapping row contains:

| Field | Description |
|-------|-------------|
| `specialty` | Clinical specialty performing the procedure. |
| `department` | Department where the procedure is performed. |
| `procedureCode` | Procedure identifier (CPT or internal). |
| `procedureNameEn` / `procedureNameAr` | Bilingual procedure name. |
| `categoryCode` | Consent category from the form taxonomy. |
| `recommendedTemplateIds` | Consent template(s) recommended for this procedure. |
| `anesthesiaImplication` | Expected anesthesia modality. |
| `riskLevel` | Aggregate risk level of the procedure. |
| `mandatoryDisclosures` | Risks that must be disclosed to the patient. |
| `educationAssetIds` | Linked patient education assets. |
| `commonAlternatives` | Standard alternatives to discuss. |
| `refusalConsequences` | Consequences of refusal to document. |

## Matrix

| ID | Specialty | Procedure | Category | Anesthesia | Risk | Forms |
|----|-----------|-----------|----------|------------|------|-------|
| MAP-001 | General Surgery | Laparoscopic Appendectomy | SURGICAL | General | HIGH | Surgical, Anesthesia |
| MAP-002 | Orthopedics | Total Knee Arthroplasty | SURGICAL | Regional | HIGH | Orthopedic Surgery, Anesthesia |
| MAP-003 | Cardiothoracic Surgery | Coronary Artery Bypass Grafting | SURGICAL | General | CRITICAL | Cardiac Surgery, Anesthesia, Blood Transfusion |
| MAP-004 | Anesthesiology | General Anesthesia for Upper Endoscopy | ANESTHESIA | General | HIGH | Anesthesia |
| MAP-005 | Gastroenterology | Upper GI Endoscopy with Biopsy | SEDATION | Sedation | HIGH | Procedural Sedation |
| MAP-006 | Hematology | Packed Red Blood Cell Transfusion | BLOOD_TRANSFUSION | None | HIGH | Blood Transfusion |
| MAP-007 | Critical Care | Central Venous Catheter Insertion | HIGH_RISK | Local | CRITICAL | High-Risk Procedure |
| MAP-008 | Emergency Medicine | Discharge Against Medical Advice | DAMA | None | CRITICAL | DAMA |
| MAP-009 | Radiology | CT Abdomen/Pelvis with IV Contrast | RADIOLOGY_CONTRAST | None | MEDIUM | CT Contrast |
| MAP-010 | Telemedicine | Telemedicine Follow-up Consultation | TELEMEDICINE | None | LOW | Telemedicine |

## Education Assets

| ID | Title | Kind | Duration |
|----|-------|------|----------|
| EDU-001 | What to expect before surgery | Video | 4 min |
| EDU-002 | Anesthesia types explained | Article | 6 min |
| EDU-003 | Blood transfusion risks and alternatives | PDF | 8 min |
| EDU-004 | Contrast dye allergy screening | Infographic | 3 min |
| EDU-005 | Your rights in telemedicine | Video | 5 min |
| EDU-006 | DAMA: understanding the risks | PDF | 7 min |
| EDU-007 | Sedation safety checklist | Infographic | 2 min |
| EDU-008 | Cardiac surgery recovery guide | Video | 9 min |

## Example: CABG Mapping Detail

**Procedure:** Coronary Artery Bypass Grafting (CABG)  
**Risk Level:** CRITICAL  
**Anesthesia:** General  
**Recommended Forms:**
- Cardiac Surgery Consent
- Anesthesia Consent
- Blood and Blood Products Transfusion Consent

**Mandatory Disclosures:**
- Stroke or neurological injury
- Myocardial infarction
- Cardiac arrhythmia requiring pacemaker
- Bleeding and transfusion
- Prolonged ICU stay
- Death

**Common Alternatives:**
- Percutaneous coronary intervention (PCI)
- Medical management
- Minimally invasive CABG

**Refusal Consequences:**
- Progressive heart failure
- Life-threatening arrhythmia
- Death from untreated coronary disease

**Education Assets:**
- Cardiac surgery recovery guide (video, 9 min)
- Blood transfusion risks and alternatives (PDF, 8 min)

## Source Files
- Type definitions: `apps/web/src/lib/prototype/types.ts`
- Data: `apps/web/src/lib/prototype/procedure-mapping-matrix.ts`
- UI: `apps/web/src/components/prototype/ProcedureMappingEngine/MappingMatrix.tsx`
