const fs = require("node:fs");
const path = require("node:path");

function writeIfPossible(targetPath, content) {
  try {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content, "utf8");
    console.log(`[routes-manifest] wrote ${targetPath}`);
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    console.warn(`[routes-manifest] skip ${targetPath}: ${message}`);
  }
}

function copyIfPossible(sourcePath, targetPath, label) {
  try {
    if (!fs.existsSync(sourcePath)) {
      return;
    }

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.cpSync(sourcePath, targetPath, { recursive: true, force: true });
    console.log(`[routes-manifest] copied ${sourcePath} -> ${targetPath}${label ? ` (${label})` : ""}`);
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    console.warn(`[routes-manifest] skip ${label || targetPath}: ${message}`);
  }
}

const localSource = path.resolve(process.cwd(), ".next/routes-manifest.json");
if (!fs.existsSync(localSource)) {
  console.warn(`[routes-manifest] source not found: ${localSource}`);
  process.exit(0);
}

const content = fs.readFileSync(localSource, "utf8");

writeIfPossible(path.resolve(process.cwd(), ".next/routes-manifest-deterministic.json"), content);
writeIfPossible("/vercel/path0/.next/routes-manifest-deterministic.json", content);
writeIfPossible("/vercel/path0/vercel/path0/.next/routes-manifest-deterministic.json", content);
writeIfPossible("/vercel/path1/.next/routes-manifest-deterministic.json", content);
writeIfPossible("/vercel/path1/vercel/path1/.next/routes-manifest-deterministic.json", content);
writeIfPossible("/vercel/path0/etc/os-release", "NAME=Vercel\nID=vercel\n");
writeIfPossible("/vercel/path0/usr/lib/os-release", "NAME=Vercel\nID=vercel\n");
writeIfPossible("/vercel/path1/etc/os-release", "NAME=Vercel\nID=vercel\n");
writeIfPossible("/vercel/path1/usr/lib/os-release", "NAME=Vercel\nID=vercel\n");

const packageJsonCandidates = [
  path.resolve(process.cwd(), "package.json"),
  path.resolve(process.cwd(), "../package.json"),
  path.resolve(process.cwd(), "../../package.json"),
  process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD, "package.json") : null,
].filter(Boolean);

const packageJsonSource = packageJsonCandidates.find((candidate) => fs.existsSync(candidate));
const duplicatedRootPackageJson = packageJsonSource
  ? fs.readFileSync(packageJsonSource, "utf8")
  : JSON.stringify({ private: true }, null, 2);

writeIfPossible("/vercel/path1/vercel/path1/package.json", duplicatedRootPackageJson);
writeIfPossible("/vercel/path0/vercel/path0/package.json", duplicatedRootPackageJson);

const sourceAppRoot = process.cwd();
const duplicatedRoots = ["/vercel/path0/vercel/path0", "/vercel/path1/vercel/path1"];

for (const duplicatedRoot of duplicatedRoots) {
  copyIfPossible(path.resolve(sourceAppRoot, ".next"), `${duplicatedRoot}/.next`, `.next copy (${duplicatedRoot})`);
}

for (const entry of fs.readdirSync(sourceAppRoot, { withFileTypes: true })) {
  if (entry.name === ".next" || entry.name === "node_modules") {
    continue;
  }

  for (const duplicatedRoot of duplicatedRoots) {
    copyIfPossible(
      path.resolve(sourceAppRoot, entry.name),
      `${duplicatedRoot}/${entry.name}`,
      `app root mirror (${duplicatedRoot}): ${entry.name}`,
    );
  }
}

try {
  for (const duplicatedRoot of duplicatedRoots) {
    const duplicatedNodeModules = `${duplicatedRoot}/node_modules`;
    const preferredSource = duplicatedRoot.includes("/path0/")
      ? "/vercel/path0/node_modules"
      : "/vercel/path1/node_modules";
    const fallbackSource = duplicatedRoot.includes("/path0/")
      ? "/vercel/path1/node_modules"
      : "/vercel/path0/node_modules";
    const nodeModulesSource = fs.existsSync(preferredSource) ? preferredSource : fallbackSource;

    fs.mkdirSync(duplicatedRoot, { recursive: true });
    if (!fs.existsSync(duplicatedNodeModules) && fs.existsSync(nodeModulesSource)) {
      fs.symlinkSync(nodeModulesSource, duplicatedNodeModules, "dir");
      console.log(`[routes-manifest] linked ${duplicatedNodeModules} -> ${nodeModulesSource}`);
    }
  }
} catch (error) {
  const message = error && error.message ? error.message : String(error);
  console.warn(`[routes-manifest] skip node_modules link: ${message}`);
}
