/**
 * Legal-Grade Consent — Specialty Demo Presets
 *
 * UAT-only sample payloads for the internal preview surface. No real PHI.
 * Used by the preview API when `?demo=<id>` is requested.
 *
 * NOTE: These presets do NOT affect the production consent workflow.
 * They are loaded only by the preview route behind the feature flag.
 */

import type {
  DynamicConsentLanguage,
  DynamicConsentPayload,
} from "@/modules/consent-engine/engine/types";

export type SpecialtyDemoId =
  | "cardiology"
  | "general-surgery"
  | "orthopedics"
  | "anesthesia"
  | "dama"
  | "blood-transfusion"
  | "radiology";

export interface SpecialtyDemo {
  id: SpecialtyDemoId;
  labelEn: string;
  labelAr: string;
  description: string;
  payload: DynamicConsentPayload;
}

const COMMON_PATIENT = {
  name: "نجيب الفلاح",
  identifier: "IMC-2026-02000",
  role: "Patient",
} as const;

function buildBase(
  overrides: Partial<DynamicConsentPayload>,
  language: DynamicConsentLanguage = "bilingual",
): DynamicConsentPayload {
  const base: DynamicConsentPayload = {
    patient: { ...COMMON_PATIENT },
    encounter: {
      encounterNumber: "ENC-UAT-2026-0001",
      caseNumber: "CASE-2026-0001",
      specialty: "CARDIOLOGY",
      diagnosis: "Pre-operative informed consent assessment",
      plannedProcedure: "Diagnostic procedure",
      department: "General",
    },
    physician: {
      name: "Dr. Ahmed Al-Salmi",
      identifier: "LIC-ALH-001",
      role: "Consultant",
    },
    diagnosis: "Pre-operative informed consent assessment",
    procedure: "Diagnostic procedure",
    specialty: "CARDIOLOGY",
    language,
    anesthesia: {
      required: false,
    },
    risks: [],
    alternatives: [],
    legalStatements: [],
    signatures: {
      patientRequired: true,
      physicianRequired: true,
      interpreterRequired: false,
      witnessRequired: false,
    },
  };
  return {
    ...base,
    ...overrides,
    patient: { ...base.patient, ...(overrides.patient ?? {}) },
    encounter: { ...base.encounter, ...(overrides.encounter ?? {}) },
    physician: { ...base.physician, ...(overrides.physician ?? {}) },
    signatures: { ...base.signatures, ...(overrides.signatures ?? {}) },
    anesthesia: {
      ...(base.anesthesia ?? {}),
      ...(overrides.anesthesia ?? {}),
      required: overrides.anesthesia?.required ?? base.anesthesia?.required ?? false,
    },
  };
}

