import phase22Content from "@/data/phase22-content-package.json";
import type {
  DynamicConsentSection,
  PatientEducationFaqItem,
  PatientEducationUnderstandingQuestion,
} from "@/modules/consent-engine/engine/types";

/**
 * Phase 2.2 patient-education content loader.
 *
 * IMPORTANT: This loader is purely in-memory. It does NOT write to the
 * database, does NOT mutate ConsentTemplate / ConsentTemplateSection rows,
 * and does NOT trigger any deployment. It exposes the approved Phase 2.2
 * content package as `DynamicConsentSection[]` so the existing consent
 * engine can render it through its new section kinds.
 */

export type Phase22TemplateCode =
  | "SURGICAL_PROCEDURE_CONSENT"
  | "ANESTHESIA_CONSENT"
  | "BLOOD_AND_PRODUCTS_TRANSFUSION_CONSENT"
  | "PROCEDURAL_SEDATION_CONSENT"
  | "HIGH_RISK_MEDICAL_PROCEDURE_CONSENT";

interface RawBilingualList {
  ar: readonly string[];
  en: readonly string[];
}

interface RawSummary {
  ar: string;
  en: string;
}

interface RawFaqItem {
  id: string;
  ar: { question: string; answer: string };
  en: { question: string; answer: string };
}

interface RawUnderstandingQuestion {
  id: string;
  type: "multiple_choice" | "true_false";
  weight: number;
  en: { question: string; options: Record<string, string> };
  ar: { question: string; options: Record<string, string> };
  correctOption: string;
  rationaleEn?: string;
  rationaleAr?: string;
}

interface RawTemplate {
  templateCode: Phase22TemplateCode;
  consentType: string;
  riskLevel: string;
  titleAr: string;
  titleEn: string;
  patientEducationSummary: RawSummary;
  benefits: RawBilingualList;
  risks: RawBilingualList;
  alternatives: RawBilingualList;
  faq: readonly RawFaqItem[];
  understandingQuestions: readonly RawUnderstandingQuestion[];
}

interface RawPackage {
  version: string;
  status: string;
  scoringRules: {
    understandingQuestions: {
      passingScore: number;
      maxScore: number;
      scoreFormula: string;
      remediationOnFail: string;
    };
  };
  templates: readonly RawTemplate[];
}

const PACKAGE = phase22Content as unknown as RawPackage;

function listToBilingualBlock(list: RawBilingualList): { en: string; ar: string } {
  return {
    en: list.en.map((item, index) => `${index + 1}. ${item}`).join("\n"),
    ar: list.ar.map((item, index) => `${index + 1}. ${item}`).join("\n"),
  };
}

function findRaw(code: Phase22TemplateCode): RawTemplate {
  const template = PACKAGE.templates.find((item) => item.templateCode === code);
  if (!template) {
    throw new Error(`[phase22-content-loader] Template not found: ${code}`);
  }
  return template;
}

export interface Phase22TemplateMetadata {
  templateCode: Phase22TemplateCode;
  consentType: string;
  riskLevel: string;
  titleAr: string;
  titleEn: string;
}

export interface Phase22TemplateBundle {
  metadata: Phase22TemplateMetadata;
  sections: DynamicConsentSection[];
  faqItems: PatientEducationFaqItem[];
  understandingQuestions: PatientEducationUnderstandingQuestion[];
}

export const PHASE_22_TEMPLATE_CODES: readonly Phase22TemplateCode[] =
  PACKAGE.templates.map((item) => item.templateCode);

export function getPhase22PackageVersion(): string {
  return PACKAGE.version;
}

export function getPhase22PackageStatus(): string {
  return PACKAGE.status;
}

/**
 * Returns a Phase 2.2 template as a normalized bundle that the consent
 * engine and the new React components can consume directly.
 */
