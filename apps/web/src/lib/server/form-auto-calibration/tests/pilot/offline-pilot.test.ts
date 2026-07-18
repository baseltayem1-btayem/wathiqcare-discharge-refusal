import { describe, test } from "node:test";
import assert from "node:assert";
import fs from "fs/promises";
import path from "path";
import { CalibrationEngine } from "../../engine/calibration-engine";

const APPROVED_FORMS_DIR = path.join(process.cwd(), "public", "approved-consent-forms");

const REPRESENTATIVE_FORMS = [
  "appendectomy-consent.pdf",
  "anesthesia-patient-consent.pdf",
  "abdominal-aortic-aneurysm.pdf",
  "allergy-skin-test-consent-and-informed.pdf",
  "amputation.pdf",
  "angiogram-and-plasty-stenting.pdf",
  "adenotonsillectomy.pdf",
];

describe("offline pilot on representative blank forms", () => {
  for (const fileName of REPRESENTATIVE_FORMS) {
    test(`calibrates ${fileName}`, async () => {
      const buffer = await fs.readFile(path.join(APPROVED_FORMS_DIR, fileName));
      const engine = new CalibrationEngine();
      const result = await engine.calibrate({
        sourceFormId: fileName.replace(/\.pdf$/i, ""),
        sourceFileName: fileName,
        pdfBuffer: buffer,
      });

      assert.ok(result.candidateId.length > 0, "candidate should be created");
      assert.ok(result.score >= 0, "score should be computed");
      assert.ok(
        ["auto_review_candidate", "assisted_review", "manual_calibration_required"].includes(result.status),
        "status should be valid",
      );
    });
  }
});
