import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import tracing from "../../../scripts/resolve-tracing-root.cjs";

const {
  resolveTracingRoot,
  resolveAppRoot,
  isFilesystemRoot,
  APP_PACKAGE_NAME,
} = tracing;

function makeTempAppTree(prefix = "wathiqcare-tracing-") {
  const parent = mkdtempSync(path.join(tmpdir(), prefix));
  const appRoot = path.join(parent, "app");
  mkdirSync(appRoot, { recursive: true });
  writeFileSync(
    path.join(appRoot, "package.json"),
    JSON.stringify({ name: APP_PACKAGE_NAME, version: "0.0.0-test" }, null, 2),
    "utf8",
  );
  return { parent, appRoot };
}

function writeRepoMarker(parent: string, rootName = "wathiqcare") {
  writeFileSync(
    path.join(parent, "package.json"),
    JSON.stringify({ name: rootName, workspaces: ["apps/*", "packages/*"] }, null, 2),
    "utf8",
  );
}

// -----------------------------------------------------------------------------
// Vercel behavior
// -----------------------------------------------------------------------------

test("Vercel /vercel/path1 resolves to the validated app root, never /", () => {
  const { parent, appRoot } = makeTempAppTree("wathiqcare-vercel-path1-");
  try {
    const result = resolveTracingRoot({ cwd: appRoot, env: { VERCEL: "1" } });

    assert.equal(result.isVercel, true);
    assert.equal(result.root, appRoot);
    assert.equal(result.contractsInclude, "./contracts/**");
    assert.equal(isFilesystemRoot(result.root), false);
    assert.ok(!result.root.endsWith("/vercel/path1/vercel/path1"));
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test("Vercel environment ignores parent repo markers and stays at app root", () => {
  const { parent, appRoot } = makeTempAppTree("wathiqcare-vercel-marker-");
  writeRepoMarker(parent);
  try {
    const result = resolveTracingRoot({ cwd: appRoot, env: { VERCEL_ENV: "preview" } });

    assert.equal(result.isVercel, true);
    assert.equal(result.root, appRoot);
    assert.equal(result.contractsInclude, "./contracts/**");
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

// -----------------------------------------------------------------------------
// Local monorepo behavior
// -----------------------------------------------------------------------------

test("local apps/web resolves to the real repo root when validated", () => {
  const expectedRepoRoot = path.resolve(process.cwd(), "../..");
  const result = resolveTracingRoot({ cwd: process.cwd(), env: {} });

  assert.equal(result.isVercel, false);
  assert.equal(result.root, expectedRepoRoot);
  assert.equal(result.contractsInclude, "./apps/web/contracts/**");
  assert.equal(isFilesystemRoot(result.root), false);
});

test("missing or invalid repo markers fall back to the app root", () => {
  const { parent, appRoot } = makeTempAppTree("wathiqcare-orphan-app-");
  try {
    const result = resolveTracingRoot({ cwd: appRoot, env: {} });

    assert.equal(result.isVercel, false);
    assert.equal(result.root, appRoot);
    assert.equal(result.contractsInclude, "./contracts/**");
    assert.equal(isFilesystemRoot(result.root), false);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test("a parent package.json without workspaces or monorepo name is ignored", () => {
  const { parent, appRoot } = makeTempAppTree("wathiqcare-no-workspace-");
  writeFileSync(
    path.join(parent, "package.json"),
    JSON.stringify({ name: "some-other-project" }, null, 2),
    "utf8",
  );
  try {
    const result = resolveTracingRoot({ cwd: appRoot, env: {} });

    assert.equal(result.root, appRoot);
    assert.equal(result.contractsInclude, "./contracts/**");
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

// -----------------------------------------------------------------------------
// Safety: filesystem-root rejection
// -----------------------------------------------------------------------------

test("filesystem root is rejected as an app root", () => {
  assert.equal(isFilesystemRoot("/"), true);
  assert.throws(() => resolveAppRoot("/"), /APP_ROOT_IS_FILESYSTEM_ROOT/);
});

test("repo-root search stops before the filesystem root", () => {
  const { parent, appRoot } = makeTempAppTree("wathiqcare-root-fallback-");
  try {
    const result = resolveTracingRoot({ cwd: appRoot, env: {} });
    assert.equal(result.root, appRoot);
    assert.equal(isFilesystemRoot(result.root), false);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

// -----------------------------------------------------------------------------
// Windows path safety
// -----------------------------------------------------------------------------

test("Windows drive roots are recognised as filesystem roots", () => {
  assert.equal(isFilesystemRoot("C:\\"), true);
  assert.equal(isFilesystemRoot("C:/"), true);
  assert.equal(isFilesystemRoot("C:\\some\\path"), false);
});

// -----------------------------------------------------------------------------
// Active Vercel config contract
// -----------------------------------------------------------------------------

test("apps/web/vercel.json uses the Next.js framework preset with no outputDirectory override", () => {
  const vercelConfigPath = path.resolve(process.cwd(), "vercel.json");
  const vercelConfig = JSON.parse(readFileSync(vercelConfigPath, "utf8"));
  assert.equal(vercelConfig.framework, "nextjs");
  assert.equal("outputDirectory" in vercelConfig, false);
});

// -----------------------------------------------------------------------------
// No hard-coded Vercel path workarounds
// -----------------------------------------------------------------------------

test("touched runtime and config files contain no /vercel/path0 or /vercel/path1 workarounds", () => {
  const files = [
    path.resolve(process.cwd(), "next.config.js"),
    path.resolve(process.cwd(), "vercel.json"),
    path.resolve(process.cwd(), "scripts", "resolve-tracing-root.cjs"),
  ];

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const lower = content.toLowerCase();
    assert.ok(!lower.includes("/vercel/path0"), `unexpected path0 workaround in ${file}`);
    assert.ok(!lower.includes("/vercel/path1"), `unexpected path1 workaround in ${file}`);
    assert.ok(!lower.includes("path0"), `unexpected path0 reference in ${file}`);
    assert.ok(!lower.includes("path1"), `unexpected path1 reference in ${file}`);
  }
});
