/**
 * Per-mapping confidence scoring.
 */

import type { ConsentOntologyField } from "../ontology/consent-field-ontology";

export type MappingConfidenceFactors = {
  aliasMatchScore: number;
  anchorConfidence: number;
  geometrySafety: number;
  columnCorrectness: number;
  familyRelevance: number;
};

export function computeMappingConfidence(
  field: ConsentOntologyField,
  factors: MappingConfidenceFactors,
): number {
  const weights = {
    aliasMatchScore: 0.25,
    anchorConfidence: 0.25,
    geometrySafety: 0.2,
    columnCorrectness: 0.15,
    familyRelevance: 0.15,
  };

  let score = 0;
  score += factors.aliasMatchScore * weights.aliasMatchScore;
  score += factors.anchorConfidence * weights.anchorConfidence;
  score += factors.geometrySafety * weights.geometrySafety;
  score += factors.columnCorrectness * weights.columnCorrectness;
  score += factors.familyRelevance * weights.familyRelevance;

  // Penalise fields that always require human confirmation.
  if (field.aiMappingRequiresConfirmation) {
    score *= 0.9;
  }

  // Penalise absent-by-family fields unless strongly anchored.
  if (field.mayBeAbsent && factors.familyRelevance < 0.5) {
    score *= 0.8;
  }

  return Math.min(1, Math.max(0, score));
}
