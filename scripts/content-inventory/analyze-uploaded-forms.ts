#!/usr/bin/env tsx
/**
 * Phase 42 — Analyze uploaded approved forms and build the clinical content library.
 *
 * Source of truth:
 *   apps/web/src/components/informed-consents/enterprise-workflow/imcApprovedConsentLibrary.generated.ts
 *
 * Outputs (under docs/content-inventory/):
 *   - master-inventory.json
 *   - consent-forms.json
 *   - education-materials.json
 *   - procedure-mapping-matrix.json
 *   - procedure-to-content-catalog.md
 *   - coverage-statistics.md
 */

import fs from "node:fs/promises";
import path from "node:path";
import {
  imcApprovedConsentLibraryGenerated,
  type ImcApprovedConsentLibraryItem,
} from "../../apps/web/src/components/informed-consents/enterprise-workflow/imcApprovedConsentLibrary.generated";

const OUT_DIR = path.join(process.cwd(), "docs", "content-inventory");

const SOURCE_FILE =
  "apps/web/src/components/informed-consents/enterprise-workflow/imcApprovedConsentLibrary.generated.ts";

type ContentKind = "CONSENT_FORM" | "EDUCATION_MATERIAL";

type InventoryItem = {
  id: string;
  procedureId: string;
  procedureNameEn: string;
  procedureNameAr: string;
  specialty: string;
  department: string;
  categoryCode: string;
  consentType: string;
  language: string;
  version: string;
  status: string;
  kind: ContentKind;
  fileName: string;
  sourceItemId: string;
  anesthesiaRequired: boolean;
};

type ProcedureMapping = {
  procedureId: string;
  procedureNameEn: string;
  procedureNameAr: string;
  specialty: string;
  department: string;
  categoryCode: string;
  consentType: string;
  language: string;
  version: string;
  anesthesiaRequired: boolean;
  consentForms: string[];
  educationMaterials: string[];
  hasConsent: boolean;
  hasEducation: boolean;
  sameFileUsedForBoth: boolean;
  completeness: "COMPLETE" | "CONSENT_ONLY" | "EDUCATION_ONLY" | "MISSING";
  missingFields: string[];
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function makeProcedureId(item: ImcApprovedConsentLibraryItem): string {
  return slugify(item.titleEn) || item.id;
}

function classifyFiles(item: ImcApprovedConsentLibraryItem): {
  consentForms: InventoryItem[];
  educationMaterials: InventoryItem[];
} {
  const procedureId = makeProcedureId(item);
  const base = {
    procedureId,
    procedureNameEn: item.titleEn,
    procedureNameAr: item.titleAr,
    specialty: item.specialty,
    department: item.department,
    categoryCode: item.categoryCode,
    consentType: item.consentType,
    language: item.language,
    version: item.version,
    status: item.status,
    sourceItemId: item.id,
    anesthesiaRequired: item.anesthesiaRequired,
  };

  const consentForms: InventoryItem[] = item.hospitalPdfFilename
    ? [
        {
          ...base,
          id: `${item.id}-consent`,
          kind: "CONSENT_FORM",
          fileName: item.hospitalPdfFilename,
        },
      ]
    : [];

  const educationMaterials: InventoryItem[] = item.patientEducationPdfFilename
    ? [
        {
          ...base,
          id: `${item.id}-education`,
          kind: "EDUCATION_MATERIAL",
          fileName: item.patientEducationPdfFilename,
        },
      ]
    : [];

  return { consentForms, educationMaterials };
}

function buildProcedureMapping(item: ImcApprovedConsentLibraryItem): ProcedureMapping {
  const procedureId = makeProcedureId(item);
  const consentForms = item.hospitalPdfFilename ? [item.hospitalPdfFilename] : [];
  const educationMaterials = item.patientEducationPdfFilename ? [item.patientEducationPdfFilename] : [];

  const missingFields: string[] = [];
  if (!item.titleEn.trim()) missingFields.push("titleEn");
  if (!item.titleAr.trim()) missingFields.push("titleAr");
  if (!item.specialty.trim()) missingFields.push("specialty");
  if (!item.department.trim()) missingFields.push("department");
  if (!item.categoryCode.trim()) missingFields.push("categoryCode");
  if (!item.consentType.trim()) missingFields.push("consentType");
  if (!item.language.trim()) missingFields.push("language");
  if (!item.version.trim()) missingFields.push("version");

  const hasConsent = consentForms.length > 0;
  const hasEducation = educationMaterials.length > 0;
  const sameFileUsedForBoth =
    hasConsent && hasEducation && consentForms[0] === educationMaterials[0];

  let completeness: ProcedureMapping["completeness"];
  if (!hasConsent && !hasEducation) completeness = "MISSING";
  else if (hasConsent && hasEducation) completeness = "COMPLETE";
  else if (hasConsent && !hasEducation) completeness = "CONSENT_ONLY";
  else completeness = "EDUCATION_ONLY";

  return {
    procedureId,
    procedureNameEn: item.titleEn,
    procedureNameAr: item.titleAr,
    specialty: item.specialty,
    department: item.department,
    categoryCode: item.categoryCode,
    consentType: item.consentType,
    language: item.language,
    version: item.version,
    anesthesiaRequired: item.anesthesiaRequired,
    consentForms,
    educationMaterials,
    hasConsent,
    hasEducation,
    sameFileUsedForBoth,
    completeness,
    missingFields,
  };
}

function countBy<T>(items: T[], keyFn: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]));
}

