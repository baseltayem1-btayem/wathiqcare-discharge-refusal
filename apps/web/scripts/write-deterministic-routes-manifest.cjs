const fs = require("node:fs");
const path = require("node:path");

const EXPECTED_PACKAGE_NAME = "@wathiqcare/web";
const SOURCE_MANIFEST_NAME = "routes-manifest.json";
const OUTPUT_MANIFEST_NAME = "routes-manifest-deterministic.json";

/**
 * Recursively sort object keys so JSON output is deterministic regardless of
 * how the source manifest serialized them.
 */
function sortKeysDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === "object") {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeysDeep(value[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * Validate that content is a UTF-8 string containing a JSON object.
 */
function isValidJsonObject(content) {
  if (typeof content !== "string") {
    return false;
  }
  try {
    const parsed = JSON.parse(content);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

/**
 * Parse the source manifest and return deterministic JSON text.
 */
function toDeterministicContent(sourceContent) {
  const parsed = JSON.parse(sourceContent);
  const sorted = sortKeysDeep(parsed);
  return `${JSON.stringify(sorted, null, 2)}\n`;
}

/**
 * Resolve and validate the application root directory.
 * The directory must contain a package.json whose name matches
 * @wathiqcare/web. This prevents the script from operating on arbitrary
 * directories such as filesystem roots or the Vercel build container root.
 */
function resolveAppRoot(cwd) {
  const resolved = path.resolve(cwd || process.cwd());
  const packagePath = path.join(resolved, "package.json");

  if (!fs.existsSync(packagePath)) {
    throw Object.assign(new Error(`APP_ROOT_NOT_FOUND: ${resolved}`), { code: "APP_ROOT_NOT_FOUND" });
  }

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    throw Object.assign(new Error(`APP_PACKAGE_INVALID: ${message}`), { code: "APP_PACKAGE_INVALID" });
  }

  if (pkg.name !== EXPECTED_PACKAGE_NAME) {
    throw Object.assign(
      new Error(`UNEXPECTED_APP_ROOT: ${resolved} (name=${pkg.name || "undefined"})`),
      { code: "UNEXPECTED_APP_ROOT" },
    );
  }

  return resolved;
}

/**
 * Resolve the Next.js output directory relative to the validated app root.
 */
function resolveNextDir(appRoot) {
  return path.join(appRoot, ".next");
}

/**
 * Validate that a resolved file path is strictly inside a base directory.
 * Rejects traversal attempts, symlinks that escape, and path separators from
 * the opposite platform.
 */
function isInsideBase(resolvedPath, baseDir) {
  const normalizedBase = path.resolve(baseDir);
  const normalizedPath = path.resolve(resolvedPath);
  const relative = path.relative(normalizedBase, normalizedPath);
  if (relative === "") {
    return true;
  }
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return false;
  }
  return true;
}

/**
 * Write the deterministic routes manifest artifact.
 *
 * - Only reads from <appRoot>/.next/routes-manifest.json
 * - Only writes to <appRoot>/.next/routes-manifest-deterministic.json
 * - Fails closed if the source is missing or not a JSON object
 * - Returns the source and output paths for logging
 */
function writeDeterministicRoutesManifest(appRoot) {
  const root = resolveAppRoot(appRoot);
  const nextDir = resolveNextDir(root);
  const sourcePath = path.join(nextDir, SOURCE_MANIFEST_NAME);
  const outputPath = path.join(nextDir, OUTPUT_MANIFEST_NAME);

  if (!isInsideBase(sourcePath, nextDir)) {
    throw Object.assign(
      new Error(`SOURCE_PATH_TRAVERSAL_REJECTED: ${sourcePath}`),
      { code: "SOURCE_PATH_TRAVERSAL_REJECTED" },
    );
  }
  if (!isInsideBase(outputPath, nextDir)) {
    throw Object.assign(
      new Error(`OUTPUT_PATH_TRAVERSAL_REJECTED: ${outputPath}`),
      { code: "OUTPUT_PATH_TRAVERSAL_REJECTED" },
    );
  }

  if (!fs.existsSync(sourcePath)) {
    throw Object.assign(
      new Error(`SOURCE_MANIFEST_MISSING: ${sourcePath}`),
      { code: "SOURCE_MANIFEST_MISSING" },
    );
  }

  const content = fs.readFileSync(sourcePath, "utf8");
  if (!isValidJsonObject(content)) {
    throw Object.assign(
      new Error(`SOURCE_MANIFEST_INVALID: ${sourcePath}`),
      { code: "SOURCE_MANIFEST_INVALID" },
    );
  }

  const deterministicContent = toDeterministicContent(content);

  fs.mkdirSync(nextDir, { recursive: true });
  fs.writeFileSync(outputPath, deterministicContent, "utf8");

  return { sourcePath, outputPath, nextDir, root };
}

/**
 * CLI entry point. Fails closed on any error.
 */
function main() {
  try {
    const result = writeDeterministicRoutesManifest(process.cwd());
    console.log(`[routes-manifest] wrote ${result.outputPath} from ${result.sourcePath}`);
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    console.error(`[routes-manifest] failed: ${message}`);
    process.exit(1);
  }
}

module.exports = {
  EXPECTED_PACKAGE_NAME,
  SOURCE_MANIFEST_NAME,
  OUTPUT_MANIFEST_NAME,
  sortKeysDeep,
  isValidJsonObject,
  toDeterministicContent,
  resolveAppRoot,
  resolveNextDir,
  isInsideBase,
  writeDeterministicRoutesManifest,
  main,
};

if (require.main === module) {
  main();
}
