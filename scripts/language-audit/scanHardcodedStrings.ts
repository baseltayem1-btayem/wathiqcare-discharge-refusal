import {
  TARGET_DIRS,
  collectTextFiles,
  hasArabic,
  hasLatin,
  printSummary,
  safeReadFile,
  toRepoRelative,
  writeJsonReport,
} from "./_common";

const CODE_FILE_REGEX = /\.(ts|tsx|js|jsx|mjs|cjs|py)$/i;
const STRING_LITERAL_REGEX = /(["'`])((?:\\.|(?!\1).){3,}?)\1/g;

// Technical-token strip patterns mirroring _common ALLOW_PATTERNS
const STRIP_PATTERNS: RegExp[] = [
  // Strip brace-enclosed template variables / f-string expressions FIRST
  /\{[a-zA-Z_][^}]*\}/g,
  /{{\s*[^}]+\s*}}/g,
  /\$\{[^}]+\}/g,
  // Strip txt("English", "Arabic") bilingual helper calls entirely
  /\btxt\s*\([^)]*\)/g,
  /<[^>]+>/g,
  /https?:\/\/\S+/g,
  /\/[a-zA-Z0-9\-_./[\]{}:]+/g,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  /\b[a-zA-Z0-9\-]+\.(com|net|org|sa|gov|edu|io|me)\b/gi,
  /\b(otp|qr|pdf|ai|sha|sha-?256|sms|pdpl|trakcare|mrz|ecg|icu|cpr|url|uri|jwt|http|https|fhir|hl7|emr|rpo|rto)\b/gi,
  /\b(wathiqcare|microsoft|pdffiller|azure|whatsapp|saas|manifest|backend|compatibility|graph)\b/gi,
  /\b[A-Z][A-Z0-9_]{1,}\b/g,
  /\\[nrtbfv01]/g,
  /\b[A-Fa-f0-9]{32,}\b/g,
  /\b[A-Za-z0-9_\-]{24,}\b/g,
  /\b(api|token|key|id|uuid|hash|mrn|icd11|rgb|rgba|px|rem|em|vh|vw)\b/gi,
  /\+\d[\dXx\s\-()]{6,}/g,
];

function stripTechnical(text: string): string {
  let v = text;
  for (const p of STRIP_PATTERNS) {
    v = v.replace(p, " ");
  }
  return v.trim();
}

function isMixedAfterStrip(literal: string): boolean {
  if (literal.length < 4) return false;
  const stripped = stripTechnical(literal);
  return hasArabic(stripped) && hasLatin(stripped);
}

// Exclude test/spec/mock/story files and files already covered by scanMixedTemplates
const EXCLUDED_PATH_REGEX =
  /\/(tests?|spec|__tests__|__mocks__|stories|fixtures|mock|seed|migrations)\//i;
const EXCLUDED_FILE_REGEX = /\.(spec|test)\.(ts|tsx|js|jsx)$/i;
const MIXED_TEMPLATES_REGEX =
  /(template|locales|translations|consent|notification|email|pdf|print)/i;

async function main(): Promise<void> {
  const files = (await collectTextFiles(TARGET_DIRS)).filter(
    (f) =>
      CODE_FILE_REGEX.test(f) &&
      !EXCLUDED_PATH_REGEX.test(f) &&
      !EXCLUDED_FILE_REGEX.test(f) &&
      !MIXED_TEMPLATES_REGEX.test(f),
  );
  const violations: Array<{ file: string; line: number; excerpt: string; reason: string }> = [];

  for (const file of files) {
    const content = await safeReadFile(file);
    if (!content) continue;

    STRING_LITERAL_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = STRING_LITERAL_REGEX.exec(content)) !== null) {
      const literal = match[2] || "";
      if (!isMixedAfterStrip(literal)) continue;

      const before = content.slice(0, match.index);
      const line = before.split(/\r?\n/).length;
      violations.push({
        file: toRepoRelative(file),
        line,
        excerpt: literal.slice(0, 200).replace(/\s+/g, " "),
        reason: "Hardcoded string mixes Arabic and Latin characters",
      });
    }
  }

  const summary = {
    scanner: "scanHardcodedStrings",
    mode: "mixed" as const,
    scannedFiles: files.length,
    violationCount: violations.length,
    violations,
  };

  printSummary(summary);
  await writeJsonReport("scanHardcodedStrings.json", summary);
  if (violations.length > 0) {
    process.exitCode = 2;
  }
}

void main();
