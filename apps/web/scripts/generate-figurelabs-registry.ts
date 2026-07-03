/**
 * Generate the FigureLabs procedure illustration registry CSV.
 *
 * Usage:
 *   npx tsx scripts/generate-figurelabs-registry.ts
 *
 * Outputs:
 *   docs/clinical-illustrations/procedure_illustration_registry.csv
 *
 * This script pulls the procedure list from the Clinical Knowledge Engine seed
 * plan and applies a clinical QA pass (specialty correction, anatomy regions,
 * Arabic names, illustration type, and FigureLabs prompts).
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, basename } from "node:path";
import { buildImcSeedPlan } from "../src/lib/server/clinical-knowledge/migration/seed-from-imc";
import {
  BATCH_1_ILLUSTRATIONS,
  BATCH_2_GENERATED,
  BATCH_3_GENERATED,
  BATCH_4_GENERATED,
  DEFAULT_DISCLAIMER_EN,
  DEFAULT_DISCLAIMER_AR,
  inferSpecialty,
  inferAnatomyRegion,
  inferIllustrationType,
  getArabicName,
  buildFigureLabsPrompt,
  type SpecialtyInfo,
} from "./figurelabs-registry-data";

interface RegistryRow {
  sequence: number;
  specialty: string;
  procedureNameEn: string;
  procedureNameAr: string;
  canonicalProcedureKey: string;
  aliases: string;
  anatomyRegion: string;
  illustrationType: string;
  figureLabsPrompt: string;
  imageFileName: string;
  imagePublicPath: string;
  certificatePath: string;
  imageReviewStatus: string;
  patientFacing: boolean;
  source: string;
  version: string;
  disclaimerEn: string;
  disclaimerAr: string;
  notes: string;
}

const OUTPUT_PATH = "../../docs/clinical-illustrations/procedure_illustration_registry.csv";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function specialtySlug(specialtyNameEn: string, specialtyCode: string): string {
  const known: Record<string, string> = {
    GENERAL_SURGERY: "general-surgery",
    ENT: "ent",
    ANESTHESIA: "anesthesia",
    RADIOLOGY: "radiology",
    GASTROENTEROLOGY: "gastroenterology",
    OPHTHALMOLOGY: "ophthalmology",
    CARDIOLOGY: "cardiology",
    NEURO_INTERVENTIONAL: "neurosurgery-neuro-interventional-radiology",
    VASCULAR_SURGERY: "vascular-surgery",
    ORTHOPEDICS: "orthopedics",
    OBSTETRICS_GYNECOLOGY: "obstetrics-gynecology",
    UROLOGY: "urology",
    PLASTIC_DERMATOLOGY: "plastic-dermatologic-surgery",
    ALLERGY_IMMUNOLOGY: "allergy-immunology",
    TRANSFUSION_MEDICINE: "transfusion-medicine",
    BREAST_SURGERY: "breast-surgery",
    ENDOCRINE_SURGERY: "endocrine-surgery",
    COLORECTAL_SURGERY: "colorectal-surgery",
    PULMONOLOGY_INTERVENTIONAL: "pulmonology-interventional-radiology",
    NEURO_RADIO_ANESTHESIA: "neurology-radiology-anesthesia",
  };
  return known[specialtyCode] || slugify(specialtyNameEn);
}

function csvEscape(value: string | number | boolean): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows: RegistryRow[]): string {
  const headers: (keyof RegistryRow)[] = [
    "sequence",
    "specialty",
    "procedureNameEn",
    "procedureNameAr",
    "canonicalProcedureKey",
    "aliases",
    "anatomyRegion",
    "illustrationType",
    "figureLabsPrompt",
    "imageFileName",
    "imagePublicPath",
    "certificatePath",
    "imageReviewStatus",
    "patientFacing",
    "source",
    "version",
    "disclaimerEn",
    "disclaimerAr",
    "notes",
  ];

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  return lines.join("\n");
}

function main() {
  const plan = buildImcSeedPlan({ tenantId: "registry-generation", createdByUserId: "system" });

  const specialtyById = new Map<string, SpecialtyInfo>();
  for (const s of plan.specialties) {
    if (s.id) {
      const rawName = (s.nameEn as string) || "General Surgery / Other";
      specialtyById.set(s.id as string, {
        nameEn: rawName,
        nameAr: (s.nameAr as string) || rawName,
        code: (s.code as string) || "GENERAL_SURGERY",
      });
    }
  }

  const seenKeys = new Set<string>();
  const rows: RegistryRow[] = [];

  for (let i = 0; i < plan.procedures.length; i++) {
    const proc = plan.procedures[i];
    const rawSpecialty = specialtyById.get(proc.specialtyId as string) || {
      nameEn: "General Surgery / Other",
      nameAr: "الجراحة العامة / أخرى",
      code: "GENERAL_SURGERY",
    };

    const procedureNameEn = (proc.nameEn as string) || "";
    const canonicalProcedureKey = slugify(procedureNameEn);

    if (seenKeys.has(canonicalProcedureKey)) {
      console.warn(`Duplicate canonical key detected: ${canonicalProcedureKey} (${procedureNameEn})`);
    }
    seenKeys.add(canonicalProcedureKey);

    const correctedSpecialty = inferSpecialty(procedureNameEn, rawSpecialty);
    const batch1Override = Object.values(BATCH_1_ILLUSTRATIONS).find(
      (o) =>
        o.procedureNameEn === procedureNameEn ||
        o.aliases?.includes(procedureNameEn) ||
        slugify(o.procedureNameEn) === canonicalProcedureKey,
    );
    const batch2Override = Object.values(BATCH_2_GENERATED).find(
      (o) =>
        o.procedureNameEn === procedureNameEn ||
        o.aliases?.includes(procedureNameEn) ||
        slugify(o.procedureNameEn) === canonicalProcedureKey,
    );
    const batch3Override = Object.values(BATCH_3_GENERATED).find(
      (o) =>
        o.procedureNameEn === procedureNameEn ||
        o.aliases?.includes(procedureNameEn) ||
        slugify(o.procedureNameEn) === canonicalProcedureKey,
    );
    const batch4Override = Object.values(BATCH_4_GENERATED).find(
      (o) =>
        o.procedureNameEn === procedureNameEn ||
        o.aliases?.includes(procedureNameEn) ||
        slugify(o.procedureNameEn) === canonicalProcedureKey,
    );

    let finalCanonicalKey: string;
    let finalSpecialty: SpecialtyInfo;
    let anatomyRegion: string;
    let illustrationType: string;
    let procedureNameAr: string;
    let aliases: string[];
    let imageFileName: string;
    let imagePublicPath: string;
    let imageReviewStatus: string = "draft";
    let patientFacing: boolean = false;
    let notes: string;
    let source: string = "FigureLabs";

    if (batch1Override) {
      finalCanonicalKey = slugify(batch1Override.procedureNameEn);
      finalSpecialty = batch1Override.specialty!;
      anatomyRegion = batch1Override.anatomyRegion!;
      illustrationType = batch1Override.illustrationType!;
      procedureNameAr = batch1Override.procedureNameAr ?? procedureNameEn;
      aliases = batch1Override.aliases ?? [batch1Override.procedureNameEn, procedureNameAr];
      imageFileName = basename(batch1Override.procedureImageUrl);
      imagePublicPath = batch1Override.procedureImageUrl;
      imageReviewStatus = batch1Override.imageReviewStatus;
      patientFacing = batch1Override.patientFacing;
      const noteParts: string[] = [];
      if (batch1Override.notes) noteParts.push(batch1Override.notes);
      notes = noteParts.join(" ").trim();
    } else if (batch2Override) {
      finalCanonicalKey = slugify(batch2Override.procedureNameEn);
      finalSpecialty = batch2Override.specialty!;
      anatomyRegion = batch2Override.anatomyRegion!;
      illustrationType = batch2Override.illustrationType!;
      procedureNameAr = batch2Override.procedureNameAr ?? procedureNameEn;
      aliases = batch2Override.aliases ?? [batch2Override.procedureNameEn, procedureNameAr];
      imageFileName = basename(batch2Override.procedureImageUrl);
      imagePublicPath = batch2Override.procedureImageUrl;
      imageReviewStatus = batch2Override.imageReviewStatus;
      patientFacing = batch2Override.patientFacing;
      source = "ChatGPT";
      const noteParts: string[] = [];
      if (batch2Override.notes) noteParts.push(batch2Override.notes);
      notes = noteParts.join(" ").trim();
    } else if (batch3Override) {
      finalCanonicalKey = slugify(batch3Override.procedureNameEn);
      finalSpecialty = batch3Override.specialty!;
      anatomyRegion = batch3Override.anatomyRegion!;
      illustrationType = batch3Override.illustrationType!;
      procedureNameAr = batch3Override.procedureNameAr ?? procedureNameEn;
      aliases = batch3Override.aliases ?? [batch3Override.procedureNameEn, procedureNameAr];
      imageFileName = basename(batch3Override.procedureImageUrl);
      imagePublicPath = batch3Override.procedureImageUrl;
      imageReviewStatus = batch3Override.imageReviewStatus;
      patientFacing = batch3Override.patientFacing;
      source = "ChatGPT";
      const noteParts: string[] = [];
      if (batch3Override.notes) noteParts.push(batch3Override.notes);
      notes = noteParts.join(" ").trim();
    } else if (batch4Override) {
      finalCanonicalKey = slugify(batch4Override.procedureNameEn);
      finalSpecialty = batch4Override.specialty!;
      anatomyRegion = batch4Override.anatomyRegion!;
      illustrationType = batch4Override.illustrationType!;
      procedureNameAr = batch4Override.procedureNameAr ?? procedureNameEn;
      aliases = batch4Override.aliases ?? [batch4Override.procedureNameEn, procedureNameAr];
      imageFileName = basename(batch4Override.procedureImageUrl);
      imagePublicPath = batch4Override.procedureImageUrl;
      imageReviewStatus = batch4Override.imageReviewStatus;
      patientFacing = batch4Override.patientFacing;
      source = "ChatGPT";
      const noteParts: string[] = [];
      if (batch4Override.notes) noteParts.push(batch4Override.notes);
      notes = noteParts.join(" ").trim();
    } else {
      finalCanonicalKey = canonicalProcedureKey;
      finalSpecialty = correctedSpecialty;
      anatomyRegion = inferAnatomyRegion(procedureNameEn, finalSpecialty.nameEn);
      illustrationType = inferIllustrationType(procedureNameEn);
      const arabic = getArabicName(finalCanonicalKey, procedureNameEn);
      procedureNameAr = arabic.name;
      aliases = [procedureNameEn, procedureNameAr];
      imageFileName = `${finalCanonicalKey}_${illustrationType}_v1_draft.png`;
      imagePublicPath = `apps/web/public/educational/clinical-illustrations/${specialtySlug(finalSpecialty.nameEn, finalSpecialty.code)}/${finalCanonicalKey}/${imageFileName}`;
      const noteParts: string[] = [];
      if (arabic.note) noteParts.push(arabic.note);
      noteParts.push("Pending FigureLabs generation and medical review.");
      notes = noteParts.join(" ").trim();
    }

    const certificatePath = `docs/clinical-illustrations/figurelabs/${finalCanonicalKey}/${finalCanonicalKey}_figurelabs_authorization_certificate_v1.pdf`;

    const figureLabsPrompt = buildFigureLabsPrompt({
      procedureNameEn,
      procedureNameAr,
      specialty: finalSpecialty.nameEn,
      anatomyRegion,
      illustrationType,
    });

    rows.push({
      sequence: i + 1,
      specialty: finalSpecialty.nameEn,
      procedureNameEn,
      procedureNameAr,
      canonicalProcedureKey: finalCanonicalKey,
      aliases: aliases.join(" | "),
      anatomyRegion,
      illustrationType,
      figureLabsPrompt,
      imageFileName,
      imagePublicPath,
      certificatePath,
      imageReviewStatus,
      patientFacing,
      source,
      version: "v1",
      disclaimerEn: DEFAULT_DISCLAIMER_EN,
      disclaimerAr: DEFAULT_DISCLAIMER_AR,
      notes,
    });
  }

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, toCsv(rows), "utf8");

  console.log(`Wrote ${rows.length} rows to ${OUTPUT_PATH}`);
  console.log(`Unique canonical keys: ${seenKeys.size}`);
  console.log(`Approved rows: ${rows.filter((r) => r.imageReviewStatus === "approved").length}`);
}

main();
