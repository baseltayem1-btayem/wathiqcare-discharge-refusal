import type {
  DynamicConsentAlternativeItem,
  DynamicConsentBuildResult,
  DynamicConsentPayload,
  DynamicConsentRiskItem,
  DynamicConsentSection,
  DynamicConsentSectionKind,
  DynamicConsentTemplateDefinition,
  DynamicConsentTemplateSectionBlueprint,
} from "@/modules/consent-engine/engine/types";
import { buildDynamicConsentDocument } from "@/modules/consent-engine/builders/dynamic-consent-builder";
import { SURGERY_MEDICAL_PROCEDURE_CONSENT_TEMPLATE } from "@/modules/consent-engine/templates/surgery-medical-procedure-consent";

type LocalizedText = {
  en: string;
  ar: string;
};

type RawField = {
  id: string;
  type: string;
  required?: boolean;
  label?: LocalizedText;
};

type RawRiskBlock = {
  id: string;
  severity: "low" | "moderate" | "high" | "critical";
  en: string;
  ar: string;
};

type RawDeclaration = {
  id: string;
  en: string;
  ar: string;
};

type RawSection = {
  id: string;
  title: LocalizedText;
  body?: LocalizedText;
  fields?: readonly RawField[];
  riskBlocks?: readonly RawRiskBlock[];
  declarations?: readonly RawDeclaration[];
  declaration?: LocalizedText;
};

type RawTemplate = typeof SURGERY_MEDICAL_PROCEDURE_CONSENT_TEMPLATE;

function getRawTemplateSections(rawTemplate: RawTemplate): readonly RawSection[] {
  return rawTemplate.sections as readonly RawSection[];
}

function mapSectionKind(sectionId: string): DynamicConsentSectionKind {
  switch (sectionId) {
    case "intro":
      return "intro";
    case "condition-treatment":
      return "clinical-context";
    case "benefits":
      return "benefits";
    case "risks":
      return "risks";
    case "alternatives":
      return "alternatives";
    case "patient-consent":
      return "acknowledgment";
    case "physician-declaration":
      return "legal";
    case "patient-signature":
    case "substitute-decision-maker":
    case "translator":
    case "witnesses":
      return "signatures";
    default:
      return "legal";
  }
}

function mapSeverity(severity: RawRiskBlock["severity"]): DynamicConsentRiskItem["severity"] {
  if (severity === "moderate") {
    return "medium";
  }

  return severity;
}

function createFieldSummary(fields: readonly RawField[] | undefined, language: "en" | "ar"): string {
  if (!fields || fields.length === 0) {
    return "";
  }

  const labels = fields
    .map((field) => field.label?.[language]?.trim())
    .filter((value): value is string => Boolean(value));

  if (labels.length === 0) {
    return "";
  }

  return language === "en"
    ? ` Required fields: ${labels.join("; ")}.`
    : ` الحقول المطلوبة أو المتوقعة: ${labels.join("؛ ")}.`;
}

function mapRawSectionToBlueprint(section: RawSection, order: number): DynamicConsentTemplateSectionBlueprint {
  const bodyAr = `${section.body?.ar?.trim() || section.title.ar}${createFieldSummary(section.fields, "ar")}`.trim();
  const bodyEn = `${section.body?.en?.trim() || section.title.en}${createFieldSummary(section.fields, "en")}`.trim();

  return {
    id: section.id,
    key: section.id.replace(/-/g, "_"),
    kind: mapSectionKind(section.id),
    titleAr: section.title.ar,
    titleEn: section.title.en,
    bodyArTemplate: bodyAr,
    bodyEnTemplate: bodyEn,
    required: Boolean(section.fields?.some((field) => field.required) || section.declaration),
    layer: order <= 2 ? 1 : order <= 5 ? 2 : 3,
    order: (order + 1) * 10,
  };
}

function mapRiskBlocksToRisks(rawTemplate: RawTemplate): DynamicConsentRiskItem[] {
  const riskSection = getRawTemplateSections(rawTemplate).find((section) => section.id === "risks");
  const riskBlocks = riskSection?.riskBlocks || [];

  return riskBlocks.map((risk) => ({
    id: risk.id,
    code: risk.id.toUpperCase().replace(/[^A-Z0-9]+/g, "_"),
    titleAr: risk.id.replace(/-/g, " "),
    titleEn: risk.id.replace(/-/g, " "),
    descriptionAr: risk.ar,
    descriptionEn: risk.en,
    severity: mapSeverity(risk.severity),
    specialtyTags: ["SURGERY", "GENERAL_MEDICINE"],
    category: "surgical-procedure",
  }));
}

function mapAlternativesToPayload(rawTemplate: RawTemplate): DynamicConsentAlternativeItem[] {
  const alternativesSection = getRawTemplateSections(rawTemplate).find((section) => section.id === "alternatives");

  if (!alternativesSection?.fields) {
    return [];
  }

  return alternativesSection.fields.map((field) => ({
    id: field.id,
    textAr: field.label?.ar || field.id,
    textEn: field.label?.en || field.id,
  }));
}

