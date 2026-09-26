/**
 * Generate a human-friendly production checklist for FigureLabs Batch 4.
 *
 * Usage:
 *   npx tsx scripts/generate-figurelabs-batch-03-checklist.ts
 *
 * Outputs:
 *   docs/clinical-illustrations/batches/figurelabs_batch_04_production_checklist.md
 */

import { writeFileSync, readFileSync } from "node:fs";

const BATCH_CSV = "../../docs/clinical-illustrations/batches/figurelabs_batch_04_priority_20.csv";
const OUTPUT_MD = "../../docs/clinical-illustrations/batches/figurelabs_batch_04_production_checklist.md";

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

function main() {
  const batchRows = parseCsv(readFileSync(BATCH_CSV, "utf8"));

  const sections: string[] = [];

  sections.push(`# FigureLabs Batch 4 Production Checklist`);
  sections.push("");
  sections.push(`**Total procedures:** ${batchRows.length}`);
  sections.push("");
  sections.push("Use this checklist when requesting, reviewing, and exporting illustrations from FigureLabs.");
  sections.push("Do not use screenshots. Export clean PNGs only. Store authorization certificates in the specified paths.");
  sections.push("");

  for (const row of batchRows) {
    sections.push(`## ${row.sequence}. ${row.procedureNameEn}`);
    sections.push("");
    sections.push(`- **Procedure name (EN):** ${row.procedureNameEn}`);
    sections.push(`- **Procedure name (AR):** ${row.procedureNameAr}`);
    sections.push(`- **Specialty:** ${row.specialty}`);
    sections.push(`- **Anatomy region / focus:** ${row.anatomyRegion}`);
    sections.push(`- **Illustration type:** ${row.illustrationType}`);
    sections.push(`- **Status:** pending_generation`);
    if (row.notes) sections.push(`- **Notes:** ${row.notes}`);
    sections.push("");
    sections.push("### FigureLabs prompt (copy/paste)");
    sections.push("");
    sections.push("```text");
    sections.push(row.figureLabsPrompt);
    sections.push("```");
    sections.push("");
    sections.push("### Required files");
    sections.push("");
    sections.push(`- **Image filename:** \`${row.imageFileName}\``);
    sections.push(`- **Public image path:** \`${row.imagePublicPath}\``);
    sections.push(`- **Certificate path:** \`${row.certificatePath}\``);
    sections.push("");
    sections.push("---");
    sections.push("");
  }

  sections.push("");
  sections.push("## Summary");
  sections.push("");
  sections.push(`- **Procedures queued for FigureLabs generation:** ${batchRows.length}`);
  sections.push("- **Already approved / completed:** 0");
  sections.push("");

  writeFileSync(OUTPUT_MD, sections.join("\n"), "utf8");
  console.log(`Wrote Batch 4 production checklist to ${OUTPUT_MD}`);
}

main();
