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

const PDF_DIRS = [
  "apps/web/templates",
  "apps/web/src/lib/templates",
  "backend/core",
  "backend/discharge",
];

async function main(): Promise<void> {
  const files = (await collectTextFiles(PDF_DIRS)).filter((file) =>
    /(pdf|template|print|consent|discharge)/i.test(file),
  );

  const violations: ScanViolation[] = [];

  for (const file of files) {
    const content = await safeReadFile(file);
    if (!content) continue;

    const isArabicVariant = /\.ar\.|\bar\b|arabic/i.test(file);
    const isEnglishVariant = /\.en\.|\ben\b|english/i.test(file);

    if (isArabicVariant) {
      violations.push(
        ...scanUserFacingText(
          file,
          content,
          (line) => hasLatin(line),
          "Arabic PDF/template contains Latin text",
        ),
      );
    }

    if (isEnglishVariant) {
      violations.push(
        ...scanUserFacingText(
          file,
          content,
          (line) => hasArabic(line),
          "English PDF/template contains Arabic text",
        ),
      );
    }

    violations.push(
      ...scanUserFacingText(
        file,
        content,
        (line) => hasArabic(line) && hasLatin(line),
        "Mixed direction language in PDF/template line",
      ),
    );
  }

  const summary = {
    scanner: "scanPdfLanguage",
    mode: "mixed" as const,
    scannedFiles: files.length,
    violationCount: violations.length,
    violations,
  };

  printSummary(summary);
  await writeJsonReport("scanPdfLanguage.json", summary);
  if (violations.length > 0) {
    process.exitCode = 2;
  }
}

void main();