function generateCatalogMarkdown(mappings: ProcedureMapping[]): string {
  const lines: string[] = [
    "# Procedure-to-Content Mapping Catalog",
    "",
    `Generated from: \`${SOURCE_FILE}\``,
    "",
    "| # | Procedure | Specialty | Consent Form | Education Material | Language | Version | Completeness |",
    "|---|-----------|-----------|--------------|--------------------|----------|---------|--------------|",
  ];

  for (let i = 0; i < mappings.length; i++) {
    const m = mappings[i];
    const consent = m.consentForms.length ? m.consentForms.join(", ") : "—";
    const education = m.educationMaterials.length ? m.educationMaterials.join(", ") : "—";
    lines.push(
      `| ${i + 1} | ${m.procedureNameEn} | ${m.specialty} | ${consent} | ${education} | ${m.language} | ${m.version} | ${m.completeness} |`
    );
  }

  lines.push("");
  return lines.join("\n");
}

function generateStatsMarkdown(
  inventory: InventoryItem[],
  consentForms: InventoryItem[],
  educationMaterials: InventoryItem[],
  mappings: ProcedureMapping[]
): string {
  const totalProcedures = mappings.length;
  const withBoth = mappings.filter((m) => m.hasConsent && m.hasEducation).length;
  const consentOnly = mappings.filter((m) => m.hasConsent && !m.hasEducation).length;
  const educationOnly = mappings.filter((m) => !m.hasConsent && m.hasEducation).length;
  const missingContent = mappings.filter((m) => !m.hasConsent && !m.hasEducation).length;
  const withAnesthesia = mappings.filter((m) => m.anesthesiaRequired).length;
  const sameFileBoth = mappings.filter((m) => m.sameFileUsedForBoth).length;

  const metadataMissing = mappings.filter((m) => m.missingFields.length > 0);
  const metadataMissingCount = metadataMissing.length;

  const specialtyCounts = countBy(mappings, (m) => m.specialty);
  const categoryCounts = countBy(mappings, (m) => m.categoryCode);
  const consentTypeCounts = countBy(mappings, (m) => m.consentType);
  const languageCounts = countBy(inventory, (item) => item.language);
  const completenessCounts = countBy(mappings, (m) => m.completeness);

  const lines: string[] = [
    "# Content Coverage Statistics",
    "",
    `Generated from: \`${SOURCE_FILE}\``,
    "",
    "## Summary",
    "",
    "| Metric | Count |",
    "|--------|-------|",
    `| Total procedures | ${totalProcedures} |`,
    `| Consent forms | ${consentForms.length} |`,
    `| Education materials | ${educationMaterials.length} |`,
    `| Total content files referenced | ${consentForms.length + educationMaterials.length} |`,
    `| Procedures with both consent + education | ${withBoth} |`,
    `| Procedures with consent only | ${consentOnly} |`,
    `| Procedures with education only | ${educationOnly} |`,
    `| Procedures missing both consent and education | ${missingContent} |`,
    `| Procedures requiring anesthesia | ${withAnesthesia} |`,
    `| Procedures using same file for consent + education | ${sameFileBoth} |`,
    `| Procedures missing metadata fields | ${metadataMissingCount} |`,
    "",
    "## Content Coverage Percentages",
    "",
    "| Metric | Value |",
    "|--------|-------|",
    `| Both consent + education | ${((withBoth / totalProcedures) * 100).toFixed(1)}% |`,
    `| Consent only | ${((consentOnly / totalProcedures) * 100).toFixed(1)}% |`,
    `| Education only | ${((educationOnly / totalProcedures) * 100).toFixed(1)}% |`,
    `| Missing both | ${((missingContent / totalProcedures) * 100).toFixed(1)}% |`,
    "",
    "## Completeness Distribution",
    "",
    "| Completeness | Count |",
    "|--------------|-------|",
    ...Object.entries(completenessCounts).map(([k, v]) => `| ${k} | ${v} |`),
    "",
    "## Procedures by Specialty",
    "",
    "| Specialty | Count |",
    "|-----------|-------|",
    ...Object.entries(specialtyCounts).map(([k, v]) => `| ${k} | ${v} |`),
    "",
    "## Procedures by Category",
    "",
    "| Category | Count |",
    "|----------|-------|",
    ...Object.entries(categoryCounts).map(([k, v]) => `| ${k} | ${v} |`),
    "",
    "## Procedures by Consent Type",
    "",
    "| Consent Type | Count |",
    "|--------------|-------|",
    ...Object.entries(consentTypeCounts).map(([k, v]) => `| ${k} | ${v} |`),
    "",
    "## Content by Language",
    "",
    "| Language | Count |",
    "|----------|-------|",
    ...Object.entries(languageCounts).map(([k, v]) => `| ${k} | ${v} |`),
    "",
    "## Data Quality Flags",
    "",
  ];

  if (sameFileBoth > 0) {
    lines.push(`- ${sameFileBoth} procedure(s) reference the same PDF as both the consent form and the education material. This usually indicates a data-entry error in the source manifest.`);
  }

  if (metadataMissingCount > 0) {
    lines.push(`- ${metadataMissingCount} procedure(s) are missing one or more metadata fields (most commonly the Arabic title).`);
  }

  lines.push("", "### Metadata Missing Detail", "", "| Procedure | Missing Fields |", "|-----------|----------------|");
  for (const m of metadataMissing) {
    lines.push(`| ${m.procedureNameEn} | ${m.missingFields.join(", ")} |`);
  }

  lines.push("");
  return lines.join("\n");
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const inventory: InventoryItem[] = [];
  const consentForms: InventoryItem[] = [];
  const educationMaterials: InventoryItem[] = [];
  const mappings: ProcedureMapping[] = [];

  for (const item of imcApprovedConsentLibraryGenerated) {
    const classified = classifyFiles(item);
    inventory.push(...classified.consentForms, ...classified.educationMaterials);
    consentForms.push(...classified.consentForms);
    educationMaterials.push(...classified.educationMaterials);
    mappings.push(buildProcedureMapping(item));
  }

  // Sort by procedure name for readability.
  const sortedMappings = [...mappings].sort((a, b) => a.procedureNameEn.localeCompare(b.procedureNameEn));
  const sortedInventory = [...inventory].sort((a, b) => a.procedureNameEn.localeCompare(b.procedureNameEn));
  const sortedConsent = [...consentForms].sort((a, b) => a.procedureNameEn.localeCompare(b.procedureNameEn));
  const sortedEducation = [...educationMaterials].sort((a, b) => a.procedureNameEn.localeCompare(b.procedureNameEn));

  await fs.writeFile(
    path.join(OUT_DIR, "master-inventory.json"),
    JSON.stringify(
      {
        source: SOURCE_FILE,
        generatedAt: new Date().toISOString(),
        totalItems: sortedInventory.length,
        items: sortedInventory,
      },
      null,
      2
    )
  );

  await fs.writeFile(
    path.join(OUT_DIR, "consent-forms.json"),
    JSON.stringify(
      {
        source: SOURCE_FILE,
        generatedAt: new Date().toISOString(),
        totalItems: sortedConsent.length,
        items: sortedConsent,
      },
      null,
      2
    )
  );

  await fs.writeFile(
    path.join(OUT_DIR, "education-materials.json"),
    JSON.stringify(
      {
        source: SOURCE_FILE,
        generatedAt: new Date().toISOString(),
        totalItems: sortedEducation.length,
        items: sortedEducation,
      },
      null,
      2
    )
  );

  await fs.writeFile(
    path.join(OUT_DIR, "procedure-mapping-matrix.json"),
    JSON.stringify(
      {
        source: SOURCE_FILE,
        generatedAt: new Date().toISOString(),
        totalProcedures: sortedMappings.length,
        mappings: sortedMappings,
      },
      null,
      2
    )
  );

  await fs.writeFile(path.join(OUT_DIR, "procedure-to-content-catalog.md"), generateCatalogMarkdown(sortedMappings));
  await fs.writeFile(
    path.join(OUT_DIR, "coverage-statistics.md"),
    generateStatsMarkdown(sortedInventory, sortedConsent, sortedEducation, sortedMappings)
  );

  console.log(`Analyzed ${sortedMappings.length} procedures.`);
  console.log(`  Consent forms: ${sortedConsent.length}`);
  console.log(`  Education materials: ${sortedEducation.length}`);
  console.log(`Outputs written to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
