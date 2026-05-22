import {
  type ScanViolation,
  collectEnglishLocaleFiles,
  containsForbiddenForEnglishMode,
  printSummary,
  safeReadFile,
  scanUserFacingText,
  writeJsonReport,
} from "./_common";

async function main(): Promise<void> {
  const files = await collectEnglishLocaleFiles();
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
        (line) => containsForbiddenForEnglishMode(line),
        "Arabic character found in English purity scan",
      ),
    );
  }

  const summary = {
    scanner: "auditEnglishPurity",
    mode: "en" as const,
    scannedFiles: files.length,
    violationCount: violations.length,
    violations,
  };

  printSummary(summary);
  await writeJsonReport("auditEnglishPurity.json", summary);

  if (summary.violationCount > 0) {
    process.exitCode = 2;
  }
}

void main();
