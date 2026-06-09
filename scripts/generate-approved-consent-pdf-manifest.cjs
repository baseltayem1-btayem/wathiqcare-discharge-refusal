const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const publicRoot = path.join(projectRoot, "apps", "web", "public");
const pdfRoots = [
  path.join(publicRoot, "approved-consents"),
  path.join(publicRoot, "imc-approved-consents"),
  path.join(publicRoot, "consents"),
  path.join(publicRoot, "pdf"),
  path.join(publicRoot, "pdfs"),
];

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\u0600-\u06FF]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) out.push(full);
  }
  return out;
}

const items = [];

for (const root of pdfRoots) {
  for (const file of walk(root)) {
    const relativePublic = "/" + path.relative(publicRoot, file).replace(/\\/g, "/");
    const base = path.basename(file, ".pdf");
    const slug = slugify(base);

    items.push({
      id: slug,
      code: slug,
      templateId: slug,
      title: base.replace(/[-_]+/g, " ").trim(),
      fileName: path.basename(file),
      publicPath: relativePublic,
      contentType: "application/pdf",
    });
  }
}

const unique = Array.from(new Map(items.map((item) => [item.id, item])).values());

const outputDir = path.join(projectRoot, "apps", "web", "src", "data", "informed-consents");
fs.mkdirSync(outputDir, { recursive: true });

fs.writeFileSync(
  path.join(outputDir, "approved-consent-pdf-manifest.json"),
  JSON.stringify(unique, null, 2),
  "utf8"
);

console.log(`APPROVED_CONSENT_PDF_MANIFEST_ITEMS=${unique.length}`);
