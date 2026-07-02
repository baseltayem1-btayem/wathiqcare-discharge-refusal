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
import { dirname } from "node:path";
import { buildImcSeedPlan } from "../src/lib/server/clinical-knowledge/migration/seed-from-imc";
import {
  APPROVED_LAP_CHOLE,
  DEFAULT_DISCLAIMER_EN,
  DEFAULT_DISCLAIMER_AR,
  inferSpecialty,
  inferAnatomyRegion,
  inferIllustrationType,
  getArabicName,
  getAliases,
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
  };
  return known[specialtyCode] || slugify(specialtyNameEn);
}

function isApprovedLapChole(canonicalKey: string, procedureNameEn: string): boolean {
  return (
    APPROVED_LAP_CHOLE.keys.has(canonicalKey) ||
    procedureNameEn.toLowerCase() === "laparoscopic cholecystectomy" ||
    procedureNameEn.toLowerCase() === "cholecystectomy laparoscopic"
  );
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
    const approved = isApprovedLapChole(canonicalProcedureKey, procedureNameEn);

    const anatomyRegion = approved
      ? APPROVED_LAP_CHOLE.anatomyRegion
      : inferAnatomyRegion(procedureNameEn, correctedSpecialty.nameEn);

    const illustrationType = approved
      ? "anatomy_procedure_education"
      : inferIllustrationType(procedureNameEn);

    const arabic = approved
      ? { name: APPROVED_LAP_CHOLE.procedureNameAr }
      : getArabicName(canonicalProcedureKey, procedureNameEn);

    const procedureNameAr = arabic.name;
    const aliases = getAliases(canonicalProcedureKey, procedureNameEn, procedureNameAr);

    const imageFileName = approved
      ? APPROVED_LAP_CHOLE.imageFileName
      : `${canonicalProcedureKey}_${illustrationType}_v1_draft.png`;

    const specialtySlugValue = specialtySlug(correctedSpecialty.nameEn, correctedSpecialty.code);
    const imagePublicPath = `apps/web/public/educational/clinical-illustrations/${specialtySlugValue}/${canonicalProcedureKey}/${imageFileName}`;
    const certificatePath = `docs/clinical-illustrations/figurelabs/${canonicalProcedureKey}/${canonicalProcedureKey}_figurelabs_authorization_certificate_v1.pdf`;

    const notesParts: string[] = [];
    if (arabic.note) notesParts.push(arabic.note);
    if (!approved) notesParts.push("Pending FigureLabs generation and medical review.");
    const notes = notesParts.join(" ").trim();

    const figureLabsPrompt = buildFigureLabsPrompt({
      procedureNameEn,
      procedureNameAr,
      specialty: correctedSpecialty.nameEn,
      anatomyRegion,
      illustrationType,
    });

    rows.push({
      sequence: i + 1,
      specialty: correctedSpecialty.nameEn,
      procedureNameEn,
      procedureNameAr,
      canonicalProcedureKey,
      aliases: aliases.join(" | "),
      anatomyRegion,
      illustrationType,
      figureLabsPrompt,
      imageFileName,
      imagePublicPath,
      certificatePath,
      imageReviewStatus: approved ? APPROVED_LAP_CHOLE.imageReviewStatus : "draft",
      patientFacing: approved ? APPROVED_LAP_CHOLE.patientFacing : false,
      source: "FigureLabs",
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