function mapDeclarationsToLegalStatements(rawTemplate: RawTemplate): DynamicConsentSection[] {
  const sections: DynamicConsentSection[] = [];
  let order = 800;

  for (const rawSection of getRawTemplateSections(rawTemplate)) {
    if (rawSection.declaration) {
      sections.push({
        id: `${rawSection.id}-declaration`,
        key: `${rawSection.id}_declaration`,
        kind: "legal",
        titleAr: rawSection.title.ar,
        titleEn: rawSection.title.en,
        bodyAr: rawSection.declaration.ar,
        bodyEn: rawSection.declaration.en,
        required: true,
        layer: 3,
        order,
      });
      order += 10;
    }

    for (const declaration of rawSection.declarations || []) {
      sections.push({
        id: declaration.id,
        key: declaration.id.replace(/-/g, "_"),
        kind: "acknowledgment",
        titleAr: rawSection.title.ar,
        titleEn: rawSection.title.en,
        bodyAr: declaration.ar,
        bodyEn: declaration.en,
        required: true,
        layer: 3,
        order,
      });
      order += 10;
    }
  }

  sections.push({
    id: "surgery-legal-footer",
    key: "surgery_legal_footer",
    kind: "legal",
    titleAr: "مدة الصلاحية",
    titleEn: "Validity",
    bodyAr: rawTemplate.legalFooter.ar,
    bodyEn: rawTemplate.legalFooter.en,
    required: true,
    layer: 3,
    order,
  });

  return sections;
}

export function createDynamicTemplateFromRawSurgeryConsent(): DynamicConsentTemplateDefinition {
  const rawTemplate = SURGERY_MEDICAL_PROCEDURE_CONSENT_TEMPLATE;
  const rawSections = getRawTemplateSections(rawTemplate);

  return {
    id: rawTemplate.id,
    slug: "surgery-medical-procedure-consent",
    consentType: rawTemplate.category,
    specialty: "SURGERY",
    language: "bilingual",
    version: rawTemplate.version,
    displayNameAr: rawTemplate.title.ar,
    displayNameEn: rawTemplate.title.en,
    defaultRiskCodes: mapRiskBlocksToRisks(rawTemplate).map((risk) => risk.code),
    requiredFields: ["diagnosis", "procedure", "specialty"],
    sectionBlueprints: rawSections.map((section, index) => mapRawSectionToBlueprint(section, index)),
  };
}

export function createDynamicPayloadFromRawSurgeryConsentPreview(): DynamicConsentPayload {
  const rawTemplate = SURGERY_MEDICAL_PROCEDURE_CONSENT_TEMPLATE;

  return {
    patient: {
      id: "surgery-preview-patient",
      name: "Ahmed Al Qahtani",
      identifier: "IMC-2026-02001",
      role: "PATIENT",
    },
    encounter: {
      id: "surgery-preview-encounter",
      encounterNumber: "ENC-UAT-2026-0201",
      caseNumber: "CASE-2026-0201",
      specialty: "SURGERY",
      diagnosis: "Acute calculous cholecystitis requiring laparoscopic cholecystectomy",
      plannedProcedure: "Laparoscopic cholecystectomy",
      department: "General Surgery",
    },
    physician: {
      id: "surgery-preview-physician",
      name: "Dr. Sarah Al Otaibi",
      identifier: "SURG-2201",
      role: "CONSULTANT_SURGEON",
    },
    diagnosis: "Acute calculous cholecystitis requiring laparoscopic cholecystectomy",
    procedure: "Laparoscopic cholecystectomy with possible open conversion if clinically required",
    specialty: "SURGERY",
    language: "bilingual",
    anesthesia: {
      required: true,
      type: "General anesthesia",
      notesAr: "تم شرح التخدير العام وإمكانية تعديل الخطة التخديرية حسب تقييم أخصائي التخدير.",
      notesEn: "General anesthesia was explained, including the possibility of adapting the anesthesia plan based on anesthesiology assessment.",
    },
    risks: mapRiskBlocksToRisks(rawTemplate),
    alternatives: mapAlternativesToPayload(rawTemplate),
    legalStatements: mapDeclarationsToLegalStatements(rawTemplate),
    signatures: {
      patientRequired: rawTemplate.requires.patientSignature,
      physicianRequired: rawTemplate.requires.physicianDeclaration,
      interpreterRequired: rawTemplate.requires.interpreterIfRequired,
      witnessRequired: rawTemplate.requires.witnesses > 0,
    },
    audit: {
      templateVersion: rawTemplate.version,
      evidenceId: "surgery-preview-evidence",
    },
  };
}

export function buildRawSurgeryMedicalProcedureConsentPreview(): DynamicConsentBuildResult {
  return buildDynamicConsentDocument({
    template: createDynamicTemplateFromRawSurgeryConsent(),
    payload: createDynamicPayloadFromRawSurgeryConsentPreview(),
  });
}