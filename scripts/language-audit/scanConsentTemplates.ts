import {
  type ScanViolation,
  collectTextFiles,
  hasArabic,
  hasLatin,
  printSummary,
  safeReadFile,
  scanUserFacingText,
  toRepoRelative,
  writeJsonReport,
} from "./_common";

const CONSENT_DIRS = [
  "apps/web/src/lib/server",
  "apps/web/src/lib/templates",
  "apps/web/templates",
  "backend/discharge",
  "backend/forms",
];

const REQUIRED_TEMPLATE_TARGET = 19;

async function main(): Promise<void> {
  const files = (await collectTextFiles(CONSENT_DIRS)).filter((file) =>
    /(consent|template|discharge|agreement|localization|wording)/i.test(file),
  );

  const violations: ScanViolation[] = [];
  let probableTemplateCount = 0;

  for (const file of files) {
    const content = await safeReadFile(file);
    if (!content) continue;

    if (/templateCode|consent_type|title_ar|title_en|legal_text_ar|legal_text_en/i.test(content)) {
      probableTemplateCount += 1;
    }

    const rel = toRepoRelative(file);
    const likelyArabicFile = /\.ar\.|_ar\b|title_ar|legal_text_ar|arabic/i.test(rel + "\n" + content.slice(0, 5000));
    const likelyEnglishFile = /\.en\.|_en\b|title_en|legal_text_en|english/i.test(rel + "\n" + content.slice(0, 5000));

    if (likelyArabicFile) {
      violations.push(
        ...scanUserFacingText(
          file,
          content,
          (line) => hasLatin(line),
          "Arabic consent template content contains Latin text",
        ),
      );
    }

    if (likelyEnglishFile) {
      violations.push(
        ...scanUserFacingText(
          file,
          content,
          (line) => hasArabic(line),
          "English consent template content contains Arabic text",
        ),
      );
    }

    violations.push(
      ...scanUserFacingText(
        file,
        content,
        (line) => hasArabic(line) && hasLatin(line),
        "Mixed Arabic/English paragraph in consent template source",
      ),
    );
  }

  if (probableTemplateCount < REQUIRED_TEMPLATE_TARGET) {
    violations.push({
      file: "(scanner-summary)",
      line: 1,
      excerpt: `probableTemplateCount=${probableTemplateCount}`,
      reason: `Detected fewer than required ${REQUIRED_TEMPLATE_TARGET} consent templates in source audit`,
    });
  }

  const summary = {
    scanner: "scanConsentTemplates",
    mode: "mixed" as const,
    scannedFiles: files.length,
    violationCount: violations.length,
    violations,
  };

  printSummary(summary);
  await writeJsonReport("scanConsentTemplates.json", summary);
  if (violations.length > 0) {
    process.exitCode = 2;
  }
}

void main();
