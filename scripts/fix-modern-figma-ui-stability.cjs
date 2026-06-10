const fs = require("fs");
const path = require("path");

const root = path.join(process.cwd(), "apps", "web", "src", "components", "wathiqcare-figma-uiux");
const appPath = path.join(root, "App.tsx");

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (/\.(tsx|ts|css)$/.test(entry.name)) files.push(full);
  }

  return files;
}

function decodeMojibakeLine(line) {
  if (!/[ØÙÂâðŸ�]/.test(line)) return line;

  try {
    return Buffer.from(line, "latin1").toString("utf8");
  } catch {
    return line;
  }
}

function cleanMojibake(content) {
  return content
    .split(/\r?\n/)
    .map(decodeMojibakeLine)
    .join("\n")
    .replace(/\uFFFD/g, "")
    .replace(/Â·/g, "·")
    .replace(/â€¢/g, "•")
    .replace(/â€”/g, "—")
    .replace(/â€“/g, "–")
    .replace(/â€™/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€\u009d/g, '"')
    .replace(/â€¦/g, "…");
}

function removePatientJourneyFromDoctorApp(content) {
  content = content.replace(
    /import\s+\{\s*PatientLink\s*\}\s+from\s+["']\.\/components\/screens\/PatientLink["'];\s*/g,
    ""
  );

  content = content.replace(
    /\s*<button\b[\s\S]*?onClick=\{\(\)\s*=>\s*setMode\(["']patient["']\)\}[\s\S]*?<\/button>\s*/g,
    "\n"
  );

  content = content.replace(
    /\{\s*mode\s*===\s*["']patient["']\s*&&\s*<PatientLink\s*\/>\s*\}/g,
    ""
  );

  content = content.replace(/mode\s*===\s*["']patient["']/g, "false");

  content = content.replace(/type\s+Mode\s*=\s*["']doctor["']\s*\|?\s*;/g, 'type Mode = "doctor";');

  return content;
}

if (!fs.existsSync(root)) {
  throw new Error(`Figma UI root not found: ${root}`);
}

const files = walk(root);

for (const file of files) {
  let content = fs.readFileSync(file, "utf8");
  content = cleanMojibake(content);

  if (path.normalize(file) === path.normalize(appPath)) {
    content = removePatientJourneyFromDoctorApp(content);
  }

  fs.writeFileSync(file, content, "utf8");
}

console.log(`Cleaned ${files.length} Figma UI files.`);
console.log("Removed patient public-link rendering from doctor App.tsx.");
