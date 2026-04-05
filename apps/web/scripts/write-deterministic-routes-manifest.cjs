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
