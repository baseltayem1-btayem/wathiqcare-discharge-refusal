import {
  type ScanViolation,
  collectTextFiles,
  hasArabic,
  hasLatin,
  printSummary,
  safeReadFile,
  scanUserFacingText,
  writeJsonReport,
} from "./_common";

const VALIDATION_DIRS = [
  "apps/web/src/lib/validation",
  "apps/web/src/lib/server",
  "apps/web/app/api",
  "backend/forms",
  "backend/schemas",
  "backend/core",
];

async function main(): Promise<void> {
  const files = (await collectTextFiles(VALIDATION_DIRS)).filter((file) =>
    /(validation|validator|schema|error|message|route|consent)/i.test(file),
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
        "Validation/errors line contains mixed Arabic and English",
      ),
    );
  }

  const summary = {
    scanner: "scanValidationMessages",
    mode: "mixed" as const,
    scannedFiles: files.length,
    violationCount: violations.length,
    violations,
  };

  printSummary(summary);
  await writeJsonReport("scanValidationMessages.json", summary);
  if (violations.length > 0) {
    process.exitCode = 2;
  }
}

void main();
