import type { ProcedureMappingV2 } from "./types";

/**
 * Procedure Mapping Engine V2 — static mapping matrix.
 *
 * Maps procedures (by specialty/department) to recommended consent templates,
 * risk levels, anesthesia implications, mandatory disclosures, education assets,
 * and refusal consequences.
 *
 * In a hardened implementation this would be driven by:
 *   - ConsentProcedureCatalog
 *   - ConsentProcedureRiskItem
 *   - ConsentProcedureAlternative / ConsentProcedureRefusalConsequence
 *   - ProcedureEducationAsset
 * For the 24-hour prototype we use a curated static matrix to validate the UX.
 */

export const PROCEDURE_MAPPINGS_V2: ProcedureMappingV2[] = [
  {
    id: "MAP-001",
    specialty: "GENERAL_SURGERY",
    department: "General Surgery",
    procedureCode: "CPT-44970",
    procedureNameEn: "Laparoscopic Appendectomy",
    procedureNameAr: "استئصال الزائدة بالمنظار",
    categoryCode: "SURGICAL",
    recommendedTemplateIds: ["V2-TPL-002", "V2-TPL-005"],
    anesthesiaImplication: "GENERAL",
    riskLevel: "HIGH",
    mandatoryDisclosures: [
      "Bleeding requiring transfusion",
      "Infection and abscess formation",
      "Injury to bowel or bladder",
      "Conversion to open surgery",
    ],
    educationAssetIds: ["EDU-001", "EDU-002"],
    commonAlternatives: [
      "Antibiotic-only management",
      "Open appendectomy",
      "Interval appendectomy",
    ],
    refusalConsequences: [
      "Risk of perforation and peritonitis",
      "Sepsis and prolonged hospitalization",
      "Death in severe untreated cases",
    ],
  },
  {
    id: "MAP-002",
    specialty: "ORTHOPEDICS",
    department: "Orthopedic Surgery",
    procedureCode: "CPT-27447",
    procedureNameEn: "Total Knee Arthroplasty",
    procedureNameAr: "استبدال مفصل الركبة الكلي",
    categoryCode: "SURGICAL",
    recommendedTemplateIds: ["V2-TPL-003", "V2-TPL-005"],
    anesthesiaImplication: "REGIONAL",
    riskLevel: "HIGH",
    mandatoryDisclosures: [
      "Prosthetic joint infection",
      "Deep vein thrombosis / pulmonary embolism",
      "Nerve or vascular injury",
      "Implant loosening or failure",
    ],
    educationAssetIds: ["EDU-001"],
    commonAlternatives: [
      "Conservative physiotherapy",
      "Unicompartmental knee replacement",
      "Osteotomy",
    ],
    refusalConsequences: [
      "Progressive joint degeneration",
      "Chronic pain and mobility loss",
      "Need for more complex revision later",
    ],
  },
  {
    id: "MAP-003",
    specialty: "CARDIOTHORACIC_SURGERY",
    department: "Cardiac Surgery",
    procedureCode: "CPT-33533",
    procedureNameEn: "Coronary Artery Bypass Grafting (CABG)",
    procedureNameAr: "جراحة تحويل مسار الشريان التاجي",
    categoryCode: "SURGICAL",
    recommendedTemplateIds: ["V2-TPL-004", "V2-TPL-005", "V2-TPL-006"],
    anesthesiaImplication: "GENERAL",
    riskLevel: "CRITICAL",
    mandatoryDisclosures: [
      "Stroke or neurological injury",
      "Myocardial infarction",
      "Cardiac arrhythmia requiring pacemaker",
      "Bleeding and transfusion",
      "Prolonged ICU stay",
      "Death",
    ],
    educationAssetIds: ["EDU-008", "EDU-003"],
    commonAlternatives: [
      "Percutaneous coronary intervention (PCI)",
      "Medical management",
      "Minimally invasive CABG",
    ],
    refusalConsequences: [
      "Progressive heart failure",
      "Life-threatening arrhythmia",
      "Death from untreated coronary disease",
    ],
  },
  {
    id: "MAP-004",
    specialty: "ANESTHESIOLOGY",
    department: "Anesthesia",
    procedureCode: "CPT-00740",
    procedureNameEn: "General Anesthesia for Upper Endoscopy",
    procedureNameAr: "التخدير العام للتنظير العلوي",
    categoryCode: "ANESTHESIA",
    recommendedTemplateIds: ["V2-TPL-005"],
    anesthesiaImplication: "GENERAL",
    riskLevel: "HIGH",
    mandatoryDisclosures: [
      "Dental or airway injury",
      "Aspiration",
      "Allergic reaction",
      "Awareness under anesthesia",
    ],
    educationAssetIds: ["EDU-002"],
    commonAlternatives: [
      "Moderate sedation",
      "Topical anesthesia",
      "No sedation (if appropriate)",
    ],
    refusalConsequences: [
      "Procedure cannot be performed safely",
      "Need for alternative diagnostic pathway",
    ],
  },
  {
    id: "MAP-005",
    specialty: "GASTROENTEROLOGY",
    department: "Endoscopy",
    procedureCode: "CPT-43239",
    procedureNameEn: "Upper GI Endoscopy with Biopsy",
    procedureNameAr: "تنظير الجهاز الهضمي العلوي مع أخذ عينة",
    categoryCode: "SEDATION",
    recommendedTemplateIds: ["V2-TPL-008"],
    anesthesiaImplication: "SEDATION",
    riskLevel: "HIGH",
    mandatoryDisclosures: [
      "Perforation",
      "Bleeding from biopsy site",
      "Sedation-related respiratory depression",
    ],
    educationAssetIds: ["EDU-007"],
    commonAlternatives: [
      "Capsule endoscopy",
      "Imaging study",
      "Surveillance vs diagnostic timing",
    ],
    refusalConsequences: [
      "Delayed diagnosis",
      "Missed malignancy or bleeding source",
    ],
  },
  {
    id: "MAP-006",
    specialty: "HEMATOLOGY",
    department: "Hematology",
    procedureCode: "CPT-36430",
    procedureNameEn: "Packed Red Blood Cell Transfusion",
    procedureNameAr: "نقل كريات الدم الحمراء المركزة",
    categoryCode: "BLOOD_TRANSFUSION",
    recommendedTemplateIds: ["V2-TPL-006"],
    anesthesiaImplication: "NONE",
    riskLevel: "HIGH",
    mandatoryDisclosures: [
      "Febrile or allergic transfusion reaction",
      "Hemolytic reaction",
      "Infection despite screening",
      "Fluid overload",
    ],
    educationAssetIds: ["EDU-003"],
    commonAlternatives: [
      "Iron supplementation",
      "Erythropoietin",
      "Observation if hemodynamically stable",
    ],
    refusalConsequences: [
      "Worsening anemia",
      "Ischemic end-organ injury",
      "Death in critical bleeding",
    ],
  },
  {
    id: "MAP-007",
    specialty: "CRITICAL_CARE",
    department: "Critical Care",
    procedureCode: "CPT-93503",
    procedureNameEn: "Central Venous Catheter Insertion",
    procedureNameAr: "إدراج قسطار وريدي مركزي",
    categoryCode: "HIGH_RISK",
    recommendedTemplateIds: ["V2-TPL-007"],
    anesthesiaImplication: "LOCAL",
    riskLevel: "CRITICAL",
    mandatoryDisclosures: [
      "Pneumothorax",
      "Arterial puncture",
      "Catheter-related bloodstream infection",
      "Air embolism",
    ],
    educationAssetIds: ["EDU-001"],
    commonAlternatives: [
      "Peripheral IV access",
      "PICC line",
      "Ultrasound-guided access",
    ],
    refusalConsequences: [
      "Inability to administer critical medications",
      "Hemodynamic monitoring failure",
    ],
  },
  {
    id: "MAP-008",
    specialty: "EMERGENCY_MEDICINE",
    department: "Emergency",
    procedureCode: "DAMA-001",
    procedureNameEn: "Discharge Against Medical Advice",
    procedureNameAr: "خروج ضد النصيحة الطبية",
    categoryCode: "DAMA",
    recommendedTemplateIds: ["V2-TPL-009"],
    anesthesiaImplication: "NONE",
    riskLevel: "CRITICAL",
    mandatoryDisclosures: [
      "Recommended treatment and rationale",
      "Specific risks of leaving",
      "Return precautions",
      "Capacity assessment documented",
    ],
    educationAssetIds: ["EDU-006"],
    commonAlternatives: [
      "Stay for observation",
      "Accept recommended treatment plan",
      "Request risk discussion with senior physician",
    ],
    refusalConsequences: [
      "Deterioration without monitoring",
      "Missed diagnosis",
      "Death or permanent disability",
    ],
  },
  {
    id: "MAP-009",
    specialty: "RADIOLOGY",
    department: "Radiology",
    procedureCode: "CPT-74177",
    procedureNameEn: "CT Abdomen/Pelvis with IV Contrast",
    procedureNameAr: "أشعة مقطعية للبطن/الحوض بالصبغة الوريدية",
    categoryCode: "RADIOLOGY_CONTRAST",
    recommendedTemplateIds: ["V2-TPL-010"],
    anesthesiaImplication: "NONE",
    riskLevel: "MEDIUM",
    mandatoryDisclosures: [
      "Iodinated contrast allergy",
      "Contrast-induced nephropathy",
      "Radiation exposure",
    ],
    educationAssetIds: ["EDU-004"],
    commonAlternatives: [
      "Non-contrast CT",
      "MRI without gadolinium",
      "Ultrasound",
    ],
    refusalConsequences: [
      "Delayed or missed diagnosis",
      "Need for additional studies later",
    ],
  },
  {
    id: "MAP-010",
    specialty: "TELEMEDICINE",
    department: "Telemedicine",
    procedureCode: "TM-001",
    procedureNameEn: "Telemedicine Follow-up Consultation",
    procedureNameAr: "استشارة المتابعة عن بُعد",
    categoryCode: "TELEMEDICINE",
    recommendedTemplateIds: ["V2-TPL-011"],
    anesthesiaImplication: "NONE",
    riskLevel: "LOW",
    mandatoryDisclosures: [
      "Limitations of remote examination",
      "Technology and privacy risks",
      "When to seek in-person care",
    ],
    educationAssetIds: ["EDU-005"],
    commonAlternatives: [
      "In-person clinic visit",
      "Phone consultation without video",
    ],
    refusalConsequences: [
      "Delayed reassessment",
      "Missed clinical deterioration",
    ],
  },
];

export function getMappingById(id: string): ProcedureMappingV2 | undefined {
  return PROCEDURE_MAPPINGS_V2.find((m) => m.id === id);
}

export function getMappingsByCategory(code: string): ProcedureMappingV2[] {
  return PROCEDURE_MAPPINGS_V2.filter((m) => m.categoryCode === code);
}

export function getMappingsBySpecialty(specialty: string): ProcedureMappingV2[] {
  return PROCEDURE_MAPPINGS_V2.filter((m) => m.specialty === specialty);
}

export function getProcedureSpecialties(): string[] {
  return Array.from(new Set(PROCEDURE_MAPPINGS_V2.map((m) => m.specialty))).sort();
}

export function getProcedureDepartments(): string[] {
  return Array.from(new Set(PROCEDURE_MAPPINGS_V2.map((m) => m.department))).sort();
}
