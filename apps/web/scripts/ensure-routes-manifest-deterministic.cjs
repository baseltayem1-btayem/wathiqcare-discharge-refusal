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

function firstExistingDir(paths) {
  for (const p of paths) {
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
      return p;
    }
  }
  return null;
}

function main() {
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

  const nextDir = firstExistingDir([
    path.resolve(cwd, ".next"),
    "/vercel/path1/.next",
    "/vercel/path1/apps/web/.next",
  ]);

  if (nextDir) {
    const duplicateNextDir = "/vercel/path1/vercel/path1/.next";
    fs.mkdirSync(path.dirname(duplicateNextDir), { recursive: true });
    fs.cpSync(nextDir, duplicateNextDir, { recursive: true, force: true });
    console.log(`[ensure-routes-manifest] mirrored ${nextDir} -> ${duplicateNextDir}`);
  }
}

main();
