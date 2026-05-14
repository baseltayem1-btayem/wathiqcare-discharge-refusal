import fs from "node:fs/promises";
import path from "node:path";
import { getRepoRoot } from "./_common";

type Report = {
  scanner: string;
  violationCount: number;
  scannedFiles: number;
};

const REQUIRED_REPORTS = [
  "auditArabicPurity.json",
  "auditEnglishPurity.json",
  "scanHardcodedStrings.json",
  "scanMixedTemplates.json",
  "scanPdfLanguage.json",
  "scanValidationMessages.json",
  "scanConsentTemplates.json",
];

async function loadReport(filePath: string): Promise<Report> {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as Report;
  return parsed;
}

async function main(): Promise<void> {
  const repoRoot = getRepoRoot();
  const reportDir = path.join(repoRoot, "scripts", "language-audit", "reports");

  const missing: string[] = [];
  const reports: Report[] = [];

  for (const file of REQUIRED_REPORTS) {
    const fullPath = path.join(reportDir, file);
    try {
      const report = await loadReport(fullPath);
      reports.push(report);
    } catch {
      missing.push(file);
    }
  }

  if (missing.length > 0) {
    console.error("[language-ci-gate] Missing reports:");
    for (const file of missing) {
      console.error(`- ${file}`);
    }
    process.exitCode = 2;
    return;
  }

  let totalViolations = 0;
  console.log("[language-ci-gate] Report summary:");
  for (const report of reports) {
    totalViolations += report.violationCount;
    console.log(
      `- ${report.scanner}: scannedFiles=${report.scannedFiles} violationCount=${report.violationCount}`,
    );
  }

  if (totalViolations > 0) {
    console.error(`[language-ci-gate] BLOCKED: totalViolations=${totalViolations}. Expected 0.`);
    process.exitCode = 2;
    return;
  }

  console.log("[language-ci-gate] PASS: zero language-isolation violations.");
}

void main();
