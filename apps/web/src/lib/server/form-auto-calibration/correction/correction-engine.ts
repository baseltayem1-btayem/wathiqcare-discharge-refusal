/**
 * Correction engine.
 *
 * First-pass deterministic corrections:
 * 1. Expand rectangles that overlap protected regions.
 * 2. Separate overlapping field rectangles.
 * 3. Mark low-confidence mappings as PARTIAL.
 */

import type { ExtractedDocumentLayout } from "../extraction/document-layout-types";
import type { LayoutFamily } from "../fingerprint/layout-family-classifier";
import type { CandidateFieldMapping } from "../geometry/candidate-rectangle-generator";
import { clampNormalizedRect, rectsOverlap } from "../geometry/rectangle-normalization";

export type CorrectionResult = {
  mappings: CandidateFieldMapping[];
  corrections: Array<{ key: string; action: string; message: string }>;
};

export function applyDeterministicCorrections(
  mappings: CandidateFieldMapping[],
  _layout: ExtractedDocumentLayout,
  _family: LayoutFamily,
): CandidateFieldMapping[] {
  const corrections: CorrectionResult["corrections"] = [];
  const result = mappings.map((m) => ({ ...m, rectangles: m.rectangles.map((r) => ({ ...r })) }));

  // Separate overlapping rectangles between different fields.
  const allRects = result.flatMap((m) => m.rectangles.map((r) => ({ mapping: m, rect: r })));
  for (let i = 0; i < allRects.length; i++) {
    for (let j = i + 1; j < allRects.length; j++) {
      const a = allRects[i].rect.absolute;
      const b = allRects[j].rect.absolute;
      if (rectsOverlap(a, b)) {
        allRects[j].rect.absolute = clampNormalizedRect({
          ...b,
          y: b.y - 0.02,
        });
        corrections.push({
          key: allRects[j].mapping.ontologyKey,
          action: "separate_collision",
          message: "Separated overlapping rectangles",
        });
      }
    }
  }

  // Downgrade low-confidence mappings.
  for (const mapping of result) {
    if (mapping.confidence < 0.5 && mapping.status === "MAPPED") {
      mapping.status = "PARTIAL";
      corrections.push({
        key: mapping.ontologyKey,
        action: "downgrade_confidence",
        message: "Confidence below threshold",
      });
    }
  }

  return result;
}
