/**
 * Procedure Mapping Engine
 *
 * Resolves a clinical procedure to its approved consent forms, patient
 * education materials, risk disclosures, and alternative disclosures.
 *
 * This is an additive, feature-flagged engine. When disabled or when no
 * mapping is found, callers fall back to the existing manual workflow.
 */

import {
  type ProcedureMappingResult,
  type ClinicalProcedure,
  type ApprovedFormV2,
  type EducationMaterial,
  type RiskDisclosure,
  type AlternativeDisclosure,
} from "@/lib/clinical-content/types";
import { clinicalContentRegistry } from "./registry";

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
}

function tokenSet(value: string): Set<string> {
  return new Set(normalize(value).split(" ").filter(Boolean));
}

function scoreProcedureMatch(procedure: ClinicalProcedure, query: string): number {
  const qTokens = tokenSet(query);
  const titleTokens = tokenSet(procedure.titleEn);
  const titleArTokens = tokenSet(procedure.titleAr);
  const keywordTokens = new Set(procedure.tags.flatMap((t) => Array.from(tokenSet(t))));

  let score = 0;
  for (const token of qTokens) {
    if (titleTokens.has(token)) score += 10;
    if (titleArTokens.has(token)) score += 10;
    if (keywordTokens.has(token)) score += 5;
    if (procedure.procedureCode?.toLowerCase() === token) score += 8;
  }

  const normalizedQuery = normalize(query);
  const normalizedTitle = normalize(procedure.titleEn);
  if (normalizedTitle === normalizedQuery) score += 50;
  else if (normalizedTitle.includes(normalizedQuery)) score += 20;
  else if (normalizedQuery.includes(normalizedTitle)) score += 15;

  return score;
}

function findProcedure(query: string): ClinicalProcedure | undefined {
  const normalized = normalize(query);
  if (!normalized) return undefined;

  const procedures = clinicalContentRegistry.listProcedures();

  const exact = procedures.find(
    (p) => normalize(p.titleEn) === normalized || normalize(p.titleAr) === normalized,
  );
  if (exact) return exact;

  const scored = procedures
    .map((p) => ({ procedure: p, score: scoreProcedureMatch(p, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.procedure;
}

export interface ResolveProcedureMappingInput {
  procedure: string;
  preferredLanguage?: "en" | "ar" | "bilingual";
}

export function resolveProcedureMapping(
  input: ResolveProcedureMappingInput,
): ProcedureMappingResult {
  const procedure = findProcedure(input.procedure);

  if (!procedure) {
    return {
      found: false,
      consentForms: [],
      educationMaterials: [],
      risks: [],
      alternatives: [],
      anesthesiaRequired: false,
      fallbackReason: `No approved procedure mapping found for "${input.procedure}".`,
    };
  }

  const consentForms: ApprovedFormV2[] = [];
  for (const formId of procedure.mappedFormIds) {
    const form = clinicalContentRegistry.getApprovedForm(formId);
    if (form) consentForms.push(form);
  }

  const educationMaterials: EducationMaterial[] = [];
  for (const eduId of procedure.mappedEducationIds) {
    const edu = clinicalContentRegistry.getEducationMaterial(eduId);
    if (edu) educationMaterials.push(edu);
  }

  const risks: RiskDisclosure[] = [];
  for (const riskId of procedure.mappedRiskIds) {
    const risk = clinicalContentRegistry.getRiskDisclosure(riskId);
    if (risk) risks.push(risk);
  }

  const alternatives: AlternativeDisclosure[] = [];
  for (const altId of procedure.mappedAlternativeIds) {
    const alt = clinicalContentRegistry.getAlternativeDisclosure(altId);
    if (alt) alternatives.push(alt);
  }

  return {
    found: true,
    procedure,
    consentForms,
    educationMaterials,
    risks,
    alternatives,
    anesthesiaRequired: procedure.anesthesiaRequired,
  };
}

export function listProcedureNames(): string[] {
  return clinicalContentRegistry
    .listProcedures()
    .map((p) => p.titleEn)
    .sort((a, b) => a.localeCompare(b));
}
