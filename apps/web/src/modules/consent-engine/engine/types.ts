export type DynamicConsentLanguage = "ar" | "en" | "bilingual";

export type DynamicConsentRiskSeverity = "low" | "medium" | "high" | "critical";

export type DynamicConsentSectionKind =
  | "intro"
  | "clinical-context"
  | "procedure"
  | "benefits"
  | "risks"
  | "alternatives"
  | "anesthesia"
  | "refusal"
  | "legal"
  | "acknowledgment"
  | "signatures";

export interface DynamicConsentPerson {
  id?: string | null;
  name: string;
  identifier?: string | null;
  role?: string | null;
}

export interface DynamicConsentEncounterData {
  id?: string | null;
  encounterNumber?: string | null;
  caseNumber?: string | null;
  specialty?: string | null;
  diagnosis?: string | null;
  plannedProcedure?: string | null;
  department?: string | null;
}

export interface DynamicConsentRiskItem {
  id: string;
  code: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  severity: DynamicConsentRiskSeverity;
  specialtyTags: string[];
  category: string;
}

export interface DynamicConsentSection {
  id: string;
  key: string;
  kind: DynamicConsentSectionKind;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  required: boolean;
  layer: 1 | 2 | 3;
  order: number;
}

export interface DynamicConsentAlternativeItem {
  id: string;
  textAr: string;
  textEn: string;
}

export interface DynamicConsentTemplateSectionBlueprint {
  id: string;
  key: string;
  kind: DynamicConsentSectionKind;
  titleAr: string;
  titleEn: string;
  bodyArTemplate: string;
  bodyEnTemplate: string;
  required: boolean;
  layer: 1 | 2 | 3;
  order: number;
}

export interface DynamicConsentPayload {
  patient: DynamicConsentPerson;
  encounter: DynamicConsentEncounterData;
  physician: DynamicConsentPerson;
  diagnosis: string;
  procedure: string;
  specialty: string;
  language: DynamicConsentLanguage;
  anesthesia?: {
    required: boolean;
    type?: string | null;
    notesAr?: string | null;
    notesEn?: string | null;
  };
  risks: DynamicConsentRiskItem[];
  alternatives: DynamicConsentAlternativeItem[];
  legalStatements: DynamicConsentSection[];
  signatures?: {
    patientRequired?: boolean;
    physicianRequired?: boolean;
    interpreterRequired?: boolean;
    witnessRequired?: boolean;
  };
  audit?: {
    generatedAt?: string;
    templateVersion?: string | null;
    evidenceId?: string | null;
  };
}

export interface DynamicConsentTemplateDefinition {
  id: string;
  slug: string;
  consentType: string;
  specialty: string;
  language: DynamicConsentLanguage;
  version: string;
  displayNameAr: string;
  displayNameEn: string;
  defaultRiskCodes: string[];
  requiredFields: Array<keyof Pick<DynamicConsentPayload, "diagnosis" | "procedure" | "specialty">>;
  sectionBlueprints: DynamicConsentTemplateSectionBlueprint[];
}

export interface DynamicConsentAuditSnapshot {
  hash: string;
  generatedAt: string;
  templateId: string;
  templateVersion: string;
  payloadFingerprint: string;
}

export interface DynamicConsentRenderedDocument {
  titleAr: string;
  titleEn: string;
  html: string;
  pdfFileName: string;
}

export interface DynamicConsentBuildResult {
  template: DynamicConsentTemplateDefinition;
  payload: DynamicConsentPayload;
  sections: DynamicConsentSection[];
  risks: DynamicConsentRiskItem[];
  alternatives: DynamicConsentAlternativeItem[];
  warnings: string[];
  rendered: DynamicConsentRenderedDocument;
  audit: DynamicConsentAuditSnapshot;
  generatedAt: string;
}