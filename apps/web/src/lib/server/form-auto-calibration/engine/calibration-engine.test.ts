import { describe, test } from "node:test";
import assert from "node:assert";
import { CalibrationEngine } from "./calibration-engine";
import { createBlankPdfWithFields } from "../tests/fixtures/blank-form-builder";

describe("calibration-engine", () => {
  test("calibrates a blank form with matching fields", async () => {
    const buffer = await createBlankPdfWithFields([
      { name: "patient_name", label: "Patient Name", page: 0, x: 100, y: 600, width: 200, height: 20 },
      { name: "patient_mrn", label: "Medical Record Number", page: 0, x: 100, y: 560, width: 150, height: 20 },
      { name: "patient_dob", label: "Date of Birth", page: 0, x: 100, y: 520, width: 120, height: 20 },
      { name: "patient_signature", label: "Patient Signature", page: 0, x: 100, y: 150, width: 200, height: 40 },
      { name: "physician_signature", label: "Physician Signature", page: 0, x: 350, y: 150, width: 200, height: 40 },
    ]);

    const engine = new CalibrationEngine();
    const result = await engine.calibrate({
      sourceFormId: "test-form",
      sourceFileName: "test-form.pdf",
      pdfBuffer: buffer,
    });

    assert.ok(result.candidateId.length > 0);
    assert.ok(result.score >= 0);
    assert.ok(["auto_review_candidate", "assisted_review", "manual_calibration_required"].includes(result.status));
  });

  test("returns manual status when no fields match", async () => {
    const buffer = await createBlankPdfWithFields([
      { name: "unrelated_field", label: "Random Unrelated Label", page: 0, x: 100, y: 600, width: 200, height: 20 },
    ]);

    const engine = new CalibrationEngine();
    const result = await engine.calibrate({
      sourceFormId: "empty-form",
      sourceFileName: "empty-form.pdf",
      pdfBuffer: buffer,
    });

    assert.equal(result.status, "manual_calibration_required");
  });
});
