/**
 * Batch dry-run command for the form auto-calibration engine.
 *
 * Usage:
 *   npx tsx -r dotenv/config scripts/form-calibration-dry-run.ts
 *
 * Runs the engine on a representative set of blank approved consent PDFs and
 * prints a JSON report. No database writes; uses the in-memory registry.
 */

import fs from "fs/promises";
import path from "path";
import { CalibrationEngine } from "../src/lib/server/form-auto-calibration/engine/calibration-engine";
import { InMemoryCandidateRegistry } from "../src/lib/server/form-auto-calibration/registry/candidate-registry";

const APPROVED_FORMS_DIR = path.join(process.cwd(), "public", "approved-consent-forms");

const REPRESENTATIVE_FORM_FILES = [
  "appendectomy-consent.pdf",
  "anesthesia-patient-consent.pdf",
  "abdominal-aortic-aneurysm.pdf",
  "allergy-skin-test-consent-and-informed.pdf",
  "amputation.pdf",
  "angiogram-and-plasty-stenting.pdf",
  "adenotonsillectomy.pdf",
];

async function main() {
  const registry = new InMemoryCandidateRegistry();
  const engine = new CalibrationEngine({ registry });
  const results: Array<{
    sourceFormId: string;
    sourceFileName: string;
    candidateId: string;
    status: string;
    score: number;
    unmappedRequiredKeys: string[];
    error?: string;
  }> = [];

  for (const sourceFileName of REPRESENTATIVE_FORM_FILES) {
    const sourceFormId = sourceFileName.replace(/\.pdf$/i, "");
    try {
      const buffer = await fs.readFile(path.join(APPROVED_FORMS_DIR, sourceFileName));
      const result = await engine.calibrate({ sourceFormId, sourceFileName, pdfBuffer: buffer });
      results.push({
        sourceFormId,
        sourceFileName,
        ...result,
      });
    } catch (err) {
      results.push({
        sourceFormId,
        sourceFileName,
        candidateId: "",
        status: "error",
        score: 0,
        unmappedRequiredKeys: [],
        error: (err as Error).message,
      });
    }
  }

  const summary = {
    total: results.length,
    auto: results.filter((r) => r.status === "auto_review_candidate").length,
    assisted: results.filter((r) => r.status === "assisted_review").length,
    manual: results.filter((r) => r.status === "manual_calibration_required").length,
    errors: results.filter((r) => r.status === "error").length,
    averageScore: Math.round(
      (results.reduce((sum, r) => sum + r.score, 0) / results.length) * 100,
    ) / 100,
  };

  const report = {
    ok: summary.errors === 0,
    generatedAt: new Date().toISOString(),
    summary,
    results,
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(summary.errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
