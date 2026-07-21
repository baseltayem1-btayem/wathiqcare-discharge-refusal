import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import routesManifestScript from "../../../scripts/write-deterministic-routes-manifest.cjs";

const {
  sortKeysDeep,
  isValidJsonObject,
  toDeterministicContent,
  resolveAppRoot,
  resolveNextDir,
  isInsideBase,
  writeDeterministicRoutesManifest,
  EXPECTED_PACKAGE_NAME,
  SOURCE_MANIFEST_NAME,
  OUTPUT_MANIFEST_NAME,
} = routesManifestScript;

function makeTempAppDir() {
  const dir = mkdtempSync(path.join(tmpdir(), "wathiqcare-routes-manifest-"));
  writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name: EXPECTED_PACKAGE_NAME, version: "0.0.0-test" }, null, 2),
    "utf8",
  );
  const nextDir = path.join(dir, ".next");
  mkdirSync(nextDir, { recursive: true });
  return { dir, nextDir };
}

function listAllFiles(dir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...listAllFiles(full));
    } else {
      result.push(full);
    }
  }
  return result;
}

function relativeFiles(dir: string): string[] {
  return listAllFiles(dir).map((f) => path.relative(dir, f).replace(/\\/g, "/"));
}

// ---------------------------------------------------------------------------
// Deterministic content helpers
// ---------------------------------------------------------------------------

test("sortKeysDeep sorts object keys recursively and preserves values", () => {
  const input = { z: 1, a: { c: 2, b: 3 }, list: [{ y: 1, x: 2 }] };
  const sorted = sortKeysDeep(input);
  assert.deepEqual(Object.keys(sorted), ["a", "list", "z"]);
  assert.deepEqual(Object.keys(sorted.a), ["b", "c"]);
  assert.deepEqual(Object.keys(sorted.list[0]), ["x", "y"]);
});

test("isValidJsonObject accepts objects and rejects arrays/primitives/invalid JSON", () => {
  assert.equal(isValidJsonObject('{"a":1}'), true);
  assert.equal(isValidJsonObject("{}"), true);
  assert.equal(isValidJsonObject("[]"), false);
  assert.equal(isValidJsonObject("\"string\""), false);
  assert.equal(isValidJsonObject("null"), false);
  assert.equal(isValidJsonObject("not json"), false);
  assert.equal(isValidJsonObject(""), false);
  assert.equal(isValidJsonObject(123 as unknown as string), false);
});

test("toDeterministicContent sorts keys and produces stable formatting", () => {
  const input = '{"z":1,"a":{"c":2,"b":3}}';
  const first = toDeterministicContent(input);
  const second = toDeterministicContent(input);
  assert.equal(first, second);
  assert.ok(first.includes('"a"'));
  assert.ok(first.indexOf('"a"') < first.indexOf('"z"'));
  assert.ok(first.indexOf('"b"') < first.indexOf('"c"'));
  assert.equal(first.trimEnd().endsWith("}"), true);
});

// ---------------------------------------------------------------------------
// Path safety helpers
// ---------------------------------------------------------------------------

test("isInsideBase accepts paths inside base and rejects traversal", () => {
  const base = "/app/.next";
  assert.equal(isInsideBase("/app/.next/routes-manifest.json", base), true);
  assert.equal(isInsideBase("/app/.next", base), true);
  assert.equal(isInsideBase("/app/../etc/passwd", base), false);
  assert.equal(isInsideBase("/etc/passwd", base), false);
  assert.equal(isInsideBase(path.join(base, "..", "secrets"), base), false);
});

test("isInsideBase handles Windows-style separators safely", () => {
  const base = "C:\\\\app\\\\.next";
  assert.equal(isInsideBase("C:\\\\app\\\\.next\\\\routes-manifest.json", base), true);
  assert.equal(isInsideBase("C:\\\\app\\\\..\\\\etc\\\\passwd", base), false);
});

