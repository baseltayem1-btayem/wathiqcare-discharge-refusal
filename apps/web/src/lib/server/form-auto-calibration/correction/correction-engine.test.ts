import { describe, test } from "node:test";
import assert from "node:assert";
import { applyDeterministicCorrections } from "./correction-engine";
import type { CandidateFieldMapping } from "../geometry/candidate-rectangle-generator";

function makeMapping(key: string, x: number, confidence = 0.9): CandidateFieldMapping {
  return {
    ontologyKey: key,
    field: {
      key,
      labelEn: key,
      labelAr: "",
      dataType: "string",
      language: "EN",
      role: "PATIENT",
      sensitivity: "OPERATIONAL",
      requiredness: "ALWAYS",
      supportedWidgets: ["TEXT"],
      aliasesEn: [],
      aliasesAr: [],
      printable: "RENDER_OVERLAY",
      mayBeAbsent: false,
      aiMappingRequiresConfirmation: false,
    },
    rectangles: [
      {
        page: 1,
        absolute: { x, y: 0.5, width: 0.2, height: 0.03 },
        anchor: {
          kind: "LABEL",
          page: 1,
          text: key,
          matchedOntologyKey: key,
          confidence: 0.9,
          language: "EN",
          textBlock: {
            page: 1,
            text: key,
            x: 100,
            y: 500,
            width: 100,
            height: 12,
            xNorm: 0.16,
            yNorm: 0.63,
            widthNorm: 0.16,
            heightNorm: 0.015,
          },
        },
        relativeOffsets: { deltaX: 0, deltaY: 0 },
        column: "FULL",
        direction: "LTR",
        maxLines: 1,
        minFontSize: 10,
        padding: { horizontal: 0, vertical: 0 },
        protectedRegions: [],
        confidence: 0.9,
        evidence: "test",
      },
    ],
    confidence,
    evidence: "test",
    status: confidence >= 0.7 ? "MAPPED" : "PARTIAL",
  };
}

describe("correction-engine", () => {
  test("separates overlapping rectangles", () => {
    const result = applyDeterministicCorrections(
      [makeMapping("a", 0.1), makeMapping("b", 0.15)],
      { pageCount: 1, pageSizePoints: { width: 612, height: 792 }, pages: [] },
      "UNKNOWN",
    );
    assert.ok(result.length === 2);
  });

  test("downgrades low-confidence mappings", () => {
    const result = applyDeterministicCorrections(
      [makeMapping("a", 0.1, 0.3)],
      { pageCount: 1, pageSizePoints: { width: 612, height: 792 }, pages: [] },
      "UNKNOWN",
    );
    assert.equal(result[0].status, "PARTIAL");
  });
});
