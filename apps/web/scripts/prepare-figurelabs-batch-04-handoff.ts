/**
 * Prepare a clean FigureLabs handoff package for Batch 4.
 *
 * Usage:
 *   npx tsx scripts/prepare-figurelabs-batch-03-handoff.ts
 *
 * Outputs:
 *   figurelabs_batch_04_handoff_package.zip
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname } from "node:path";

const BATCH_CSV = "../../docs/clinical-illustrations/batches/figurelabs_batch_04_priority_20.csv";
const BATCH_CHECKLIST = "../../docs/clinical-illustrations/batches/figurelabs_batch_04_production_checklist.md";
const OUTPUT_DIR = "../../.tmp-handoff/figurelabs_batch_04_handoff_package";

const STATUS = {
  production_status: "pending_figurelabs_generation",
  imageReviewStatus: "pending_generation",
  integration_status: "not_integrated",
};

interface ManualReviewItem {
  sequence: number;
  procedureNameEn: string;
  field: string;
  proposedValueAr: string;
  status: string;
}

function buildManualReviewItems(rows: Record<string, string>[]): ManualReviewItem[] {
  const items: ManualReviewItem[] = [];
  for (const r of rows) {
    const ar = r.procedureNameAr?.trim() ?? "";
    const en = r.procedureNameEn?.trim() ?? "";
    if (!ar || ar.toLowerCase() === en.toLowerCase()) {
      items.push({
        sequence: Number(r.sequence),
        procedureNameEn: en,
        field: "procedureNameAr",
        proposedValueAr: ar || en,
        status: "subject to clinical review",
      });
    }
  }
  return items;
}

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

function csvEscape(value: string | number | boolean): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows: Record<string, string>[], columns: string[]): string {
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((col) => csvEscape(row[col])).join(","));
  }
  return lines.join("\n");
}

function main() {
  const rows = parseCsv(readFileSync(BATCH_CSV, "utf8"));
  const manualReviewItems = buildManualReviewItems(rows);

  mkdirSync(OUTPUT_DIR, { recursive: true });

  // 1. Copy batch CSV with updated status columns.
  const statusColumns = ["sequence", "specialty", "procedureNameEn", "procedureNameAr", "canonicalProcedureKey", "production_status", "imageReviewStatus", "integration_status", "illustrationType", "anatomyRegion", "figureLabsPrompt", "imageFileName", "imagePublicPath", "certificatePath", "notes"];
  const rowsWithStatus = rows.map((r) => ({
    ...r,
    production_status: STATUS.production_status,
    imageReviewStatus: STATUS.imageReviewStatus,
    integration_status: STATUS.integration_status,
  }));
  writeFileSync(`${OUTPUT_DIR}/figurelabs_batch_04_priority_20.csv`, toCsv(rowsWithStatus, statusColumns), "utf8");

  // 2. Copy checklist.
  copyFileSync(BATCH_CHECKLIST, `${OUTPUT_DIR}/figurelabs_batch_04_production_checklist.md`);

  // 3. Prompts file — one copy/paste prompt per procedure.
  const promptsLines: string[] = ["# FigureLabs Batch 4 Prompts", ""];
  promptsLines.push(`Total procedures: ${rows.length}`);
  promptsLines.push("");
  promptsLines.push("Generate one separate clean PNG per procedure. Do not use screenshots or collage crops.");
  promptsLines.push("");
  for (const r of rows) {
    promptsLines.push(`## ${r.sequence}. ${r.procedureNameEn}`);
    promptsLines.push("");
    promptsLines.push("```text");
    promptsLines.push(r.figureLabsPrompt);
    promptsLines.push("```");
    promptsLines.push("");
  }
  writeFileSync(`${OUTPUT_DIR}/figurelabs_batch_04_prompts.md`, promptsLines.join("\n"), "utf8");

  // 4. Expected filenames.
  const filenameRows = rows.map((r) => ({
    sequence: r.sequence,
    procedureNameEn: r.procedureNameEn,
    expectedImageFileName: r.imageFileName,
    expectedCertificateFileName: `${r.canonicalProcedureKey}_figurelabs_authorization_certificate_v1.pdf`,
  }));
  writeFileSync(
    `${OUTPUT_DIR}/figurelabs_batch_04_expected_filenames.csv`,
    toCsv(filenameRows, ["sequence", "procedureNameEn", "expectedImageFileName", "expectedCertificateFileName"]),
    "utf8",
  );

  // 5. Expected public paths.
  const publicPathRows = rows.map((r) => ({
    sequence: r.sequence,
    procedureNameEn: r.procedureNameEn,
    expectedPublicImageUrl: r.imagePublicPath.replace(/^apps\/web\/public/, ""),
    expectedProjectImagePath: r.imagePublicPath,
    expectedCertificatePath: r.certificatePath,
  }));
  writeFileSync(
    `${OUTPUT_DIR}/figurelabs_batch_04_expected_public_paths.csv`,
    toCsv(publicPathRows, ["sequence", "procedureNameEn", "expectedPublicImageUrl", "expectedProjectImagePath", "expectedCertificatePath"]),
    "utf8",
  );

  // 6. Manual review items.
  const reviewRows = manualReviewItems.map((item) => ({
    sequence: String(item.sequence),
    procedureNameEn: item.procedureNameEn,
    field: item.field,
    proposedValueAr: item.proposedValueAr,
    status: item.status,
  }));
  // Add a duplicate check row.
  const seenKeys = new Set<string>();
  const seenNames = new Set<string>();
  let duplicates = 0;
  for (const r of rows) {
    if (seenKeys.has(r.canonicalProcedureKey) || seenNames.has(r.procedureNameEn)) {
      duplicates++;
    }
    seenKeys.add(r.canonicalProcedureKey);
    seenNames.add(r.procedureNameEn);
  }
  reviewRows.push({
    sequence: "-",
    procedureNameEn: "Batch 4 duplicate check",
    field: "canonicalProcedureKey / procedureNameEn",
    proposedValueAr: duplicates === 0 ? "No duplicates detected" : `${duplicates} duplicate(s) detected`,
    status: duplicates === 0 ? "ok" : "needs_manual_review",
  });
  writeFileSync(
    `${OUTPUT_DIR}/figurelabs_batch_04_manual_review_items.csv`,
    toCsv(reviewRows, ["sequence", "procedureNameEn", "field", "proposedValueAr", "status"]),
    "utf8",
  );

  // 7. README for FigureLabs.
  const figurelabsReadme = `# FigureLabs Batch 4 Handoff Package

## Scope
Generate **20 separate, clean PNG illustrations** for the procedures listed in 
\`figurelabs_batch_04_priority_20.csv\`.

## Global requirements for every image
- One separate PNG per procedure. No composite images, no screenshots, no collage crops.
- Patient-friendly, non-graphic, non-bloody, hospital-grade education style.
- Landscape orientation, high resolution, suitable for informed consent display.
- English labels with space for Arabic overlays.
- White or very light background.
- Leave a blank area at the bottom for the informed consent disclaimer.
- No hospital logos, no watermarks, no patient-identifiable information.

## Output naming
Use the exact filenames in \`figurelabs_batch_04_expected_filenames.csv\`.
Do not rename files.

## Output paths
Store images under the project paths in \`figurelabs_batch_04_expected_public_paths.csv\`.

## Authorization certificates
Provide a separate authorization certificate for each illustration.
Expected certificate filenames are listed in \`figurelabs_batch_04_expected_filenames.csv\`.

## Prompts
Copy/paste prompts are in \`figurelabs_batch_04_prompts.md\`.

## Manual review items
Arabic translations marked "subject to clinical review" are in
\`figurelabs_batch_04_manual_review_items.csv\`.

## Status
- production_status: pending_figurelabs_generation
- imageReviewStatus: pending_generation
- integration_status: not_integrated
`;
  writeFileSync(`${OUTPUT_DIR}/README_FOR_FIGURELABS.md`, figurelabsReadme, "utf8");

  // 8. README for engineering after generation.
  const engineeringReadme = `# Engineering Integration Guide — Batch 4

## After FigureLabs delivers the PNGs
1. Receive the generated PNG files and authorization certificates.
2. Copy the PNGs into \`apps/web/public/educational/clinical-illustrations/\` using the exact folder structure and filenames from \`figurelabs_batch_04_expected_public_paths.csv\`.
3. Place authorization certificates under \`docs/clinical-illustrations/figurelabs/<canonicalProcedureKey>/\`.
4. Open \`apps/web/src/lib/server/clinical-knowledge/migration/figurelabs-batch-data.ts\`.
   - Convert the Batch 4 keys into full \`BatchIllustration\` records.
   - Set \`imageReviewStatus: "approved"\` and \`patientFacing: true\` only after formal clinical and Arabic translation review.
   - Set the actual \`procedureImageUrl\` paths.
   - Apply the clinically reviewed Arabic names from \`figurelabs_batch_04_manual_review_items.csv\`.
5. Update \`apps/web/src/lib/server/clinical-knowledge/migration/seed-from-imc.ts\` to iterate the Batch 4 approved records (same pattern as Batch 1).
6. Regenerate the registry:
   \`\`\`bash
   cd apps/web
   npx tsx scripts/generate-figurelabs-registry.ts
   npx tsx scripts/generate-figurelabs-batch-03.ts
   npx tsx scripts/generate-figurelabs-batch-03-checklist.ts
   \`\`\`
7. Run validation and checks:
   \`\`\`bash
   npx tsx scripts/validate-figurelabs-registry.ts
   npx tsx --test src/lib/server/clinical-knowledge/migration/seed-from-imc.test.ts
   npx tsc --noEmit
   npx eslint ...
   npm run build
   \`\`\`
8. Commit and push.

## Current status
- production_status: pending_figurelabs_generation
- imageReviewStatus: pending_generation
- integration_status: not_integrated
- Seed mapping: not yet wired to Batch 4 images.
`;
  writeFileSync(`${OUTPUT_DIR}/README_FOR_ENGINEERING_AFTER_GENERATION.md`, engineeringReadme, "utf8");

  // Zip the package.
  const outputDirParent = dirname(OUTPUT_DIR);
  const zipName = "figurelabs_batch_04_handoff_package.zip";
  // Output to project root (two levels up from apps/web/scripts).
  const zipTarget = `${process.cwd()}/../../${zipName}`;

  let zipped = false;

  // Prefer system \`zip\`.
  try {
    execSync(`zip -r "${zipName}" "figurelabs_batch_04_handoff_package"`, {
      cwd: outputDirParent,
      stdio: "ignore",
    });
    zipped = true;
  } catch {
    // Ignore; try PowerShell fallback below.
  }

  // Windows fallback.
  if (!zipped) {
    try {
      execSync(
        `powershell -Command "Compress-Archive -Path '${outputDirParent.replace(/\//g, "\\\\")}\\\\figurelabs_batch_04_handoff_package' -DestinationPath '${zipTarget.replace(/\//g, "\\\\")}' -Force"`,
        { stdio: "ignore" },
      );
      zipped = true;
    } catch {
      // Ignore.
    }
  }

  if (!zipped) {
    throw new Error("Failed to create ZIP. Ensure 'zip' or PowerShell Compress-Archive is available.");
  }

  console.log(`Handoff package created: ${zipTarget}`);
  console.log(`Procedures: ${rows.length}`);
  console.log(`Manual review items: ${manualReviewItems.length}`);
  console.log(`Duplicate check: ${duplicates === 0 ? "No duplicates detected" : duplicates + " duplicate(s) detected"}`);
}

main();