test("resolveAppRoot validates package name and rejects arbitrary directories", () => {
  const { dir } = makeTempAppDir();
  try {
    assert.equal(resolveAppRoot(dir), dir);

    const wrongNameDir = mkdtempSync(path.join(tmpdir(), "wathiqcare-wrong-"));
    writeFileSync(path.join(wrongNameDir, "package.json"), JSON.stringify({ name: "wrong" }), "utf8");
    try {
      resolveAppRoot(wrongNameDir);
      assert.fail("expected UNEXPECTED_APP_ROOT");
    } catch (error) {
      assert.ok((error as Error).message.includes("UNEXPECTED_APP_ROOT"));
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveNextDir returns <appRoot>/.next", () => {
  assert.equal(resolveNextDir("/app"), path.join("/app", ".next"));
  assert.equal(resolveNextDir("C:\\\\app"), path.join("C:\\\\app", ".next"));
});

// ---------------------------------------------------------------------------
// Main write behavior
// ---------------------------------------------------------------------------

test("valid source manifest produces exactly one deterministic output in .next", () => {
  const { dir, nextDir } = makeTempAppDir();
  try {
    const sourcePath = path.join(nextDir, SOURCE_MANIFEST_NAME);
    const unsorted = { z: [{ y: 1, x: 2 }], a: { c: 3, b: 4 } };
    writeFileSync(sourcePath, JSON.stringify(unsorted), "utf8");

    const before = relativeFiles(dir);
    const result = writeDeterministicRoutesManifest(dir);
    const after = relativeFiles(dir);

    assert.equal(result.root, dir);
    assert.equal(result.nextDir, nextDir);
    assert.equal(result.sourcePath, sourcePath);
    assert.equal(result.outputPath, path.join(nextDir, OUTPUT_MANIFEST_NAME));

    const created = after.filter((f) => !before.includes(f));
    assert.deepEqual(created, [`.next/${OUTPUT_MANIFEST_NAME}`]);

    const outputContent = readFileSync(result.outputPath, "utf8");
    assert.equal(isValidJsonObject(outputContent), true);
    assert.deepEqual(JSON.parse(outputContent), sortKeysDeep(unsorted));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("missing source manifest fails closed", () => {
  const { dir } = makeTempAppDir();
  try {
    writeDeterministicRoutesManifest(dir);
    assert.fail("expected SOURCE_MANIFEST_MISSING");
  } catch (error) {
    assert.ok((error as Error).message.includes("SOURCE_MANIFEST_MISSING"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("invalid source manifest fails closed", () => {
  const { dir, nextDir } = makeTempAppDir();
  try {
    writeFileSync(path.join(nextDir, SOURCE_MANIFEST_NAME), "not-json", "utf8");
    writeDeterministicRoutesManifest(dir);
    assert.fail("expected SOURCE_MANIFEST_INVALID");
  } catch (error) {
    assert.ok((error as Error).message.includes("SOURCE_MANIFEST_INVALID"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("array-only source manifest fails closed", () => {
  const { dir, nextDir } = makeTempAppDir();
  try {
    writeFileSync(path.join(nextDir, SOURCE_MANIFEST_NAME), "[1,2,3]", "utf8");
    writeDeterministicRoutesManifest(dir);
    assert.fail("expected SOURCE_MANIFEST_INVALID");
  } catch (error) {
    assert.ok((error as Error).message.includes("SOURCE_MANIFEST_INVALID"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Safety: no recursive copying, host traversal, or node_modules linking
// ---------------------------------------------------------------------------

test("no /etc /usr /vercel path0/path1 node_modules files or symlinks are created", () => {
  const { dir, nextDir } = makeTempAppDir();
  try {
    writeFileSync(path.join(nextDir, SOURCE_MANIFEST_NAME), JSON.stringify({ version: 1 }), "utf8");
    writeDeterministicRoutesManifest(dir);

    const files = relativeFiles(dir);
    for (const file of files) {
      const lower = file.toLowerCase();
      assert.ok(!lower.includes("/etc/"), `unexpected etc file: ${file}`);
      assert.ok(!lower.includes("/usr/"), `unexpected usr file: ${file}`);
      assert.ok(!lower.includes("/vercel"), `unexpected vercel file: ${file}`);
      assert.ok(!lower.includes("path0"), `unexpected path0 file: ${file}`);
      assert.ok(!lower.includes("path1"), `unexpected path1 file: ${file}`);
      assert.ok(!lower.includes("node_modules"), `unexpected node_modules file: ${file}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("source and output paths cannot traverse out of .next", () => {
  const { dir } = makeTempAppDir();
  try {
    // Place package.json in a directory named ".." inside the temp dir to test
    // that path traversal in appRoot is still anchored by path.resolve.
    const trickyRoot = path.join(dir, "tricky");
    mkdirSync(trickyRoot, { recursive: true });
    writeFileSync(
      path.join(trickyRoot, "package.json"),
      JSON.stringify({ name: EXPECTED_PACKAGE_NAME }),
      "utf8",
    );
    const nextDir = path.join(trickyRoot, ".next");
    mkdirSync(nextDir, { recursive: true });
    writeFileSync(path.join(nextDir, SOURCE_MANIFEST_NAME), JSON.stringify({ ok: true }), "utf8");

    const result = writeDeterministicRoutesManifest(trickyRoot);
    assert.equal(isInsideBase(result.sourcePath, nextDir), true);
    assert.equal(isInsideBase(result.outputPath, nextDir), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("script never copies app root or creates descendant mirrors", () => {
  const { dir, nextDir } = makeTempAppDir();
  try {
    // Seed extra files outside .next to prove they are not mirrored.
    writeFileSync(path.join(dir, "README.md"), "# app", "utf8");
    mkdirSync(path.join(dir, "src"), { recursive: true });
    writeFileSync(path.join(dir, "src", "index.ts"), "export {}", "utf8");
    writeFileSync(path.join(nextDir, SOURCE_MANIFEST_NAME), JSON.stringify({ ok: true }), "utf8");

    const before = relativeFiles(dir);
    writeDeterministicRoutesManifest(dir);
    const after = relativeFiles(dir);

    const created = after.filter((f) => !before.includes(f));
    assert.deepEqual(created, [`.next/${OUTPUT_MANIFEST_NAME}`]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