export const SPECIALTY_DEMOS: Record<SpecialtyDemoId, SpecialtyDemo> = {
  cardiology: {
    id: "cardiology",
    labelEn: "Cardiology — Cardiac Catheterization",
    labelAr: "أمراض القلب — قسطرة قلبية",
    description: "Diagnostic cardiac catheterization with conscious sedation.",
    payload: buildBase({
      specialty: "CARDIOLOGY",
      diagnosis: "Suspected coronary artery disease with positive stress test",
      procedure: "Diagnostic cardiac catheterization with possible PCI",
      encounter: {
        encounterNumber: "ENC-UAT-CARD-0001",
        caseNumber: "CASE-2026-CARD-001",
        specialty: "CARDIOLOGY",
        diagnosis: "Suspected coronary artery disease with positive stress test",
        plannedProcedure: "Diagnostic cardiac catheterization with possible PCI",
        department: "Cardiology",
      },
      physician: {
        name: "Dr. Ahmed Al-Salmi",
        identifier: "LIC-ALH-001",
        role: "Interventional Cardiologist",
      },
      anesthesia: {
        required: true,
        type: "Local with conscious sedation",
        notesEn: "Local anesthetic at the access site with light conscious sedation.",
        notesAr: "تخدير موضعي في موقع الإدخال مع تهدئة خفيفة واعية.",
      },
    }),
  },

  "general-surgery": {
    id: "general-surgery",
    labelEn: "General Surgery — Laparoscopic Cholecystectomy",
    labelAr: "جراحة عامة — استئصال المرارة بالمنظار",
    description: "Elective laparoscopic gallbladder removal under general anesthesia.",
    payload: buildBase({
      specialty: "GENERAL_SURGERY",
      diagnosis: "Symptomatic cholelithiasis",
      procedure: "Laparoscopic cholecystectomy",
      encounter: {
        encounterNumber: "ENC-UAT-GS-0001",
        caseNumber: "CASE-2026-GS-001",
        specialty: "GENERAL_SURGERY",
        diagnosis: "Symptomatic cholelithiasis",
        plannedProcedure: "Laparoscopic cholecystectomy",
        department: "General Surgery",
      },
      physician: {
        name: "Dr. Maha Al-Rashid",
        identifier: "LIC-ALH-014",
        role: "Consultant General Surgeon",
      },
      anesthesia: {
        required: true,
        type: "General anesthesia",
        notesEn: "General endotracheal anesthesia administered by the anesthesia team.",
        notesAr: "تخدير عام عن طريق الأنبوب الرغامي يديره فريق التخدير.",
      },
      signatures: { patientRequired: true, physicianRequired: true, witnessRequired: true },
    }),
  },

  orthopedics: {
    id: "orthopedics",
    labelEn: "Orthopedics — Total Knee Arthroplasty",
    labelAr: "جراحة العظام — استبدال كامل لمفصل الركبة",
    description: "Elective total knee replacement for advanced osteoarthritis.",
    payload: buildBase({
      specialty: "ORTHOPEDICS",
      diagnosis: "End-stage osteoarthritis of the right knee",
      procedure: "Right total knee arthroplasty",
      encounter: {
        encounterNumber: "ENC-UAT-ORTHO-0001",
        caseNumber: "CASE-2026-ORTHO-001",
        specialty: "ORTHOPEDICS",
        diagnosis: "End-stage osteoarthritis of the right knee",
        plannedProcedure: "Right total knee arthroplasty",
        department: "Orthopedics",
      },
      physician: {
        name: "Dr. Tariq Al-Mansouri",
        identifier: "LIC-ALH-022",
        role: "Consultant Orthopedic Surgeon",
      },
      anesthesia: {
        required: true,
        type: "Spinal anesthesia with adjunct sedation",
        notesEn: "Neuraxial spinal block with optional light sedation.",
        notesAr: "تخدير نخاعي مع إمكانية تهدئة خفيفة مساندة.",
      },
      signatures: { patientRequired: true, physicianRequired: true, witnessRequired: true },
    }),
  },

  anesthesia: {
    id: "anesthesia",
    labelEn: "Anesthesia — Separate Anesthesia Consent",
    labelAr: "التخدير — موافقة التخدير المنفصلة",
    description: "Dedicated anesthesia evaluation and consent.",
    payload: buildBase({
      specialty: "ANESTHESIA",
      diagnosis: "Pre-operative anesthesia evaluation",
      procedure: "General anesthesia for planned surgical procedure",
      encounter: {
        encounterNumber: "ENC-UAT-ANES-0001",
        caseNumber: "CASE-2026-ANES-001",
        specialty: "ANESTHESIA",
        diagnosis: "Pre-operative anesthesia evaluation",
        plannedProcedure: "General anesthesia",
        department: "Anesthesia",
      },
      physician: {
        name: "Dr. Layla Al-Hashemi",
        identifier: "LIC-ALH-031",
        role: "Consultant Anesthesiologist",
      },
      anesthesia: {
        required: true,
        type: "General endotracheal anesthesia",
        notesEn: "Comprehensive anesthesia plan with airway management and intraoperative monitoring.",
        notesAr: "خطة تخدير شاملة تتضمن إدارة المجرى الهوائي والمراقبة أثناء العملية.",
      },
    }),
  },

  dama: {
    id: "dama",
    labelEn: "DAMA — Discharge Against Medical Advice",
    labelAr: "الخروج خلافاً للنصيحة الطبية",
    description: "Patient electing discharge against medical recommendation.",
    payload: buildBase({
      specialty: "DAMA",
      diagnosis: "Acute condition requiring continued inpatient care",
      procedure: "Discharge against medical advice (DAMA)",
      encounter: {
        encounterNumber: "ENC-UAT-DAMA-0001",
        caseNumber: "CASE-2026-DAMA-001",
        specialty: "DAMA",
        diagnosis: "Acute condition requiring continued inpatient care",
        plannedProcedure: "Discharge against medical advice (DAMA)",
        department: "Internal Medicine",
      },
      physician: {
        name: "Dr. Omar Al-Sabah",
        identifier: "LIC-ALH-045",
        role: "Attending Physician",
      },
      signatures: {
        patientRequired: true,
        physicianRequired: true,
        witnessRequired: true,
      },
    }),
  },

  "blood-transfusion": {
    id: "blood-transfusion",
    labelEn: "Blood Transfusion — Packed Red Cells",
    labelAr: "نقل الدم — كريات حمراء مركّزة",
    description: "Transfusion of allogeneic packed red blood cells.",
    payload: buildBase({
      specialty: "TRANSFUSION_MEDICINE",
      diagnosis: "Symptomatic anemia requiring transfusion",
      procedure: "Transfusion of packed red blood cells",
      encounter: {
        encounterNumber: "ENC-UAT-TRX-0001",
        caseNumber: "CASE-2026-TRX-001",
        specialty: "TRANSFUSION_MEDICINE",
        diagnosis: "Symptomatic anemia requiring transfusion",
        plannedProcedure: "Transfusion of packed red blood cells",
        department: "Hematology",
      },
      physician: {
        name: "Dr. Hanan Al-Najjar",
        identifier: "LIC-ALH-058",
        role: "Consultant Hematologist",
      },
      signatures: { patientRequired: true, physicianRequired: true, witnessRequired: true },
    }),
  },

  radiology: {
    id: "radiology",
    labelEn: "Radiology — Contrast-Enhanced CT / Interventional Imaging",
    labelAr: "الأشعة — التصوير المقطعي بالصبغة / الأشعة التداخلية",
    description:
      "IMC Radiology & Interventional Imaging informed consent (preview, UAT sample only).",
    payload: buildBase({
      specialty: "RADIOLOGY",
      diagnosis:
        "Diagnostic / interventional imaging indication — UAT sample",
      procedure:
        "Contrast-Enhanced CT / Interventional Imaging Procedure",
      encounter: {
        encounterNumber: "ENC-UAT-2026-0001",
        caseNumber: "CASE-2026-0001",
        specialty: "RADIOLOGY",
        diagnosis:
          "Diagnostic / interventional imaging indication — UAT sample",
        plannedProcedure:
          "Contrast-Enhanced CT / Interventional Imaging Procedure",
        department: "Radiology",
      },
      physician: {
        name: "Dr. Ahmed Al-Salmi",
        identifier: "LIC-ALH-001",
        role: "Consultant Radiologist",
      },
      anesthesia: {
        required: true,
        type: "Conscious sedation (when indicated)",
        notesEn:
          "Optional conscious sedation administered per procedural need with continuous monitoring.",
        notesAr:
          "تهدئة واعية اختيارية تُعطى عند الحاجة الإجرائية مع مراقبة مستمرة.",
      },
      signatures: {
        patientRequired: true,
        physicianRequired: true,
        witnessRequired: true,
      },
    }),
  },
};

export function listSpecialtyDemos(): SpecialtyDemo[] {
  return Object.values(SPECIALTY_DEMOS);
}

export function getSpecialtyDemo(id: string): SpecialtyDemo | null {
  if (id in SPECIALTY_DEMOS) {
    return SPECIALTY_DEMOS[id as SpecialtyDemoId];
  }
  return null;
}
