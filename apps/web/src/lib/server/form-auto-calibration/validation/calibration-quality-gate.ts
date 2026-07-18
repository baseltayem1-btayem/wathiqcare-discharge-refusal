/**
 * Calibration quality gate.
 *
 * Aggregates all deterministic validation results and assigns a review status.
 */

import type { LayoutFamilyClassification } from "../fingerprint/layout-family-classifier";
import type { CandidateFieldMapping } from "../geometry/candidate-rectangle-generator";
import type { CalibrationQualityReport } from "../mapping/mapping-schema";
import { validatePixelCollisions } from "./pixel-collision-validator";
import { validateOverflow } from "./overflow-validator";
import { validateSignatureRegions } from "./signature-region-validator";

export type QualityGateInput = {
  classification: LayoutFamilyClassification;
  mappings: CandidateFieldMapping[];
  unmappedRequiredKeys: string[];
  sourcePageCount: number;
  candidatePageCount: number;
};

export function runCalibrationQualityGate(input: QualityGateInput): CalibrationQualityReport {
  const findings: CalibrationQualityReport["findings"] = [];

  // Page count.
  const pageCountOk = input.sourcePageCount === input.candidatePageCount;
  findings.push({
    check: "page_count",
    passed: pageCountOk,
    message: pageCountOk
      ? "Candidate page count matches source."
      : `Page count mismatch: source ${input.sourcePageCount}, candidate ${input.candidatePageCount}`,
  });

  // Family confidence.
  const familyOk = input.classification.confidence >= 0.45;
  findings.push({
    check: "layout_family",
    passed: familyOk,
    message: familyOk
      ? `Layout family ${input.classification.family} confidence ${input.classification.confidence}`
      : `Layout family confidence too low: ${input.classification.confidence}`,
  });

  // Required fields mapped.
  const requiredOk = input.unmappedRequiredKeys.length === 0;
  findings.push({
    check: "required_fields",
    passed: requiredOk,
    message: requiredOk
      ? "All required fields mapped."
      : `Unmapped required keys: ${input.unmappedRequiredKeys.join(", ")}`,
  });

  // Pixel collisions.
  const rectangles = input.mappings.flatMap((m) =>
    m.rectangles.map((r) => ({ key: m.ontologyKey, rect: r.absolute })),
  );
  const collisionResult = validatePixelCollisions(rectangles);
  findings.push({
    check: "pixel_collision",
    passed: collisionResult.passed,
    message: collisionResult.message,
  });

  // Overflow.
  const overflowResult = validateOverflow(
    input.mappings.flatMap((m) =>
      m.rectangles.map((r) => ({
        key: m.ontologyKey,
        rect: r.absolute,
      })),
    ),
  );
  findings.push({
    check: "overflow",
    passed: overflowResult.passed,
    message: overflowResult.message,
  });

  // Signature regions.
  const signatureMappings = input.mappings
    .filter((m) => m.field.supportedWidgets.includes("SIGNATURE"))
    .flatMap((m) =>
      m.rectangles.map((r) => ({
        key: m.ontologyKey,
        rect: r.absolute,
        role: m.field.role,
      })),
    );
  const signatureResult = validateSignatureRegions(signatureMappings);
  findings.push({
    check: "signature_region",
    passed: signatureResult.passed,
    message: signatureResult.message,
  });

  const passedChecks = findings.filter((f) => f.passed).length;
  const totalChecks = findings.length;
  const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

  let status: CalibrationQualityReport["status"] = "MANUAL_CALIBRATION_REQUIRED";
  if (score >= 90 && requiredOk && familyOk && collisionResult.passed && overflowResult.passed) {
    status = "AUTO_REVIEW_CANDIDATE";
  } else if (score >= 60) {
    status = "ASSISTED_REVIEW";
  }

  return {
    reportId: crypto.randomUUID?.() ?? `report-${Date.now()}`,
    candidateId: "", // filled by caller
    score,
    status,
    findings,
  };
}