export function loadPhase22Template(code: Phase22TemplateCode): Phase22TemplateBundle {
  const raw = findRaw(code);
  const scoring = PACKAGE.scoringRules.understandingQuestions;

  const summarySection: DynamicConsentSection = {
    id: `${raw.templateCode}__pe_summary`,
    key: "pe_summary",
    kind: "patient-education",
    titleEn: "Patient Education Summary",
    titleAr: "ملخّص التثقيف للمريض",
    bodyEn: raw.patientEducationSummary.en,
    bodyAr: raw.patientEducationSummary.ar,
    required: true,
    layer: 1,
    order: 110,
  };

  const benefitsBlock = listToBilingualBlock(raw.benefits);
  const benefitsSection: DynamicConsentSection = {
    id: `${raw.templateCode}__benefits`,
    key: "benefits",
    kind: "benefits",
    titleEn: "Benefits",
    titleAr: "الفوائد",
    bodyEn: benefitsBlock.en,
    bodyAr: benefitsBlock.ar,
    required: true,
    layer: 2,
    order: 120,
  };

  const risksBlock = listToBilingualBlock(raw.risks);
  const risksSection: DynamicConsentSection = {
    id: `${raw.templateCode}__risks`,
    key: "risks",
    kind: "risks",
    titleEn: "Risks",
    titleAr: "المخاطر",
    bodyEn: risksBlock.en,
    bodyAr: risksBlock.ar,
    required: true,
    layer: 2,
    order: 130,
  };

  const alternativesBlock = listToBilingualBlock(raw.alternatives);
  const alternativesSection: DynamicConsentSection = {
    id: `${raw.templateCode}__alternatives`,
    key: "alternatives",
    kind: "alternatives",
    titleEn: "Alternatives",
    titleAr: "البدائل",
    bodyEn: alternativesBlock.en,
    bodyAr: alternativesBlock.ar,
    required: true,
    layer: 2,
    order: 140,
  };

  const faqItems: PatientEducationFaqItem[] = raw.faq.map((item) => ({
    id: item.id,
    ar: { ...item.ar },
    en: { ...item.en },
  }));
  const faqSection: DynamicConsentSection = {
    id: `${raw.templateCode}__faq`,
    key: "faq",
    kind: "faq",
    titleEn: "Frequently Asked Questions",
    titleAr: "الأسئلة الشائعة",
    bodyEn: `${faqItems.length} questions and answers covering the most common patient concerns.`,
    bodyAr: `${faqItems.length} سؤالاً وجواباً تغطّي أكثر استفسارات المرضى شيوعاً.`,
    required: false,
    layer: 2,
    order: 150,
    meta: { faqItems },
  };

  const understandingQuestions: PatientEducationUnderstandingQuestion[] = raw.understandingQuestions.map(
    (item) => ({
      id: item.id,
      type: item.type,
      weight: item.weight,
      en: { question: item.en.question, options: { ...item.en.options } },
      ar: { question: item.ar.question, options: { ...item.ar.options } },
      correctOption: item.correctOption,
      rationaleEn: item.rationaleEn,
      rationaleAr: item.rationaleAr,
    }),
  );
  const understandingSection: DynamicConsentSection = {
    id: `${raw.templateCode}__understanding_check`,
    key: "understanding_check",
    kind: "understanding-check",
    titleEn: "Understanding Check",
    titleAr: "تقييم الفهم",
    bodyEn: `Short comprehension check. Passing score ${scoring.passingScore}%.`,
    bodyAr: `اختبار فهم قصير. درجة النجاح ${scoring.passingScore}٪.`,
    required: true,
    layer: 3,
    order: 160,
    meta: {
      understandingQuestions,
      scoring: {
        passingScore: scoring.passingScore,
        maxScore: scoring.maxScore,
        formula: scoring.scoreFormula,
        remediationOnFail: scoring.remediationOnFail,
      },
    },
  };

  return {
    metadata: {
      templateCode: raw.templateCode,
      consentType: raw.consentType,
      riskLevel: raw.riskLevel,
      titleAr: raw.titleAr,
      titleEn: raw.titleEn,
    },
    sections: [
      summarySection,
      benefitsSection,
      risksSection,
      alternativesSection,
      faqSection,
      understandingSection,
    ],
    faqItems,
    understandingQuestions,
  };
}
