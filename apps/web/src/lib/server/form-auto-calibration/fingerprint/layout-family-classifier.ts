/**
 * Layout family classifier.
 *
 * Classifies a blank form into one of the supported layout families based on
 * deterministic structural evidence. It never claims high confidence solely
 * from file name or procedure name.
 */

import type { LayoutFingerprint, LayoutFingerprintSummary } from "./layout-fingerprint";

export type LayoutFamily =
  | "IMC_BILINGUAL_TWO_COLUMN_GENERAL"
  | "IMC_BILINGUAL_SURGERY"
  | "ANESTHESIA"
  | "RADIOLOGY"
  | "GUARDIAN_SUBSTITUTE"
  | "TREATMENT_REFUSAL"
  | "GENERIC_SINGLE_PAGE"
  | "UNKNOWN";

export type LayoutFamilyClassification = {
  family: LayoutFamily;
  confidence: number; // 0–1
  matchingTemplateIds: string[];
  reasons: string[];
  manualReviewMandatory: boolean;
};

type FamilyRule = {
  family: LayoutFamily;
  label: string;
  score: (summary: LayoutFingerprintSummary, pageCount: number) => number;
  reasons: (summary: LayoutFingerprintSummary, pageCount: number) => string[];
  matchingTemplates: string[];
};

const FAMILY_RULES: FamilyRule[] = [
  {
    family: "TREATMENT_REFUSAL",
    label: "Treatment refusal form",
    score: (s, pageCount) => {
      let score = 0;
      if (pageCount <= 2) score += 0.2;
      if (s.signatureRegionCount >= 2 && s.signatureRegionCount <= 4) score += 0.25;
      if (s.writingLineCount >= 3 && s.writingLineCount <= 12) score += 0.15;
      if (s.textBlockCount <= 40) score += 0.1;
      return score;
    },
    reasons: () => ["Short page count", "Few signature regions", "Moderate writing lines"],
    matchingTemplates: ["refusal-of-treatment"],
  },
  {
    family: "ANESTHESIA",
    label: "Anesthesia consent",
    score: (s, pageCount) => {
      let score = 0;
      if (pageCount >= 2 && pageCount <= 4) score += 0.2;
      if (s.checkboxCount >= 4) score += 0.2;
      if (s.signatureRegionCount >= 2 && s.signatureRegionCount <= 5) score += 0.15;
      if (s.hasPatientHeader) score += 0.1;
      return score;
    },
    reasons: (s) => [
      s.checkboxCount >= 4 ? "Multiple anesthesia option checkboxes" : "Few checkboxes",
      "Consent signature block present",
    ],
    matchingTemplates: ["anesthesia-patient-consent", "consent-for-anesthesia-patient-education"],
  },
  {
    family: "RADIOLOGY",
    label: "Radiology / contrast consent",
    score: (s, pageCount) => {
      let score = 0;
      if (pageCount >= 1 && pageCount <= 3) score += 0.2;
      if (s.checkboxCount >= 3 && s.checkboxCount <= 12) score += 0.2;
      if (s.signatureRegionCount >= 2) score += 0.15;
      return score;
    },
    reasons: () => ["Short form", "Multiple risk/option checkboxes"],
    matchingTemplates: ["angiogram-and-plasty-stenting", "biopsy-under-imaging"],
  },
  {
    family: "GUARDIAN_SUBSTITUTE",
    label: "Guardian / substitute decision maker",
    score: (s, pageCount) => {
      let score = 0;
      if (s.signatureRegionCount >= 4) score += 0.25;
      if (pageCount >= 2 && pageCount <= 5) score += 0.15;
      if (s.writingLineCount >= 6) score += 0.15;
      if (s.hasPatientHeader) score += 0.1;
      return score;
    },
    reasons: (s) => [
      s.signatureRegionCount >= 4 ? "Multiple signature regions (patient + guardian)" : "Few signatures",
    ],
    matchingTemplates: ["circumcision-child-young-person"],
  },
  {
    family: "IMC_BILINGUAL_SURGERY",
    label: "IMC bilingual surgery consent",
    score: (s, pageCount) => {
      let score = 0;
      if (pageCount >= 4) score += 0.2;
      if (s.hasBilingualColumns) score += 0.25;
      if (s.hasPatientHeader) score += 0.1;
      if (s.hasPhysicianFooter) score += 0.1;
      if (s.writingLineCount >= 10) score += 0.15;
      if (s.signatureRegionCount >= 3) score += 0.1;
      return score;
    },
    reasons: (s, pageCount) => [
      s.hasBilingualColumns ? "Bilingual two-column layout" : "No bilingual columns",
      pageCount >= 4 ? "Multi-page surgical form" : "Short page count",
    ],
    matchingTemplates: ["amputation"],
  },
  {
    family: "IMC_BILINGUAL_TWO_COLUMN_GENERAL",
    label: "IMC bilingual two-column general procedure",
    score: (s, pageCount) => {
      let score = 0;
      if (pageCount >= 2 && pageCount <= 5) score += 0.2;
      if (s.hasBilingualColumns) score += 0.25;
      if (s.hasPatientHeader) score += 0.1;
      if (s.signatureRegionCount >= 2) score += 0.1;
      if (s.writingLineCount >= 4) score += 0.1;
      return score;
    },
    reasons: (s) => [
      s.hasBilingualColumns ? "Bilingual two-column layout" : "No bilingual columns",
      "General procedure consent structure",
    ],
    matchingTemplates: ["general-procedure"],
  },
  {
    family: "GENERIC_SINGLE_PAGE",
    label: "Generic single-page consent",
    score: (s, pageCount) => {
      let score = 0;
      if (pageCount === 1) score += 0.35;
      if (s.signatureRegionCount >= 2) score += 0.2;
      if (s.writingLineCount >= 2) score += 0.15;
      if (s.textBlockCount <= 60) score += 0.1;
      return score;
    },
    reasons: () => ["Single page", "Signature and writing-line structure"],
    matchingTemplates: ["single-page-consent"],
  },
];

const HIGH_CONFIDENCE_THRESHOLD = 0.75;

export function classifyLayoutFamily(
  fingerprint: LayoutFingerprint,
): LayoutFamilyClassification {
  const summary = fingerprint.summary;

  let bestFamily: LayoutFamily = "UNKNOWN";
  let bestScore = 0;
  let bestReasons: string[] = [];
  let bestTemplates: string[] = [];

  for (const rule of FAMILY_RULES) {
    const score = rule.score(summary, fingerprint.pageCount);
    if (score > bestScore) {
      bestScore = score;
      bestFamily = rule.family;
      bestReasons = rule.reasons(summary, fingerprint.pageCount);
      bestTemplates = rule.matchingTemplates;
    }
  }

  // Penalise unknown page counts or missing patient header for clinical forms.
  if (fingerprint.pageCount === 0 || fingerprint.pageSizePoints.width === 0) {
    bestScore = 0;
    bestFamily = "UNKNOWN";
    bestReasons = ["Unable to determine page dimensions"];
    bestTemplates = [];
  }

  const confidence = Math.min(1, bestScore);
  const manualReviewMandatory = confidence < HIGH_CONFIDENCE_THRESHOLD;

  return {
    family: bestFamily,
    confidence: Number(confidence.toFixed(4)),
    matchingTemplateIds: bestTemplates,
    reasons: bestReasons,
    manualReviewMandatory,
  };
}
