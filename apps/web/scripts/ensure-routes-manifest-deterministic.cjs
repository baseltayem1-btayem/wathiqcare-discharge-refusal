const fs = require("node:fs");
const path = require("node:path");

function readFirstExisting(paths) {
  for (const p of paths) {
    if (fs.existsSync(p)) {
      return { path: p, content: fs.readFileSync(p, "utf8") };
    }
  }
  return null;
}

function ensureFile(targetPath, content) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, "utf8");
}

function ensureDuplicatedRootAlias() {
  const aliasPath = "/vercel/path1/vercel/path1";
  if (fs.existsSync(aliasPath)) {
    return;
  }

  fs.mkdirSync(path.dirname(aliasPath), { recursive: true });
  fs.symlinkSync("/vercel/path1", aliasPath, "dir");
  console.log(`[ensure-routes-manifest] linked ${aliasPath} -> /vercel/path1`);
}

function main() {
  try {
    ensureDuplicatedRootAlias();
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    console.warn(`[ensure-routes-manifest] symlink setup skipped: ${message}`);
  }

  const cwd = process.cwd();

  const sourceCandidates = [
    path.resolve(cwd, ".next/routes-manifest.json"),
    path.resolve(cwd, ".next/server/routes-manifest.json"),
    "/vercel/path1/.next/routes-manifest.json",
    "/vercel/path1/apps/web/.next/routes-manifest.json",
  ];

  const source = readFirstExisting(sourceCandidates);
  if (!source) {
    console.warn("[ensure-routes-manifest] source routes-manifest.json not found; skipping");
    return;
  }

  const targets = [
    path.resolve(cwd, ".next/routes-manifest-deterministic.json"),
    path.resolve(cwd, "../../.next/routes-manifest-deterministic.json"),
    path.resolve(cwd, "../../vercel/path1/.next/routes-manifest-deterministic.json"),
    "/vercel/path1/.next/routes-manifest-deterministic.json",
    "/vercel/path1/vercel/path1/.next/routes-manifest-deterministic.json",
  ];

  for (const t of targets) {
    ensureFile(t, source.content);
    console.log(`[ensure-routes-manifest] wrote ${t}`);
  }

}

main();
