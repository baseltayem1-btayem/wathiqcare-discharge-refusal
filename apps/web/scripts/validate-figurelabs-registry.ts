/**
 * Validate the FigureLabs procedure illustration registry CSV.
 *
 * Usage:
 *   npx tsx scripts/validate-figurelabs-registry.ts
 */

import { readFileSync, existsSync } from "node:fs";
import { BATCH_1_ILLUSTRATIONS } from "./figurelabs-registry-data";

const CSV_PATH = "../../docs/clinical-illustrations/procedure_illustration_registry.csv";
const BATCH_1_NAMES = new Set(
  Object.values(BATCH_1_ILLUSTRATIONS).flatMap((b) => [
    b.procedureNameEn.toLowerCase(),
    ...(b.aliases ?? []).map((a) => a.toLowerCase()),
  ]),
);

function parseCsv(content: string): Record<string, string>[] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let insideQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i + 1];

    if (insideQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        insideQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ",") {
        current.push(field);
        field = "";
      } else if (char === "\n" || char === "\r") {
        if (char === "\r" && next === "\n") {
          i++;
        }
        current.push(field);
        if (current.length > 1 || current[0] !== "" || field !== "") {
          rows.push(current);
        }
        current = [];
        field = "";
      } else {
        field += char;
      }
    }
  }

  // Flush final field/row
  current.push(field);
  if (current.length > 1 || current[0] !== "" || field !== "") {
    rows.push(current);
  }

  const headers = rows[0];
  return rows.slice(1).map((values) => {
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}

function main() {
  const content = readFileSync(CSV_PATH, "utf8");
  const rows = parseCsv(content);

  const errors: string[] = [];
  const keys = new Set<string>();

  for (const row of rows) {
    const key = row.canonicalProcedureKey;
    if (!key) {
      errors.push(`Missing canonicalProcedureKey in row ${row.sequence}`);
    } else if (keys.has(key)) {
      errors.push(`Duplicate canonicalProcedureKey: ${key}`);
    } else {
      keys.add(key);
    }

    if (!row.procedureNameEn?.trim()) errors.push(`Missing procedureNameEn for key ${key || row.sequence}`);
    if (!row.specialty?.trim()) errors.push(`Missing specialty for key ${key || row.sequence}`);
    if (!row.anatomyRegion?.trim()) errors.push(`Missing anatomyRegion for key ${key || row.sequence}`);
    if (!row.figureLabsPrompt?.trim()) errors.push(`Missing figureLabsPrompt for key ${key || row.sequence}`);
    if (!row.imageReviewStatus?.trim()) errors.push(`Missing imageReviewStatus for key ${key || row.sequence}`);

    const expectedPrefix = "apps/web/public/educational/clinical-illustrations/";
    if (!row.imagePublicPath?.startsWith(expectedPrefix)) {
      errors.push(`Invalid imagePublicPath for key ${key || row.sequence}: ${row.imagePublicPath}`);
    }

    if (row.imageReviewStatus === "approved") {
      const publicFile = row.imagePublicPath.replace(/^apps\/web\//, "");
      if (!existsSync(publicFile)) {
        errors.push(`Approved image file missing for key ${key || row.sequence}: ${publicFile}`);
      }
    }
  }

  const approvedLapChole = rows.find(
    (r) =>
      r.procedureNameEn.toLowerCase() === "laparoscopic cholecystectomy" ||
      r.procedureNameEn.toLowerCase() === "cholecystectomy laparoscopic",
  );

  if (!approvedLapChole) {
    errors.push("Approved Laparoscopic Cholecystectomy row not found");
  } else {
    if (approvedLapChole.imageReviewStatus !== "approved") {
      errors.push("Laparoscopic Cholecystectomy must have imageReviewStatus = approved");
    }
    if (approvedLapChole.patientFacing !== "true") {
      errors.push("Laparoscopic Cholecystectomy must have patientFacing = true");
    }
    const aliases = approvedLapChole.aliases.split(" | ");
    for (const required of ["Laparoscopic Cholecystectomy", "Cholecystectomy Laparoscopic", "Lap Chole", "استئصال المرارة بالمنظار"]) {
      if (!aliases.includes(required)) {
        errors.push(`Laparoscopic Cholecystectomy missing alias: ${required}`);
      }
    }
  }

  const batchRows = rows.filter((r) => BATCH_1_NAMES.has(r.procedureNameEn.toLowerCase()));
  if (batchRows.length !== Object.keys(BATCH_1_ILLUSTRATIONS).length) {
    errors.push(
      `Expected ${Object.keys(BATCH_1_ILLUSTRATIONS).length} Batch 1 rows, found ${batchRows.length}`,
    );
  }

  const genericPhraseRows = rows.filter((r) =>
    r.anatomyRegion.toLowerCase().includes("surgical field related to"),
  );
  if (genericPhraseRows.length) {
    errors.push(
      `${genericPhraseRows.length} row(s) still contain generic anatomy phrase "Surgical field related to"`,
    );
  }

  const nonBatchApproved = rows.filter(
    (r) => !BATCH_1_NAMES.has(r.procedureNameEn.toLowerCase()) && r.imageReviewStatus === "approved",
  );
  if (nonBatchApproved.length) {
    errors.push(`${nonBatchApproved.length} non-Batch-1 row(s) have imageReviewStatus = approved`);
  }

  const nonBatchPatientFacing = rows.filter(
    (r) => !BATCH_1_NAMES.has(r.procedureNameEn.toLowerCase()) && r.patientFacing === "true",
  );
  if (nonBatchPatientFacing.length) {
    errors.push(`${nonBatchPatientFacing.length} non-Batch-1 row(s) have patientFacing = true`);
  }

  console.log(`Validated ${rows.length} rows.`);

  if (errors.length) {
    console.error(`${errors.length} validation error(s):`);
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  console.log("All registry validations passed.");
}

main();
