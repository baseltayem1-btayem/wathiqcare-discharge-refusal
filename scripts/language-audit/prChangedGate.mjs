import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ARABIC = /[\u0600-\u06FF]/;
const LATIN = /[A-Za-z]/;

const CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".html",
  ".md",
  ".prisma",
  ".sql",
  ".yml",
  ".yaml",
]);

const SKIP_SEGMENTS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "coverage",
]);

const TECHNICAL_LINE_PATTERNS = [
  /^\s*import\s+/,
  /^\s*export\s+/,
  /^\s*\/\//,
  /^\s*\*/,
  /^\s*\/\*/,
  /^\s*className=/,
  /^\s*href=/,
  /^\s*src=/,
  /^\s*data=/,
  /https?:\/\//,
  /^[\s"',:{}[\]().;|`$<>=+_\-/\\A-Za-z0-9#@!&?%]+$/,
];

function runGit(args) {
  return execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function getChangedFiles() {
  const baseSha = process.env.PR_BASE_SHA;
  const headSha = process.env.PR_HEAD_SHA;

  if (baseSha && headSha) {
    return runGit(["diff", "--name-only", baseSha, headSha])
      .split(/\r?\n/)
      .filter(Boolean);
  }

  return runGit(["diff", "--name-only", "HEAD~1", "HEAD"])
    .split(/\r?\n/)
    .filter(Boolean);
}

function shouldScan(file) {
  const normalized = file.split(path.sep).join("/");
  if (normalized.split("/").some((segment) => SKIP_SEGMENTS.has(segment))) {
    return false;
  }

  const absolute = path.join(ROOT, file);
  if (!existsSync(absolute)) return false;
  if (!statSync(absolute).isFile()) return false;

  return CODE_EXTENSIONS.has(path.extname(file).toLowerCase());
}

function stripTechnicalNoise(line) {
  return line
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\/[A-Za-z0-9_\-./[\]{}:]+/g, "")
    .replace(/\b[A-Z][A-Z0-9_]{1,}\b/g, "")
    .replace(/\b(OTP|QR|PDF|SMS|API|URL|URI|MRN|ID|UUID|JSON|SQL|PR|DB)\b/gi, "");
}

function isTechnicalLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return true;
  return TECHNICAL_LINE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

const changedFiles = getChangedFiles();
const scannedFiles = changedFiles.filter(shouldScan);
const violations = [];

for (const file of scannedFiles) {
  const content = readFileSync(path.join(ROOT, file), "utf8");
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (isTechnicalLine(line)) return;

    const stripped = stripTechnicalNoise(line);

    if (ARABIC.test(stripped) && LATIN.test(stripped)) {
      violations.push({
        file,
        line: index + 1,
        reason: "Changed line mixes Arabic and Latin text",
        excerpt: line.trim().slice(0, 180),
      });
    }
  });
}

console.log(`[pr-language-gate] changedFiles=${changedFiles.length}`);
console.log(`[pr-language-gate] scannedFiles=${scannedFiles.length}`);
console.log(`[pr-language-gate] violationCount=${violations.length}`);

for (const violation of violations) {
  console.log(
    `- ${violation.file}:${violation.line} :: ${violation.reason} :: ${violation.excerpt}`,
  );
}

if (violations.length > 0) {
  process.exitCode = 2;
}
