import {
  TARGET_DIRS,
  type ScanViolation,
  collectTextFiles,
  hasArabic,
  hasLatin,
  printSummary,
  safeReadFile,
  scanUserFacingText,
  writeJsonReport,
} from "./_common";

async function main(): Promise<void> {
  const files = (await collectTextFiles(TARGET_DIRS)).filter((file) =>
    /(template|locales|translations|consent|notification|email|pdf|print)/i.test(file),
  );

  const violations: ScanViolation[] = [];

  for (const file of files) {
    const content = await safeReadFile(file);
    if (!content) continue;

    violations.push(
      ...scanUserFacingText(
        file,
        content,
        (line) => hasArabic(line) && hasLatin(line),
        "Mixed Arabic and Latin content in same line",
      ),
    );
  }

  const summary = {
    scanner: "scanMixedTemplates",
    mode: "mixed" as const,
    scannedFiles: files.length,
    violationCount: violations.length,
    violations,
  };

  printSummary(summary);
  await writeJsonReport("scanMixedTemplates.json", summary);
  if (violations.length > 0) {
    process.exitCode = 2;
  }
}

void main();
