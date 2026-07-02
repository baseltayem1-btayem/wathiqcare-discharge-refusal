/**
 * Generate the FigureLabs procedure illustration registry CSV.
 *
 * Usage:
 *   npx tsx scripts/generate-figurelabs-registry.ts
 *
 * Outputs:
 *   docs/clinical-illustrations/procedure_illustration_registry.csv
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { buildImcSeedPlan } from "../src/lib/server/clinical-knowledge/migration/seed-from-imc";

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

const APPROVED_LAP_CHOLE = {
  keys: new Set(["laparoscopic-cholecystectomy", "cholecystectomy-laparoscopic"]),
  aliases: ["Laparoscopic Cholecystectomy", "Cholecystectomy Laparoscopic", "Lap Chole", "استئصال المرارة بالمنظار"],
  anatomyRegion: "Gallbladder, liver, bile ducts, upper right abdomen",
  imageFileName: "laparoscopic_cholecystectomy_anatomy_procedure_education_v1_approved.png",
  imageReviewStatus: "approved",
  patientFacing: true,
  disclaimerEn: "This illustration is for patient education only and does not replace the physician’s explanation.",
  disclaimerAr: "هذه الصورة لأغراض التثقيف فقط ولا تُغني عن شرح الطبيب المعالج.",
};

const DEFAULT_DISCLAIMER_EN =
  "This illustration is for patient education only and does not replace the physician’s explanation.";
const DEFAULT_DISCLAIMER_AR =
  "هذه الصورة لأغراض التثقيف فقط ولا تُغني عن شرح الطبيب المعالج.";

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
  };
  return known[specialtyCode] || slugify(specialtyNameEn);
}

function inferAnatomyRegion(procedureNameEn: string, specialtyCode: string, specialtyNameEn: string): string {
  const lower = procedureNameEn.toLowerCase();

  // Approved exception
  if (
    lower.includes("cholecystectomy") ||
    lower.includes("lap chole") ||
    lower.includes("laparoscopic cholecystectomy")
  ) {
    return APPROVED_LAP_CHOLE.anatomyRegion;
  }

  if (lower.includes("appendectomy")) return "Appendix and lower right abdomen";
  if (lower.includes("hernia")) return "Abdominal wall and groin region";
  if (lower.includes("hemorrhoid")) return "Anal canal and lower rectum";
  if (lower.includes("fissure")) return "Anal canal";
  if (lower.includes("fistula")) return "Perianal region";
  if (lower.includes("tonsil")) return "Oropharynx and tonsils";
  if (lower.includes("adenoid")) return "Nasopharynx and adenoids";
  if (lower.includes("myringotomy") || lower.includes("grommet")) return "Middle ear and tympanic membrane";
  if (lower.includes("septoplasty")) return "Nasal septum and nasal cavity";
  if (lower.includes("sinus")) return "Paranasal sinuses";
  if (lower.includes("endoscopy") || lower.includes("colonoscopy") || lower.includes("gastroscopy")) {
    return "Gastrointestinal tract";
  }
  if (lower.includes("biopsy")) return "Target tissue site (procedure-specific)";
  if (lower.includes("injection") || lower.includes("block")) return "Target nerve or joint region";

  switch (specialtyCode) {
    case "ENT":
      return "Ear, nose, throat and adjacent head/neck structures";
    case "ANESTHESIA":
      return "Whole body / systemic anesthesia process";
    case "RADIOLOGY":
      return "Relevant body region for imaging or interventional procedure";
    case "GASTROENTEROLOGY":
      return "Gastrointestinal tract";
    case "GENERAL_SURGERY":
    default:
      return `Surgical field related to ${specialtyNameEn}`;
  }
}

function inferIllustrationType(procedureNameEn: string, specialtyCode: string): string {
  const lower = procedureNameEn.toLowerCase();
  const processKeywords = [
    "anesthesia",
    "sedation",
    "imaging",
    "x-ray",
    "ultrasound",
    "scan",
    "consultation",
    "counseling",
    "line insertion",
    "catheter insertion",
    "infusion",
    "monitoring",
  ];
  if (specialtyCode === "ANESTHESIA" || specialtyCode === "RADIOLOGY") return "process_education";
  if (processKeywords.some((k) => lower.includes(k))) return "process_education";
  return "anatomy_procedure_education";
}

function buildPrompt(row: {
  procedureNameEn: string;
  procedureNameAr: string;
  specialty: string;
  anatomyRegion: string;
  illustrationType: string;
}): string {
  const typeInstruction =
    row.illustrationType === "process_education"
      ? "Focus on the care pathway, device, instrument, or procedural steps rather than internal organ anatomy."
      : "Show the relevant human anatomy clearly and the basic concept of the procedure, including the instrument or treatment path where applicable.";

  return [
    `Create a patient-friendly, non-graphic, non-bloody medical illustration for informed consent education.`,
    ``,
    `Procedure (English): ${row.procedureNameEn}`,
    `Procedure (Arabic): ${row.procedureNameAr}`,
    `Specialty: ${row.specialty}`,
    `Anatomical region / focus: ${row.anatomyRegion}`,
    `Illustration type: ${row.illustrationType}`,
    ``,
    `Requirements:`,
    `- Clean, professional, hospital-grade patient education style`,
    `- ${typeInstruction}`,
    `- Use soft clinical colors on a white or very light background`,
    `- Label the main anatomical structures or steps clearly in English`,
    `- Leave adequate space for Arabic label overlays`,
    `- Include short callout labels for the procedural target or key step`,
    `- Do not include any patient-identifiable information, hospital logos, watermarks, or frightening imagery`,
    `- Landscape orientation, high resolution, suitable for informed consent display`,
    `- Include a blank area at the bottom for the informed consent disclaimer`,
  ].join("\n");
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
  const headers = [
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
    lines.push(
      headers
        .map((h) => csvEscape(row[h as keyof RegistryRow]))
        .join(","),
    );
  }
  return lines.join("\n");
}

function main() {
  const plan = buildImcSeedPlan({ tenantId: "registry-generation", createdByUserId: "system" });

  const specialtyById = new Map<string, { nameEn: string; nameAr: string; code: string }>();
  for (const s of plan.specialties) {
    if (s.id) {
      specialtyById.set(s.id as string, {
        nameEn: (s.nameEn as string) || "General Surgery",
        nameAr: (s.nameAr as string) || "الجراحة العامة",
        code: (s.code as string) || "GENERAL_SURGERY",
      });
    }
  }

  const seenKeys = new Set<string>();
  const rows: RegistryRow[] = [];

  for (let i = 0; i < plan.procedures.length; i++) {
    const proc = plan.procedures[i];
    const specialty = specialtyById.get(proc.specialtyId as string) || {
      nameEn: "General Surgery",
      nameAr: "الجراحة العامة",
      code: "GENERAL_SURGERY",
    };

    const procedureNameEn = (proc.nameEn as string) || "";
    const procedureNameAr = (proc.nameAr as string) || procedureNameEn;
    const canonicalProcedureKey = slugify(procedureNameEn);

    if (seenKeys.has(canonicalProcedureKey)) {
      console.warn(`Duplicate canonical key detected: ${canonicalProcedureKey} (${procedureNameEn})`);
    }
    seenKeys.add(canonicalProcedureKey);

    const approved = isApprovedLapChole(canonicalProcedureKey, procedureNameEn);
    const anatomyRegion = approved
      ? APPROVED_LAP_CHOLE.anatomyRegion
      : inferAnatomyRegion(procedureNameEn, specialty.code, specialty.nameEn);
    const illustrationType = approved
      ? "anatomy_procedure_education"
      : inferIllustrationType(procedureNameEn, specialty.code);

    const aliases = approved
      ? APPROVED_LAP_CHOLE.aliases.join(" | ")
      : [procedureNameEn, procedureNameAr].join(" | ");

    const imageFileName = approved
      ? APPROVED_LAP_CHOLE.imageFileName
      : `${canonicalProcedureKey}_${illustrationType}_v1_draft.png`;

    const specialtySlugValue = specialtySlug(specialty.nameEn, specialty.code);
    const imagePublicPath = `apps/web/public/educational/clinical-illustrations/${specialtySlugValue}/${canonicalProcedureKey}/${imageFileName}`;
    const certificatePath = `docs/clinical-illustrations/figurelabs/${canonicalProcedureKey}/${canonicalProcedureKey}_figurelabs_authorization_certificate_v1.pdf`;

    const figureLabsPrompt = buildPrompt({
      procedureNameEn,
      procedureNameAr,
      specialty: specialty.nameEn,
      anatomyRegion,
      illustrationType,
    });

    rows.push({
      sequence: i + 1,
      specialty: specialty.nameEn,
      procedureNameEn,
      procedureNameAr,
      canonicalProcedureKey,
      aliases,
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
      disclaimerEn: approved ? APPROVED_LAP_CHOLE.disclaimerEn : DEFAULT_DISCLAIMER_EN,
      disclaimerAr: approved ? APPROVED_LAP_CHOLE.disclaimerAr : DEFAULT_DISCLAIMER_AR,
      notes: approved
        ? "Approved FigureLabs educational illustration."
        : "Pending FigureLabs generation and medical review.",
    });
  }

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, toCsv(rows), "utf8");

  console.log(`Wrote ${rows.length} rows to ${OUTPUT_PATH}`);
  console.log(`Unique canonical keys: ${seenKeys.size}`);
  console.log(`Approved rows: ${rows.filter((r) => r.imageReviewStatus === "approved").length}`);
}

main();
