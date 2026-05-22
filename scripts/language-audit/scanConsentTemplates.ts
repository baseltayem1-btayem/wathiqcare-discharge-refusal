import path from "node:path";
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
    const raw = await safeReadFile(file);
    if (!raw) continue;

    // Strip CSS/style blocks from HTML files so that font declarations and selectors are not
    // treated as Latin text inside Arabic or English templates.
    const content = /\.html$/i.test(file)
      ? raw.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
      : raw;

    // Count each individual template definition entry encountered across all files.
    // A "templateCode" key or a "consent_type" / "title_ar" field marks a template.
    const templateMatches = content.match(/\btemplateCode\s*[:=]/g);
    if (templateMatches) {
      // Subtract 1 for the TypeScript interface/type declaration line if present
      const typeDefCount = /templateCode\s*:\s*string/.test(content) ? 1 : 0;
      probableTemplateCount += Math.max(0, templateMatches.length - typeDefCount);
    } else if (/consent_type|title_ar|legal_text_ar/i.test(content)) {
      // Fallback for JSON/Python files that define templates differently
      probableTemplateCount += 1;
    }

    const rel = toRepoRelative(file);
    const basename = path.basename(file);

    // Language classification is intentionally strict: only files whose OWN filename
    // includes the language tag (e.g. `*.ar.html`, `*.en.json`) are treated as
    // single-language template files subject to purity checks.  Bilingual service
    // files that merely *reference* `.ar.html` filenames in strings must not be
    // classified as Arabic-only and must not be subject to purity enforcement.
    const likelyArabicFile = /\.ar\.(ts|tsx|json|html)$/i.test(basename);
    const likelyEnglishFile = /\.en\.(ts|tsx|json|html)$/i.test(basename);
    void rel; // used below when needed for logging

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

    // Only check for mixed-language paragraphs inside dedicated language template files.
    // General service files that contain both Arabic user-facing strings and English code
    // identifiers are intentionally bilingual and must not trigger this rule.
    if (likelyArabicFile || likelyEnglishFile) {
      violations.push(
        ...scanUserFacingText(
          file,
          content,
          (line) => hasArabic(line) && hasLatin(line),
          "Mixed Arabic/English paragraph in consent template source",
        ),
      );
    }
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
