#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const appPackagePath = path.join(repoRoot, "apps", "web", "package.json");
const outputPath = path.join(repoRoot, "apps", "web", ".release-build.json");

function readVersion() {
  try {
    const pkgRaw = fs.readFileSync(appPackagePath, "utf8");
    const pkg = JSON.parse(pkgRaw);
    return (pkg.version || "0.0.0-unknown").toString();
  } catch {
    return "0.0.0-unknown";
  }
}

const buildInfo = {
  version: readVersion(),
  buildDate: new Date().toISOString(),
  commitSha:
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.RELEASE_COMMIT_SHA ||
    "unknown",
};

fs.writeFileSync(outputPath, `${JSON.stringify(buildInfo, null, 2)}\n`, "utf8");
console.log(`release-build-info written: ${outputPath}`);
