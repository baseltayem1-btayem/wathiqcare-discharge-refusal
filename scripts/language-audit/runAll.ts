import { spawnSync } from "node:child_process";
import path from "node:path";
import { getRepoRoot } from "./_common";

const scanners = [
  "auditArabicPurity.ts",
  "auditEnglishPurity.ts",
  "scanHardcodedStrings.ts",
  "scanMixedTemplates.ts",
  "scanPdfLanguage.ts",
  "scanValidationMessages.ts",
  "scanConsentTemplates.ts",
];

function run(file: string): number {
  const repoRoot = getRepoRoot();
  const abs = path.join(repoRoot, "scripts", "language-audit", file);
  const result = spawnSync(process.execPath, ["--import", "tsx", abs], {
    stdio: "inherit",
    cwd: repoRoot,
  });
  return result.status ?? 1;
}

async function main(): Promise<void> {
  let hasFailure = false;
  for (const file of scanners) {
    const code = run(file);
    if (code !== 0) {
      hasFailure = true;
    }
  }

  if (hasFailure) {
    process.exitCode = 2;
  }
}

void main();
