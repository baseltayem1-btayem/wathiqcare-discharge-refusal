import fs from "node:fs/promises";
import path from "node:path";

export type ScanViolation = {
  file: string;
  line: number;
  excerpt: string;
  reason: string;
};

export type ScanSummary = {
  scanner: string;
  mode: "ar" | "en" | "mixed";
  scannedFiles: number;
  violationCount: number;
  violations: ScanViolation[];
};

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".html",
  ".md",
  ".txt",
  ".yaml",
  ".yml",
  ".py",
  ".sql",
]);

const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py"]);

const DEFAULT_SKIP_SEGMENTS = [
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "coverage",
  "test-results",
  "qa-screenshots",
  "artifacts",
  "backups",
  "venv",
  ".venv",
];

const ALLOW_PATTERNS: RegExp[] = [
  /<[^>]+>/g,
  /https?:\/\/\S+/g,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
  /\b[A-Fa-f0-9]{32,}\b/g,
  /\b[a-zA-Z_][a-zA-Z0-9_\-]{0,80}\b(?=\s*[:=])/g,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  /\b[A-Za-z0-9_\-]{24,}\b/g,
  /\b[a-z\-]+\s*:\s*[^;{}]+;?/gi,
  /\b(rgb|rgba|hsl|hsla|px|rem|em|vh|vw|rtl|ltr|utf-8|doctype|html|head|body|meta|style)\b/gi,
  /\b(api|token|key|id|uuid|hash|mrn|icd11)\b/gi,
  /{{\s*[^}]+\s*}}/g,
  /\$\{[^}]+\}/g,
];

const ARABIC_CHAR_REGEX = /[\u0600-\u06FF]/;
const LATIN_CHAR_REGEX = /[a-zA-Z]/;

function normalizeLine(input: string): string {
  let value = input;
  for (const pattern of ALLOW_PATTERNS) {
    value = value.replace(pattern, " ");
  }
  return value.replace(/\s+/g, " ").trim();
}

async function collectFilesRecursively(root: string, output: string[]): Promise<void> {
  let entries: Array<{ name: string; isDirectory: () => boolean }> = [];
  try {
    entries = (await fs.readdir(root, { withFileTypes: true })) as Array<{
      name: string;
      isDirectory: () => boolean;
    }>;
  } catch {
    return;
  }

  for (const entry of entries) {
    const abs = path.join(root, entry.name);
    const rel = toRepoRelative(abs);

    if (DEFAULT_SKIP_SEGMENTS.some((segment) => rel.includes(`${segment}/`))) {
      continue;
    }

    if (entry.isDirectory()) {
      await collectFilesRecursively(abs, output);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (TEXT_EXTENSIONS.has(ext)) {
      output.push(abs);
    }
  }
}

export function getRepoRoot(): string {
  return path.resolve(__dirname, "..", "..");
}

export function toRepoRelative(absPath: string): string {
  const rel = path.relative(getRepoRoot(), absPath);
  return rel.split(path.sep).join("/");
}

export async function collectTextFiles(targetDirs: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const dir of targetDirs) {
    const absolute = path.join(getRepoRoot(), dir);
    await collectFilesRecursively(absolute, out);
  }
  return out;
}

export async function safeReadFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

export function scanLines(
  filePath: string,
  content: string,
  predicate: (line: string) => boolean,
  reason: string,
): ScanViolation[] {
  const violations: ScanViolation[] = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i] ?? "";
    const normalized = normalizeLine(raw);
    if (!normalized) {
      continue;
    }
    if (predicate(normalized)) {
      violations.push({
        file: toRepoRelative(filePath),
        line: i + 1,
        excerpt: normalized.slice(0, 200),
        reason,
      });
    }
  }
  return violations;
}

