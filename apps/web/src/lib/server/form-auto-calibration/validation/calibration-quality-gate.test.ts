import { describe, test } from "node:test";
import assert from "node:assert";
import { runCalibrationQualityGate } from "./calibration-quality-gate";
import type { CandidateFieldMapping } from "../geometry/candidate-rectangle-generator";
import type { LayoutFamilyClassification } from "../fingerprint/layout-family-classifier";
import type { ConsentWidgetType } from "../ontology/consent-field-ontology";

function makeField(key: string, widgets: string[] = ["TEXT"]): CandidateFieldMapping["field"] {
  return {
    key,
    labelEn: key,
    labelAr: "",
    dataType: "string",
    language: "EN",
    role: "PATIENT",
    sensitivity: "OPERATIONAL",
    requiredness: "ALWAYS",
    supportedWidgets: widgets as ConsentWidgetType[],
    aliasesEn: [],
    aliasesAr: [],
    printable: "RENDER_OVERLAY",
    mayBeAbsent: false,
    aiMappingRequiresConfirmation: false,
  };
}

function makeMapping(key: string, x: number, widgets: string[] = ["TEXT"]): CandidateFieldMapping {
  return {
    ontologyKey: key,
    field: makeField(key, widgets),
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
    confidence: 0.9,
    evidence: "test",
    status: "MAPPED",
  };
}

const classification: LayoutFamilyClassification = {
  family: "GENERIC_SINGLE_PAGE",
  confidence: 0.9,
  matchingTemplateIds: [],
  reasons: [],
  manualReviewMandatory: false,
};

describe("calibration-quality-gate", () => {
  test("approves valid mapping", () => {
    const result = runCalibrationQualityGate({
      classification,
      mappings: [
        makeMapping("patient.name", 0.1),
        makeMapping("patient.signature", 0.5, ["SIGNATURE"]),
        makeMapping("physician.signature", 0.7, ["SIGNATURE"]),
      ],
      unmappedRequiredKeys: [],
      sourcePageCount: 1,
      candidatePageCount: 1,
    });
    assert.ok(result.score >= 90);
    assert.equal(result.status, "AUTO_REVIEW_CANDIDATE");
  });

  test("flags missing required field", () => {
    const result = runCalibrationQualityGate({
      classification: { ...classification, confidence: 0.1 },
      mappings: [],
      unmappedRequiredKeys: ["patient.name"],
      sourcePageCount: 1,
      candidatePageCount: 1,
    });
    assert.equal(result.status, "MANUAL_CALIBRATION_REQUIRED");
    assert.ok(result.findings.some((f) => f.check === "required_fields" && !f.passed));
  });
});
