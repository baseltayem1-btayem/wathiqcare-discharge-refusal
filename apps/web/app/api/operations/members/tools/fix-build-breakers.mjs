#!/usr/bin/env node
/**
 * WathiqCare build breaker scanner/fixer
 *
 * Purpose:
 * - Detect unresolved merge conflict markers
 * - Detect deprecated prisma import usage
 * - Detect obvious syntax corruption patterns
 * - Apply only SAFE mechanical fixes
 * - Generate a full report for manual follow-up
 *
 * Usage:
 *   node tools/fix-build-breakers.mjs
 *   node tools/fix-build-breakers.mjs --write
 *
 * Default mode is dry-run.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const WRITE = process.argv.includes("--write");

const INCLUDE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

const EXCLUDED_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".vercel",
  "out",
]);

const REPORT_PATH = path.join(ROOT, "build-breakers-report.json");

const findings = [];
const changedFiles = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      files.push(...walk(fullPath));
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (!INCLUDE_EXTENSIONS.has(ext)) continue;

    files.push(fullPath);
  }

  return files;
}

function toRelative(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, "/");
}

function addFinding(file, type, message, extra = {}) {
  findings.push({
    file: toRelative(file),
    type,
    message,
    ...extra,
  });
}

function readFile(file) {
  return fs.readFileSync(file, "utf8");
}

function writeFile(file, content) {
  fs.writeFileSync(file, content, "utf8");
}

function detectMergeConflicts(content) {
  const lines = content.split(/\r?\n/);
  const markers = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (
      line.startsWith("<<<<<<<") ||
      line.startsWith("=======") ||
      line.startsWith(">>>>>>>")
    ) {
      markers.push({
        line: i + 1,
        marker: line.trim(),
      });
    }
  }

  return markers;
}

function detectBadPrismaImport(content) {
  return /import\s*\{\s*prisma\s*\}\s*from\s*["']@\/lib\/server\/prisma["']/.test(
    content
  );
}

function detectPrismaMemberUsage(content) {
  return /\bprisma\.[A-Za-z_][A-Za-z0-9_]*\b/.test(content);
}

function detectReturnOutsideLikely(content) {
  const trimmed = content.trim();
  if (!trimmed.includes("return")) return false;

  // Heuristic only:
  // if a file has top-level return statements and no exported function wrappers nearby,
  // flag it for manual review.
  const lines = content.split(/\r?\n/);
  let suspicious = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\s*return\b/.test(line)) {
      const windowStart = Math.max(0, i - 10);
      const context = lines.slice(windowStart, i + 1).join("\n");

      const insideFunctionLikely =
        /export\s+async\s+function\s+\w+\s*\(/.test(context) ||
        /async\s+function\s+\w+\s*\(/.test(context) ||
        /function\s+\w+\s*\(/.test(context) ||
        /=>\s*\{/.test(context);

      if (!insideFunctionLikely) {
        suspicious = true;
        break;
      }
    }
  }

  return suspicious;
}

function detectMagicLinkBrokenImports(content) {
  const badNames = [
    "requestMagicLink",
    "verifyMagicLink",
    "toAccessDeniedMetadata",
    "isMagicLinkDeniedError",
  ];

  return badNames.filter((name) =>
    new RegExp(`\\b${name}\\b`).test(content)
  );
}

function backupFile(file) {
  const backupPath = `${file}.bak`;
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(file, backupPath);
  }
}

function applySafeFixes(file, original) {
  let updated = original;
  let modified = false;

  // Safe mechanical fix 1:
  // import { prisma } from "@/lib/server/prisma"
  // -> import { getPrisma } from "@/lib/server/prisma"
  const badImportRegex =
    /import\s*\{\s*prisma\s*\}\s*from\s*(["']@\/lib\/server\/prisma["']);?/g;

  if (badImportRegex.test(updated)) {
    updated = updated.replace(
      badImportRegex,
      'import { getPrisma } from "@/lib/server/prisma";'
    );
    modified = true;
  }

  // Safe mechanical fix 2:
  // prisma.xxx -> getPrisma().xxx
  // only if there is no local declaration like `const prisma =`
  const hasLocalPrismaDeclaration =
    /\b(const|let|var)\s+prisma\s*=/.test(updated) ||
    /\bfunction\s+\w+\([^)]*\bprisma\b[^)]*\)/.test(updated);

  if (!hasLocalPrismaDeclaration && /\bprisma\./.test(updated)) {
    updated = updated.replace(/\bprisma\./g, "getPrisma().");
    modified = true;
  }

  // Normalize accidental duplicate semicolons
  if (/;;+/g.test(updated)) {
    updated = updated.replace(/;;+/g, ";");
    modified = true;
  }

  if (modified && WRITE) {
    backupFile(file);
    writeFile(file, updated);
    changedFiles.push(toRelative(file));
  }

  return { updated, modified };
}

function analyzeFile(file) {
  const original = readFile(file);
  const relative = toRelative(file);

  const mergeMarkers = detectMergeConflicts(original);
  if (mergeMarkers.length > 0) {
    addFinding(
      file,
      "merge-conflict",
      "Unresolved merge conflict markers found",
      { markers: mergeMarkers }
    );
  }

  if (detectBadPrismaImport(original)) {
    addFinding(file, "bad-prisma-import", "Deprecated prisma import found");
  }

  if (detectPrismaMemberUsage(original)) {
    addFinding(
      file,
      "prisma-usage",
      "Direct prisma member usage found; verify getPrisma migration"
    );
  }

  if (detectReturnOutsideLikely(original)) {
    addFinding(
      file,
      "top-level-return-suspected",
      "Possible return statement outside function scope"
    );
  }

  const magicLinkNames = detectMagicLinkBrokenImports(original);
  if (magicLinkNames.length > 0) {
    addFinding(
      file,
      "magic-link-import-review",
      "Magic-link named imports require manual verification",
      { imports: magicLinkNames }
    );
  }

  const { modified } = applySafeFixes(file, original);

  return {
    file: relative,
    mergeConflict: mergeMarkers.length > 0,
    modified,
  };
}

function summarize(results) {
  const summary = {
    root: ROOT,
    mode: WRITE ? "write" : "dry-run",
    scannedFiles: results.length,
    changedFiles,
    totalFindings: findings.length,
    byType: findings.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {}),
    findings,
  };

  fs.writeFileSync(REPORT_PATH, JSON.stringify(summary, null, 2), "utf8");

  return summary;
}

function printSummary(summary) {
  console.log("");
  console.log("=== Build Breakers Scan Complete ===");
  console.log(`Mode           : ${summary.mode}`);
  console.log(`Scanned files  : ${summary.scannedFiles}`);
  console.log(`Changed files  : ${summary.changedFiles.length}`);
  console.log(`Total findings : ${summary.totalFindings}`);
  console.log(`Report         : ${toRelative(REPORT_PATH)}`);
  console.log("");

  if (summary.changedFiles.length > 0) {
    console.log("Changed files:");
    for (const file of summary.changedFiles) {
      console.log(`- ${file}`);
    }
    console.log("");
  }

  if (summary.totalFindings > 0) {
    console.log("Findings by type:");
    for (const [type, count] of Object.entries(summary.byType)) {
      console.log(`- ${type}: ${count}`);
    }
    console.log("");
  }

  const unresolvedConflictFiles = new Set(
    findings
      .filter((f) => f.type === "merge-conflict")
      .map((f) => f.file)
  );

  if (unresolvedConflictFiles.size > 0) {
    console.log("Files with unresolved merge conflicts:");
    for (const file of unresolvedConflictFiles) {
      console.log(`- ${file}`);
    }
    console.log("");
    console.log(
      "These files require manual merge resolution before build can succeed."
    );
  }
}

function main() {
  const allFiles = walk(ROOT);
  const results = allFiles.map(analyzeFile);
  const summary = summarize(results);
  printSummary(summary);

  const hasMergeConflicts = findings.some((f) => f.type === "merge-conflict");
  process.exitCode = hasMergeConflicts ? 2 : 0;
}

main();