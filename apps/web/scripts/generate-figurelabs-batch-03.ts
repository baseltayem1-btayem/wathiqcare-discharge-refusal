/**
 * Generate FigureLabs Batch 3 CSV from the master registry.
 *
 * Usage:
 *   npx tsx scripts/generate-figurelabs-batch-03.ts
 *
 * Outputs:
 *   docs/clinical-illustrations/batches/figurelabs_batch_03_priority_20.csv
 */

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { BATCH_3_KEYS } from "../src/lib/server/clinical-knowledge/migration/figurelabs-batch-data";

const REGISTRY_PATH = "../../docs/clinical-illustrations/procedure_illustration_registry.csv";
const OUTPUT_PATH = "../../docs/clinical-illustrations/batches/figurelabs_batch_03_priority_20.csv";

const BATCH_COLUMNS = [
  "sequence",
  "specialty",
  "procedureNameEn",
  "procedureNameAr",
  "canonicalProcedureKey",
  "anatomyRegion",
  "illustrationType",
  "figureLabsPrompt",
  "imageFileName",
  "imagePublicPath",
  "certificatePath",
  "imageReviewStatus",
  "patientFacing",
  "notes",
];

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
        if (char === "\r" && next === "\n") i++;
        current.push(field);
        if (current.length > 1 || current[0] !== "" || field !== "") rows.push(current);
        current = [];
        field = "";
      } else {
        field += char;
      }
    }
  }
  current.push(field);
  if (current.length > 1 || current[0] !== "" || field !== "") rows.push(current);

  const headers = rows[0];
  return rows.slice(1).map((values) => {
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
}

function csvEscape(value: string | number | boolean): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function main() {
  const registryRows = parseCsv(readFileSync(REGISTRY_PATH, "utf8"));
  const registryByKey = new Map(registryRows.map((r) => [r.canonicalProcedureKey, r]));

  const selected: Record<string, string>[] = [];
  for (let i = 0; i < BATCH_3_KEYS.length; i++) {
    const key = BATCH_3_KEYS[i];
    const row = registryByKey.get(key);
    if (!row) {
      console.warn(`Batch 3 key not found in registry: ${key}`);
      continue;
    }
    selected.push({ ...row, sequence: String(i + 1) });
  }

  if (selected.length !== BATCH_3_KEYS.length) {
    console.warn(`Batch contains ${selected.length} rows instead of ${BATCH_3_KEYS.length}.`);
  }

  const lines = [BATCH_COLUMNS.join(",")];
  for (const row of selected) {
    lines.push(BATCH_COLUMNS.map((col) => csvEscape(row[col])).join(","));
  }

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, lines.join("\n"), "utf8");

  console.log(`Wrote ${selected.length} Batch 3 rows to ${OUTPUT_PATH}`);
}

main();
