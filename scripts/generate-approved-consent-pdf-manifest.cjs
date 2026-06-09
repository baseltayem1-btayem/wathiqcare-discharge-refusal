const fs = require("fs");
const path = require("path");

const root = process.cwd();
const publicRoot = path.join(root, "apps", "web", "public");
const outFile = path.join(
  root,
  "apps",
  "web",
  "src",
  "data",
  "informed-consents",
  "approved-consent-pdf-manifest.json"
);

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/['"]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\u0600-\u06FF]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) return [full];
    return [];
  });
}

const pdfs = walk(publicRoot)
  .filter((file) => {
    const rel = path.relative(publicRoot, file).replace(/\\/g, "/").toLowerCase();
    return (
      rel.includes("approved") ||
      rel.includes("consent") ||
      rel.includes("imc") ||
      rel.includes("pdf")
    );
  })
  .map((file) => {
    const rel = path.relative(publicRoot, file).replace(/\\/g, "/");
    const fileName = path.basename(file);
    const nameWithoutPdf = fileName.replace(/\.pdf$/i, "");
    const publicPath = "/" + rel.split("/").map(encodeURIComponent).join("/");

    return {
      id: slugify(nameWithoutPdf),
      code: slugify(nameWithoutPdf),
      templateId: slugify(nameWithoutPdf),
      title: nameWithoutPdf,
      fileName,
      publicPath,
      contentType: "application/pdf",
      lengthBytes: fs.statSync(file).size,
    };
  })
  .sort((a, b) => a.publicPath.localeCompare(b.publicPath));

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(pdfs, null, 2), "utf8");

console.log(`APPROVED_CONSENT_PDF_MANIFEST_COUNT=${pdfs.length}`);
for (const item of pdfs) {
  console.log(`${item.fileName} -> ${item.publicPath} (${item.lengthBytes} bytes)`);
}
