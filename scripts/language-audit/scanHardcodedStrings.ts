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

function isLikelyHardcoded(literal: string): boolean {
  if (!literal.trim()) return false;
  if (literal.length < 4) return false;
  if (/^[A-Z0-9_\-:.]+$/.test(literal)) return false;
  if (/^[\w\-./]+$/.test(literal)) return false;
  return hasArabic(literal) || hasLatin(literal);
}

async function main(): Promise<void> {
  const files = (await collectTextFiles(TARGET_DIRS)).filter((f) => CODE_FILE_REGEX.test(f));
  const violations: Array<{ file: string; line: number; excerpt: string; reason: string }> = [];

  for (const file of files) {
    const content = await safeReadFile(file);
    if (!content) continue;

    let match: RegExpExecArray | null;
    while ((match = STRING_LITERAL_REGEX.exec(content)) !== null) {
      const literal = match[2] || "";
      if (!isLikelyHardcoded(literal)) continue;
      if (literal.includes("t(") || literal.includes("translate")) continue;

      const before = content.slice(0, match.index);
      const line = before.split(/\r?\n/).length;
      violations.push({
        file: toRepoRelative(file),
        line,
        excerpt: literal.slice(0, 200).replace(/\s+/g, " "),
        reason: "Potential hardcoded user-facing string",
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