function extractCandidateLiterals(line: string): string[] {
  const out: string[] = [];
  const quoteRegex = /(["'`])((?:\\.|(?!\1).){2,}?)\1/g;
  let match: RegExpExecArray | null;
  while ((match = quoteRegex.exec(line)) !== null) {
    const text = (match[2] || "").trim();
    if (text.length >= 2) {
      out.push(text);
    }
  }

  const jsxTextRegex = />\s*([^<>{]{2,})\s*</g;
  while ((match = jsxTextRegex.exec(line)) !== null) {
    const text = (match[1] || "").trim();
    if (text.length >= 2) {
      out.push(text);
    }
  }

  return out;
}

function looksTechnicalSegment(text: string): boolean {
  if (!text.trim()) return true;
  if (/^[A-Za-z_][A-Za-z0-9_./:@\-]{1,}$/.test(text)) return true;
  if (/^\$?[A-Z0-9_\-:.]{2,}$/.test(text)) return true;
  if (/^[@#][A-Za-z0-9_\-/.]+$/.test(text)) return true;
  return false;
}

export function scanUserFacingText(
  filePath: string,
  content: string,
  predicate: (line: string) => boolean,
  reason: string,
): ScanViolation[] {
  const ext = path.extname(filePath).toLowerCase();
  const lines = content.split(/\r?\n/);
  const violations: ScanViolation[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i] ?? "";
    const candidates = CODE_EXTENSIONS.has(ext) ? extractCandidateLiterals(raw) : [raw];

    for (const candidate of candidates) {
      if (looksTechnicalSegment(candidate)) {
        continue;
      }

      const normalized = normalizeLine(candidate);
      if (!normalized) {
        continue;
      }

      if (predicate(normalized)) {
        violations.push({
          file: toRepoRelative(filePath),
          line: i + 1,
          excerpt: normalized.slice(0, 200),
          reason,
        });
      }
    }
  }

  return violations;
}

export function containsForbiddenForArabicMode(text: string): boolean {
  return LATIN_CHAR_REGEX.test(text);
}

export function containsForbiddenForEnglishMode(text: string): boolean {
  return ARABIC_CHAR_REGEX.test(text);
}

export function hasArabic(text: string): boolean {
  return ARABIC_CHAR_REGEX.test(text);
}

export function hasLatin(text: string): boolean {
  return LATIN_CHAR_REGEX.test(text);
}

export function printSummary(summary: ScanSummary): void {
  const purity = summary.scannedFiles === 0
    ? 100
    : Math.max(0, 100 - Math.round((summary.violationCount / summary.scannedFiles) * 100));

  console.log(`\n[${summary.scanner}]`);
  console.log(`mode=${summary.mode}`);
  console.log(`scannedFiles=${summary.scannedFiles}`);
  console.log(`violationCount=${summary.violationCount}`);
  console.log(`purityScoreApprox=${purity}%`);

  const preview = summary.violations.slice(0, 50);
  for (const item of preview) {
    console.log(`- ${item.file}:${item.line} :: ${item.reason} :: ${item.excerpt}`);
  }

  if (summary.violationCount > preview.length) {
    console.log(`... ${summary.violationCount - preview.length} more violations`);
  }
}

export async function writeJsonReport(fileName: string, summary: ScanSummary): Promise<void> {
  const outDir = path.join(getRepoRoot(), "scripts", "language-audit", "reports");
  await fs.mkdir(outDir, { recursive: true });
  const filePath = path.join(outDir, fileName);
  await fs.writeFile(filePath, JSON.stringify(summary, null, 2), "utf8");
}

export const TARGET_DIRS = [
  "apps/web/app",
  "apps/web/src/components",
  "apps/web/src/lib",
  "apps/web/templates",
  "apps/web/src/locales",
  "apps/web/src/modules",
  "apps/web/src/lib/server",
  "apps/web/src/lib/templates",
  "apps/web/src/lib/pdf",
  "apps/web/src/lib/notifications",
  "apps/web/src/lib/validation",
  "apps/web/src/lib/email",
  "backend",
  "tests",
];
