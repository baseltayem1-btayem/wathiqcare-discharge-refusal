/**
 * Deterministic semantic field mapper.
 *
 * Maps detected label anchors to canonical ontology keys using alias matching,
 * family context, and governed confidence rules.
 */

import type { ExtractedDocumentLayout } from "../extraction/document-layout-types";
import type { LayoutFamily } from "../fingerprint/layout-family-classifier";
import { findLabelAnchors } from "../anchors/find-label-anchors";
import type { AnchorMatch } from "../anchors/anchor-types";
import { getOntologyField } from "../ontology/consent-field-ontology";
import { computeMappingConfidence, type MappingConfidenceFactors } from "./mapping-confidence";
import { semanticFieldProposalSchema, type SemanticFieldProposal } from "./mapping-schema";

export type SemanticMappingResult = {
  proposals: SemanticFieldProposal[];
  unmappedRequiredKeys: string[];
  confidence: number;
};

const FAMILY_REQUIRED_KEYS: Record<string, string[]> = {
  IMC_BILINGUAL_TWO_COLUMN_GENERAL: [
    "patient.name",
    "procedure.name_site_side.en",
    "procedure.name_site_side.ar",
    "patient.signature",
    "physician.signature",
  ],
  IMC_BILINGUAL_SURGERY: [
    "patient.name",
    "procedure.name_site_side.en",
    "procedure.name_site_side.ar",
    "procedure.significant_risks.en",
    "procedure.significant_risks.ar",
    "patient.signature",
    "physician.signature",
  ],
  ANESTHESIA: ["patient.name", "anesthesia.type.en", "patient.signature", "physician.signature"],
  RADIOLOGY: ["patient.name", "procedure.name_site_side.en", "patient.signature", "physician.signature"],
  GUARDIAN_SUBSTITUTE: ["patient.name", "guardian.name", "guardian.signature", "patient.signature"],
  TREATMENT_REFUSAL: ["patient.name", "refusal.reason", "refusal.signature"],
  GENERIC_SINGLE_PAGE: ["patient.name", "patient.signature", "physician.signature"],
};

function isAnchorInFamilyContext(match: AnchorMatch, family: LayoutFamily): boolean {
  // Future expansion: use family-specific alias filters.
  return true;
}

export function mapSemanticFields(args: {
  layout: ExtractedDocumentLayout;
  family: LayoutFamily;
}): SemanticMappingResult {
  const { layout, family } = args;
  const matches = findLabelAnchors(layout);
  const proposals: SemanticFieldProposal[] = [];
  const seenKeys = new Set<string>();

  for (const match of matches) {
    if (seenKeys.has(match.field.key)) continue;
    seenKeys.add(match.field.key);

    const field = getOntologyField(match.field.key);
    if (!field) continue;

    const factors: MappingConfidenceFactors = {
      aliasMatchScore: match.anchor.confidence,
      anchorConfidence: match.anchor.confidence,
      geometrySafety: 0.7, // default until geometry validated
      columnCorrectness: 0.7,
      familyRelevance: isAnchorInFamilyContext(match, family) ? 1.0 : 0.5,
    };

    const confidence = computeMappingConfidence(field, factors);

    proposals.push(
      semanticFieldProposalSchema.parse({
        ontologyKey: field.key,
        confidence: Number(confidence.toFixed(4)),
        evidence: match.evidence,
        requiresHumanConfirmation: field.aiMappingRequiresConfirmation || confidence < 0.8,
      }),
    );
  }

  const requiredKeys = FAMILY_REQUIRED_KEYS[family] ?? [];
  const unmappedRequiredKeys = requiredKeys.filter((key) => !seenKeys.has(key));

  const avgConfidence =
    proposals.length > 0
      ? proposals.reduce((sum, p) => sum + p.confidence, 0) / proposals.length
      : 0;

  return {
    proposals,
    unmappedRequiredKeys,
    confidence: Number(avgConfidence.toFixed(4)),
  };
}
