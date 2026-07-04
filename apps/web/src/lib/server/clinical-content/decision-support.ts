/**
 * Clinical Decision Support Engine
 *
 * Provides specialty-aware suggestions, missing-disclosure detection, and
 * risk scoring for consent assembly. All outputs are advisory and require
 * physician review/approval before being used in a legal document.
 */

import {
  type DecisionSupportResult,
  type ClinicalSuggestion,
  type PatientContext,
  type ClinicalProcedure,
  type RiskDisclosure,
  type AlternativeDisclosure,
  type RiskLevel,
} from "@/lib/clinical-content/types";
import { clinicalContentRegistry } from "./registry";

export interface EvaluateDecisionSupportInput {
  procedure?: ClinicalProcedure;
  disclosedRiskIds: string[];
  disclosedAlternativeIds: string[];
  patientContext: PatientContext;
  includeEducation: boolean;
}

export function evaluateDecisionSupport(
  input: EvaluateDecisionSupportInput,
): DecisionSupportResult {
  const suggestions: ClinicalSuggestion[] = [];
  const requiredParticipants: ("witness" | "interpreter" | "guardian")[] = [];
  let riskScore = 0;

  const procedure = input.procedure;
  const allRisks = procedure
    ? procedure.mappedRiskIds
        .map((id) => clinicalContentRegistry.getRiskDisclosure(id))
        .filter((r): r is RiskDisclosure => Boolean(r))
    : [];

  const allAlternatives = procedure
    ? procedure.mappedAlternativeIds
        .map((id) => clinicalContentRegistry.getAlternativeDisclosure(id))
        .filter((a): a is AlternativeDisclosure => Boolean(a))
    : [];

  // Missing risk disclosures
  for (const risk of allRisks) {
    if (!input.disclosedRiskIds.includes(risk.id)) {
      suggestions.push({
        id: `suggest-risk-${risk.id}`,
        type: "missing-risk",
        severity: risk.riskLevel === "high" || risk.riskLevel === "critical" ? "critical" : "warning",
        messageEn: `Consider disclosing: ${risk.titleEn}`,
        messageAr: `فكر في الإفصاح عن: ${risk.titleAr}`,
        source: "clinical-content-engine",
        suggestedContentIds: [risk.id],
      });
    }
  }

  // Missing alternative disclosures
  for (const alt of allAlternatives) {
    if (!input.disclosedAlternativeIds.includes(alt.id)) {
      suggestions.push({
        id: `suggest-alt-${alt.id}`,
        type: "missing-alternative",
        severity: "info",
        messageEn: `Consider documenting alternative: ${alt.titleEn}`,
        messageAr: `فكر في توثيق البديل: ${alt.titleAr}`,
        source: "clinical-content-engine",
        suggestedContentIds: [alt.id],
      });
    }
  }

  // Anesthesia / high-risk pathway
  if (procedure?.anesthesiaRequired) {
    riskScore += 30;
    requiredParticipants.push("witness");
    suggestions.push({
      id: "suggest-anesthesia-review",
      type: "witness-required",
      severity: "warning",
      messageEn: "Anesthesia is required for this procedure. A witness signature is recommended.",
      messageAr: "التخدير مطلوب لهذا الإجراء. يُنصح بتوقيع الشاهد.",
      source: "clinical-content-engine",
      suggestedContentIds: [],
    });
  }

  // Patient capacity / guardian
  if (input.patientContext.capacityStatus === "minor" || input.patientContext.capacityStatus === "incapacitated") {
    riskScore += 40;
    requiredParticipants.push("guardian");
    requiredParticipants.push("witness");
    suggestions.push({
      id: "suggest-guardian",
      type: "witness-required",
      severity: "critical",
      messageEn: "Patient capacity requires a legal guardian and witness signature.",
      messageAr: "تتطلب قدرة المريض وجود ولي أمر قانوني وتوقيع شاهد.",
      source: "clinical-content-engine",
      suggestedContentIds: [],
    });
  }

  // Language / interpreter
  if (
    input.patientContext.languagePreference === "en" &&
    input.patientContext.capacityStatus !== "minor"
  ) {
    suggestions.push({
      id: "suggest-interpreter",
      type: "interpreter-required",
      severity: "info",
      messageEn: "Consider offering an Arabic interpreter for informed consent discussion.",
      messageAr: "فكر في توفير مترجم عربي لمناقشة الموافقة المستنيرة.",
      source: "clinical-content-engine",
      suggestedContentIds: [],
    });
  }

  // Education recommendation
  if (!input.includeEducation) {
    suggestions.push({
      id: "suggest-education",
      type: "education-recommended",
      severity: "info",
      messageEn: "Patient education material is available and recommended for this procedure.",
      messageAr: "تتوفر مواد تثقيفية للمريض ويُنصح بها لهذا الإجراء.",
      source: "clinical-content-engine",
      suggestedContentIds: procedure?.mappedEducationIds ?? [],
    });
  }

  // Base risk score from procedure mapped risks
  for (const risk of allRisks) {
    if (input.disclosedRiskIds.includes(risk.id)) {
      riskScore += risk.riskLevel === "high" ? 15 : risk.riskLevel === "critical" ? 25 : 5;
    }
  }

  const riskLevel = scoreToRiskLevel(riskScore);
  const missingDisclosures = suggestions
    .filter((s) => s.type === "missing-risk" || s.type === "missing-alternative")
    .map((s) => s.messageEn);

  // De-duplicate required participants
  const uniqueParticipants = Array.from(new Set(requiredParticipants));

  return {
    procedureName: procedure?.titleEn ?? "Unknown procedure",
    riskScore: Math.min(100, riskScore),
    riskLevel,
    suggestions,
    missingDisclosures,
    requiredParticipants: uniqueParticipants,
  };
}

function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 70) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "standard";
}
