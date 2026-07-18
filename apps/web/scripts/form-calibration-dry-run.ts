/**
 * Batch dry-run command for the form auto-calibration engine.
 *
 * Usage:
 *   npx tsx -r dotenv/config scripts/form-calibration-dry-run.ts
 *
 * Runs the engine on a representative set of blank approved consent PDFs and
 * prints a deterministic evidence report. No database writes; uses the
 * in-memory registry and keeps AI disabled.
 */

import fs from "fs/promises";
import path from "path";
import { CalibrationEngine } from "../src/lib/server/form-auto-calibration/engine/calibration-engine";
import { InMemoryCandidateRegistry } from "../src/lib/server/form-auto-calibration/registry/candidate-registry";
import { IMC_APPROVED_CONSENT_FORMS_MANIFEST } from "../src/lib/server/imc-approved-consent-forms.manifest";

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

function formatList(items: string[]): string {
  return items.length === 0 ? "-" : items.join(", ");
}

async function main() {
  const registry = new InMemoryCandidateRegistry();
  const engine = new CalibrationEngine({ registry });
  const results: Array<{
    sourceFormId: string;
    sourceFileName: string;
    formType: string;
    candidateId: string;
    status: string;
    score: number;
    layoutFamily: string;
    proposedFields: number;
    mappedKeys: string[];
    unmappedRequiredKeys: string[];
    qualityGateResult: string;
    error?: string;
  }> = [];

  for (const sourceFileName of REPRESENTATIVE_FORM_FILES) {
    const sourceFormId = sourceFileName.replace(/\.pdf$/i, "");
    const normalizedFileId = sourceFormId.toLowerCase().replace(/[-_\s]+/g, "-");
    const manifestItem = IMC_APPROVED_CONSENT_FORMS_MANIFEST.find(
      (item) =>
        item.sourceFile.toLowerCase() === sourceFileName.toLowerCase() ||
        item.slug.toLowerCase() === normalizedFileId ||
        item.slug.toLowerCase().replace(/[-_\s]+/g, "-") === normalizedFileId,
    );

    try {
      const buffer = await fs.readFile(path.join(APPROVED_FORMS_DIR, sourceFileName));
      const result = await engine.calibrate({ sourceFormId, sourceFileName, pdfBuffer: buffer });
      results.push({
        sourceFormId,
        sourceFileName,
        formType: manifestItem?.category ?? "unknown",
        candidateId: result.candidateId,
        status: result.status,
        score: result.score,
        layoutFamily: result.layoutFamily,
        proposedFields: result.proposedFields,
        mappedKeys: result.mappedKeys,
        unmappedRequiredKeys: result.unmappedRequiredKeys,
        qualityGateResult: result.qualityGateResult,
      });
    } catch (err) {
      results.push({
        sourceFormId,
        sourceFileName,
        formType: manifestItem?.category ?? "unknown",
        candidateId: "",
        status: "error",
        score: 0,
        layoutFamily: "unknown",
        proposedFields: 0,
        mappedKeys: [],
        unmappedRequiredKeys: [],
        qualityGateResult: "MANUAL_CALIBRATION_REQUIRED",
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
    averageScore:
      Math.round((results.reduce((sum, r) => sum + r.score, 0) / results.length) * 100) / 100,
  };

  // Markdown evidence table.
  console.log("# Form Auto-Calibration Dry-Run Evidence\n");
  console.log("| Form ID | Form Type | Layout Family | Proposed Fields | Mapped Required Fields | Unmapped Required Fields | Confidence Score | Quality-Gate Result | Final Review Status |");
  console.log("|---|---|---|---|---|---|---|---|---|");
  for (const r of results) {
    console.log(
      `| ${r.sourceFormId} | ${r.formType} | ${r.layoutFamily} | ${r.proposedFields} | ${formatList(r.mappedKeys)} | ${formatList(r.unmappedRequiredKeys)} | ${r.score} | ${r.qualityGateResult} | ${r.status} |`,
    );
  }

  console.log("\n## Summary");
  console.log(JSON.stringify(summary, null, 2));

  const report = {
    ok: summary.errors === 0,
    generatedAt: new Date().toISOString(),
    summary,
    results,
  };

  console.log("\n## Machine-readable report");
  console.log(JSON.stringify(report, null, 2));
  process.exit(summary.errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
