/**
 * Production-bundle verification for bundled Arabic fonts.
 *
 * This test must be run after a production build so that the compiled route
 * bundle exists. It proves that the deterministic font bytes are included in
 * the serverless output rather than resolved from runtime node_modules.
 */

import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  TAJAWAL_ARABIC_400_WOFF2,
  TAJAWAL_ARABIC_700_WOFF2,
  TAJAWAL_LATIN_400_WOFF2,
  TAJAWAL_LATIN_700_WOFF2,
} from "@/lib/server/acroform/fonts/bundled-font-data";

function findServerBuildDir(): string | undefined {
  const candidates = [
    path.join(process.cwd(), ".next", "server"),
    path.join(process.cwd(), "apps", "web", ".next", "server"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function collectServerBundleText(serverDir: string): string {
  let text = "";
  for (const entry of fs.readdirSync(serverDir, { recursive: true })) {
    const fullPath = path.join(serverDir, String(entry));
    try {
      if (fs.statSync(fullPath).isFile() && fullPath.endsWith(".js")) {
        text += fs.readFileSync(fullPath, "utf8") + "\n";
      }
    } catch {
      // ignore unreadable files
    }
  }
  return text;
}

test("production server build contains all bundled font data URLs", () => {
  const serverDir = findServerBuildDir();
  if (!serverDir) {
    console.log("SKIP: production build output not found; run 'npm run build' first");
    return;
  }

  const bundle = collectServerBundleText(serverDir);
  assert.ok(bundle.length > 10_000, "Built server output should be non-trivial");

  for (const [label, dataUrl] of [
    ["Tajawal Arabic 400", TAJAWAL_ARABIC_400_WOFF2],
    ["Tajawal Arabic 700", TAJAWAL_ARABIC_700_WOFF2],
    ["Tajawal Latin 400", TAJAWAL_LATIN_400_WOFF2],
    ["Tajawal Latin 700", TAJAWAL_LATIN_700_WOFF2],
  ] as const) {
    assert.ok(
      bundle.includes(dataUrl),
      `Production server build must include bundled ${label} font data URL`,
    );
  }
});
