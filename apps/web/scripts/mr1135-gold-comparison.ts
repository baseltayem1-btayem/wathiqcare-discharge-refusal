/**
 * MR1135 amputation gold comparison.
 *
 * Compares the deterministic auto-calibration output for the amputation form
 * against the verified AcroForm manifest (IMC MR 1135). AI is disabled; only
 * blank-form deterministic geometry is evaluated.
 */

import fs from "fs/promises";
import path from "path";
import { CalibrationEngine } from "../src/lib/server/form-auto-calibration/engine/calibration-engine";
import { InMemoryCandidateRegistry } from "../src/lib/server/form-auto-calibration/registry/candidate-registry";
import { normalizeAcroFormRect, rectsOverlap, type NormalizedRectangle } from "../src/lib/server/form-auto-calibration/geometry/rectangle-normalization";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;

const ACROFORM_MANIFEST_PATH = path.join(
  process.cwd(),
  "src",
  "lib",
  "server",
  "acroform",
  "manifests",
  "imc-mr-1135-amputation.manifest.json",
);

const AMputationPdfPath = path.join(process.cwd(), "public", "approved-consent-forms", "amputation.pdf");

// Best-effort mapping from calibration ontology keys to the acroform semantic keys.
const ONTOLOGY_TO_GOLD_KEY: Record<string, string | string[]> = {
  "patient.mrn": "mrn",
  "patient.name": "patient_name",
  "patient.date_of_birth": "date_of_birth",
  "procedure.name_site_side.en": "proposed_procedure_en",
  "procedure.name_site_side.ar": "proposed_procedure_ar",
  "procedure.condition.en": "condition_description_en",
  "procedure.condition.ar": "condition_description_ar",
  "procedure.significant_risks.en": "significant_risks_options_en",
  "procedure.significant_risks.ar": "significant_risks_options_ar",
  "procedure.no_treatment_risks.en": "risks_without_procedure_en",
  "procedure.no_treatment_risks.ar": "risks_without_procedure_ar",
  "anesthesia.type.en": "anaesthetic_discussed_en",
  "anesthesia.type.ar": "anaesthetic_discussed_ar",
  "anesthesia.applicable": ["anaesthetic_discussed_en", "anaesthetic_discussed_ar"],
  "patient.signature": ["patient_signature_en", "patient_signature_ar"],
  "physician.signature": ["physician_signature_en", "physician_signature_ar", "witness_signature_en", "witness_signature_ar"],
  "physician.name.en": "physician_name",
  "physician.name.ar": "physician_name",
  "physician.date": "consent_date",
  "physician.time": "consent_time",
  "guardian.relationship": "guardian_relationship",
  "guardian.name": "guardian_name",
  "refusal.acknowledgement": "refusal_acknowledgement",
};

type GoldField = {
  name: string;
  semanticKey: string;
  required: boolean;
  widgets: Array<{ page: number; rect: [number, number, number, number] }>;
};

type GoldManifest = {
  fieldCounts: { total: number; text: number; button: number; signature: number };
  fields: GoldField[];
  canonicalApprovedPdf: { pageSizePoints: { width: number; height: number } };
};

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[_\s]+/g, "").replace(/\./g, "");
}

