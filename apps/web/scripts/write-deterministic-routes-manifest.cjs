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

const localSource = path.resolve(process.cwd(), ".next/routes-manifest.json");
if (!fs.existsSync(localSource)) {
  console.warn(`[routes-manifest] source not found: ${localSource}`);
  process.exit(0);
}

const content = fs.readFileSync(localSource, "utf8");

writeIfPossible(path.resolve(process.cwd(), ".next/routes-manifest-deterministic.json"), content);
writeIfPossible("/vercel/path1/.next/routes-manifest-deterministic.json", content);
writeIfPossible("/vercel/path1/vercel/path1/.next/routes-manifest-deterministic.json", content);
writeIfPossible("/vercel/path1/etc/os-release", "NAME=Vercel\nID=vercel\n");
writeIfPossible("/vercel/path1/usr/lib/os-release", "NAME=Vercel\nID=vercel\n");

const rootPackageJson = path.resolve(process.cwd(), "../../package.json");
if (fs.existsSync(rootPackageJson)) {
  writeIfPossible("/vercel/path1/vercel/path1/package.json", fs.readFileSync(rootPackageJson, "utf8"));
}

try {
  const sourceNextDir = path.resolve(process.cwd(), ".next");
  const targetNextDir = "/vercel/path1/vercel/path1/.next";

  if (fs.existsSync(sourceNextDir)) {
    fs.mkdirSync(path.dirname(targetNextDir), { recursive: true });
    fs.cpSync(sourceNextDir, targetNextDir, { recursive: true, force: true });
    console.log(`[routes-manifest] copied ${sourceNextDir} -> ${targetNextDir}`);
  }
} catch (error) {
  const message = error && error.message ? error.message : String(error);
  console.warn(`[routes-manifest] skip .next copy: ${message}`);
}

try {
  const duplicatedRoot = "/vercel/path1/vercel/path1";
  const duplicatedNodeModules = `${duplicatedRoot}/node_modules`;

  fs.mkdirSync(duplicatedRoot, { recursive: true });
  if (!fs.existsSync(duplicatedNodeModules)) {
    fs.symlinkSync("/vercel/path1/node_modules", duplicatedNodeModules, "dir");
    console.log(`[routes-manifest] linked ${duplicatedNodeModules} -> /vercel/path1/node_modules`);
  }
} catch (error) {
  const message = error && error.message ? error.message : String(error);
  console.warn(`[routes-manifest] skip node_modules link: ${message}`);
}
