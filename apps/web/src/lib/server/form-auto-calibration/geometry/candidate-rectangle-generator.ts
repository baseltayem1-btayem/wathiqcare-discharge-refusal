/**
 * Generate candidate rectangles from ontology field anchors.
 *
 * Combines anchor detection, rectangle constraints, protected regions, and
 * column-aware geometry to produce deterministic candidate rectangles.
 */

import type { ConsentOntologyField } from "../ontology/consent-field-ontology";
import type { ExtractedDocumentLayout } from "../extraction/document-layout-types";
import { findLabelAnchors } from "../anchors/find-label-anchors";
import type { AnchorMatch } from "../anchors/anchor-types";
import type { AnchorRelativeRectangle } from "../anchors/anchor-relative-geometry";
import { computeAnchorRelativeRectangle } from "../anchors/anchor-relative-geometry";
import { buildProtectedRegions } from "./protected-region-builder";
import {
  textFieldConstraint,
  signatureFieldConstraint,
  checkboxFieldConstraint,
  dateTimeFieldConstraint,
  type FieldRectangleConstraint,
} from "./rectangle-constraints";
import { clampNormalizedRect, type NormalizedRectangle } from "./rectangle-normalization";

export type CandidateFieldMapping = {
  ontologyKey: string;
  field: ConsentOntologyField;
  rectangles: AnchorRelativeRectangle[];
  confidence: number;
  evidence: string;
  status: "MAPPED" | "PARTIAL" | "UNMAPPED";
};

function constraintForField(field: ConsentOntologyField): FieldRectangleConstraint {
  if (field.supportedWidgets.includes("SIGNATURE")) return signatureFieldConstraint();
  if (field.supportedWidgets.includes("CHECKBOX") || field.supportedWidgets.includes("RADIO")) {
    return checkboxFieldConstraint();
  }
  if (field.dataType === "date" || field.dataType === "time" || field.dataType === "datetime") {
    return dateTimeFieldConstraint();
  }
  return textFieldConstraint({
    multiline: field.supportedWidgets.includes("MULTILINE_TEXT"),
    isArabic: field.language === "AR" || field.language === "BILINGUAL",
    maxLines: field.supportedWidgets.includes("MULTILINE_TEXT") ? 6 : 1,
  });
}

function constraintToRectangleConstraint(
  constraint: FieldRectangleConstraint,
): Parameters<typeof computeAnchorRelativeRectangle>[0]["constraint"] {
  return {
    minWidth: constraint.minWidthNorm,
    maxWidth: constraint.maxWidthNorm,
    minHeight: constraint.minHeightNorm,
    maxHeight: constraint.maxHeightNorm,
    preferBelow: true,
    maxDistanceFromAnchor: 0.25,
  };
}

export function generateCandidateMappings(
  layout: ExtractedDocumentLayout,
): CandidateFieldMapping[] {
  const anchorMatches = findLabelAnchors(layout);
  const protectedRegions = buildProtectedRegions(layout);
  const mappings = new Map<string, CandidateFieldMapping>();

  // Group anchors by ontology key.
  const anchorsByKey = new Map<string, AnchorMatch[]>();
  for (const match of anchorMatches) {
    const list = anchorsByKey.get(match.field.key) ?? [];
    list.push(match);
    anchorsByKey.set(match.field.key, list);
  }

  for (const [key, matches] of anchorsByKey.entries()) {
    const bestMatch = matches.sort((a, b) => b.anchor.confidence - a.anchor.confidence)[0];
    if (!bestMatch) continue;

    const field = bestMatch.field;
    const constraint = constraintForField(field);

    // For bilingual fields, create left and right variants if needed.
    const isBilingualPair = key.endsWith(".en") || key.endsWith(".ar");
    const preferredColumn: "LEFT" | "RIGHT" | undefined = isBilingualPair
      ? key.endsWith(".ar")
        ? "RIGHT"
        : "LEFT"
      : undefined;

    const candidate = computeAnchorRelativeRectangle({
      anchor: bestMatch.anchor,
      layout,
      constraint: constraintToRectangleConstraint(constraint),
      column: preferredColumn,
      padding: {
        horizontal: constraint.horizontalPaddingNorm,
        vertical: constraint.verticalPaddingNorm,
      },
      maxLines: constraint.maxLines,
      minFontSize: constraint.minFontSize,
      confidence: bestMatch.anchor.confidence,
      evidence: bestMatch.evidence,
    });

    if (!candidate) continue;

    // Attach protected regions that intersect this rectangle.
    candidate.protectedRegions = protectedRegions.filter((region) => {
      const rect: NormalizedRectangle = {
        x: candidate.absolute.x,
        y: candidate.absolute.y,
        width: candidate.absolute.width,
        height: candidate.absolute.height,
      };
      const regionRect: NormalizedRectangle = {
        x: region.x,
        y: region.y,
        width: region.width,
        height: region.height,
      };
      const aRight = rect.x + rect.width;
      const aBottom = rect.y - rect.height;
      const bRight = regionRect.x + regionRect.width;
      const bBottom = regionRect.y - regionRect.height;
      return (
        rect.x < bRight &&
        aRight > regionRect.x &&
        rect.y > bBottom &&
        aBottom < regionRect.y
      );
    });

    // Clamp to safe bounds.
    candidate.absolute = clampNormalizedRect(candidate.absolute);

    const existing = mappings.get(key);
    if (existing) {
      existing.rectangles.push(candidate);
      existing.confidence = Math.max(existing.confidence, candidate.confidence);
    } else {
      mappings.set(key, {
        ontologyKey: key,
        field,
        rectangles: [candidate],
        confidence: candidate.confidence,
        evidence: candidate.evidence,
        status: candidate.confidence >= 0.7 ? "MAPPED" : "PARTIAL",
      });
    }
  }

  return Array.from(mappings.values());
}