function matchGoldKeys(ontologyKey: string): string[] {
  const raw = ONTOLOGY_TO_GOLD_KEY[ontologyKey];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function fieldKeySimilarity(a: string, b: string): number {
  const na = normalizeKey(a);
  const nb = normalizeKey(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  return 0;
}

function findBestGoldField(goldFields: GoldField[], ontologyKey: string): GoldField | null {
  const direct = matchGoldKeys(ontologyKey);
  if (direct.length > 0) {
    const found = goldFields.find((f) => direct.includes(f.semanticKey) || direct.includes(f.name));
    if (found) return found;
  }
  // Fuzzy fallback.
  let best: GoldField | null = null;
  let bestScore = 0;
  for (const field of goldFields) {
    const score = Math.max(
      fieldKeySimilarity(ontologyKey, field.semanticKey),
      fieldKeySimilarity(ontologyKey, field.name),
    );
    if (score > bestScore) {
      bestScore = score;
      best = field;
    }
  }
  return bestScore >= 0.8 ? best : null;
}

function rectIntersectionArea(a: NormalizedRectangle, b: NormalizedRectangle): number {
  const aRight = a.x + a.width;
  const aBottom = a.y - a.height;
  const bRight = b.x + b.width;
  const bBottom = b.y - b.height;
  const left = Math.max(a.x, b.x);
  const right = Math.min(aRight, bRight);
  const top = Math.min(a.y, b.y);
  const bottom = Math.max(aBottom, bBottom);
  if (right <= left || top <= bottom) return 0;
  return (right - left) * (top - bottom);
}

function rectUnionArea(a: NormalizedRectangle, b: NormalizedRectangle): number {
  return rectArea(a) + rectArea(b) - rectIntersectionArea(a, b);
}

function rectArea(rect: NormalizedRectangle): number {
  return rect.width * rect.height;
}

function iou(a: NormalizedRectangle, b: NormalizedRectangle): number {
  const inter = rectIntersectionArea(a, b);
  const union = rectUnionArea(a, b);
  return union === 0 ? 0 : inter / union;
}

function containment(cal: NormalizedRectangle, gold: NormalizedRectangle): number {
  const inter = rectIntersectionArea(cal, gold);
  return rectArea(cal) === 0 ? 0 : inter / rectArea(cal);
}

function isOverflow(rect: NormalizedRectangle): boolean {
  return (
    rect.x < 0 ||
    rect.y < 0 ||
    rect.x + rect.width > 1 ||
    rect.y - rect.height < 0 ||
    rect.width <= 0 ||
    rect.height <= 0
  );
}

async function main() {
  const manifestRaw = await fs.readFile(ACROFORM_MANIFEST_PATH, "utf-8");
  const manifest = JSON.parse(manifestRaw) as GoldManifest;
  const goldFields = manifest.fields;

  const registry = new InMemoryCandidateRegistry();
  const engine = new CalibrationEngine({ registry });
  const buffer = await fs.readFile(AMputationPdfPath);
  const result = await engine.calibrate({
    sourceFormId: "amputation",
    sourceFileName: "amputation.pdf",
    pdfBuffer: buffer,
  });

  const candidate = await registry.get(result.candidateId);
  if (!candidate) {
    console.error("Candidate not found in registry");
    process.exit(1);
  }

  const mappings = Array.isArray(candidate.mappings) ? candidate.mappings : [];
  if (mappings.length === 0) {
    console.error("Candidate has no mappings");
    process.exit(1);
  }

  const matchedCanonicalFields: Array<{
    ontologyKey: string;
    goldKey: string;
    page: number;
    iou: number;
    containment: number;
  }> = [];
  const falseMappings: string[] = [];
  const collisions: Array<{ a: string; b: string; page: number }> = [];
  const overflowFailures: Array<{ ontologyKey: string; page: number }> = [];

  const mappedGoldKeys = new Set<string>();

  for (const mapping of mappings) {
    const goldField = findBestGoldField(goldFields, mapping.ontologyKey);
    if (!goldField) {
      falseMappings.push(mapping.ontologyKey);
      continue;
    }

    mappedGoldKeys.add(goldField.semanticKey);

    // Compare first candidate rectangle to the best matching gold widget by page.
    const calRectangle = mapping.rectangles[0];
    const calRect = calRectangle?.absolute;
    if (!calRect) continue;

    const calPage = calRectangle.page ?? 1;
    const goldWidget =
      goldField.widgets.find((w) => w.page === calPage) ?? goldField.widgets[0];
    if (!goldWidget) continue;

    const goldNorm = normalizeAcroFormRect(goldWidget.rect, PAGE_WIDTH, PAGE_HEIGHT);
    matchedCanonicalFields.push({
      ontologyKey: mapping.ontologyKey,
      goldKey: goldField.semanticKey,
      page: calPage,
      iou: iou(calRect, goldNorm),
      containment: containment(calRect, goldNorm),
    });

    if (isOverflow(calRect)) {
      overflowFailures.push({ ontologyKey: mapping.ontologyKey, page: calPage });
    }
  }

  // Collision detection between calibration rectangles on the same page.
  for (let i = 0; i < mappings.length; i++) {
    for (let j = i + 1; j < mappings.length; j++) {
      const a = mappings[i];
      const b = mappings[j];
      const rectAObj = a.rectangles[0];
      const rectBObj = b.rectangles[0];
      const rectA = rectAObj?.absolute;
      const rectB = rectBObj?.absolute;
      if (!rectA || !rectB) continue;
      const pageA = rectAObj.page ?? 1;
      const pageB = rectBObj.page ?? 1;
      if (pageA !== pageB) continue;
      if (rectsOverlap(rectA, rectB)) {
        collisions.push({ a: a.ontologyKey, b: b.ontologyKey, page: pageA });
      }
    }
  }

  // Required fields from the gold manifest that were not mapped.
  const requiredGoldKeys = Array.from(
    new Set(goldFields.filter((f) => f.required).map((f) => f.semanticKey)),
  );
  const missedRequiredFields = requiredGoldKeys.filter((k) => !mappedGoldKeys.has(k));

  const avgIou =
    matchedCanonicalFields.length === 0
      ? 0
      : matchedCanonicalFields.reduce((sum, m) => sum + m.iou, 0) / matchedCanonicalFields.length;
  const avgContainment =
    matchedCanonicalFields.length === 0
      ? 0
      : matchedCanonicalFields.reduce((sum, m) => sum + m.containment, 0) / matchedCanonicalFields.length;

  console.log("# MR1135 Gold Comparison\n");
  console.log(`- Calibration status: ${result.status}`);
  console.log(`- Calibration score: ${result.score}`);
  console.log(`- Matched canonical fields: ${matchedCanonicalFields.length}`);
  console.log(`- Missed required gold fields: ${missedRequiredFields.length}`);
  console.log(`- False mappings: ${falseMappings.length}`);
  console.log(`- Average IoU: ${(avgIou * 100).toFixed(1)}%`);
  console.log(`- Average containment: ${(avgContainment * 100).toFixed(1)}%`);
  console.log(`- Collisions: ${collisions.length}`);
  console.log(`- Overflow failures: ${overflowFailures.length}`);
  console.log(`- Final status: ${result.status}`);

  console.log("\n## Matched canonical fields");
  if (matchedCanonicalFields.length === 0) {
    console.log("None");
  } else {
    console.log("| Ontology Key | Gold Key | Page | IoU | Containment |");
    console.log("|---|---|---|---|---|");
    for (const m of matchedCanonicalFields) {
      console.log(`| ${m.ontologyKey} | ${m.goldKey} | ${m.page} | ${(m.iou * 100).toFixed(1)}% | ${(m.containment * 100).toFixed(1)}% |`);
    }
  }

  console.log("\n## Missed required gold fields");
  console.log(missedRequiredFields.length === 0 ? "None" : missedRequiredFields.join(", "));

  console.log("\n## False mappings");
  console.log(falseMappings.length === 0 ? "None" : falseMappings.join(", "));

  console.log("\n## Collisions");
  if (collisions.length === 0) {
    console.log("None");
  } else {
    console.log("| Field A | Field B | Page |");
    console.log("|---|---|---|");
    for (const c of collisions) {
      console.log(`| ${c.a} | ${c.b} | ${c.page} |`);
    }
  }

  console.log("\n## Overflow failures");
  if (overflowFailures.length === 0) {
    console.log("None");
  } else {
    console.log("| Ontology Key | Page |");
    console.log("|---|---|");
    for (const o of overflowFailures) {
      console.log(`| ${o.ontologyKey} | ${o.page} |`);
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
