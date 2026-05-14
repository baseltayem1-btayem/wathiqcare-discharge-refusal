import {
  TARGET_DIRS,
  type ScanViolation,
  collectTextFiles,
  containsForbiddenForArabicMode,
  printSummary,
  safeReadFile,
  scanUserFacingText,
  writeJsonReport,
} from "./_common";

async function main(): Promise<void> {
  const files = await collectTextFiles(TARGET_DIRS);
  const violations: ScanViolation[] = [];

  for (const file of files) {
    const content = await safeReadFile(file);
    if (!content) {
      continue;
    }
    violations.push(
      ...scanUserFacingText(
        file,
        content,
        (line) => containsForbiddenForArabicMode(line),
        "Latin character found in Arabic purity scan",
      ),
    );
  }

  const summary = {
    scanner: "auditArabicPurity",
    mode: "ar" as const,
    scannedFiles: files.length,
    violationCount: violations.length,
    violations,
  };

  printSummary(summary);
  await writeJsonReport("auditArabicPurity.json", summary);

  if (summary.violationCount > 0) {
    process.exitCode = 2;
  }
}

void main();
