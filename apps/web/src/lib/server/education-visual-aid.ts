import crypto from "node:crypto";

export type EducationVisualLanguage = "ar" | "en" | "bilingual";

export type EducationVisualGenerateInput = {
  diagnosis?: string | null;
  procedure?: string | null;
  specialty?: string | null;
  language?: EducationVisualLanguage | null;
  formCode?: string | null;
  templateId?: string | null;
};

export type EducationVisualAid = {
  displayed: boolean;
  displayedTitle: string;
  visualType: string;
  visualAssetId: string;
  clinicalTopic: string;
  language: EducationVisualLanguage;
  imageUrl: string;
  thumbnailUrl: string;
  promptSummary: string;
  generatedAt: string;
  approvedForEducation: boolean;
  source: "ai-generated";
  disclaimerEn: string;
  disclaimerAr: string;
  patientAcknowledged: boolean;
};

function buildVisualAssetId(seed: string): string {
  return `EVA-${seed.slice(0, 12).toUpperCase()}`;
}
const DISCLAIMER_EN = "This visual is for patient education only and does not replace physician explanation.";
const DISCLAIMER_AR = "هذه الصورة للتثقيف فقط ولا تغني عن شرح الطبيب.";

function sanitizePromptValue(value: string | null | undefined): string {
  if (!value) return "";

  return value
    .replace(/\b(patient|name|mrn|dob|date of birth|case|case number)\b\s*[:#-]?\s*[^,;\n]+/gi, "")
    .replace(/\b\d{6,}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toLanguage(value: string | null | undefined): EducationVisualLanguage {
  return value === "ar" || value === "en" || value === "bilingual" ? value : "bilingual";
}

function buildClinicalTopic(input: EducationVisualGenerateInput): string {
  const diagnosis = sanitizePromptValue(input.diagnosis);
  const procedure = sanitizePromptValue(input.procedure);

  if (diagnosis && procedure) {
    return `${diagnosis} / ${procedure}`;
  }

  return diagnosis || procedure || "General informed consent education";
}

function buildDisplayedTitle(language: EducationVisualLanguage, clinicalTopic: string): string {
  if (language === "ar") {
    return `صورة تثقيفية طبية: ${clinicalTopic}`;
  }

  if (language === "bilingual") {
    return `Educational Medical Visual / صورة تثقيفية طبية`;
  }

  return `Educational Medical Visual: ${clinicalTopic}`;
}

function buildPromptSummary(input: EducationVisualGenerateInput, clinicalTopic: string): string {
  const specialty = sanitizePromptValue(input.specialty) || "general clinical care";
  const formCode = sanitizePromptValue(input.formCode);
  const templateId = sanitizePromptValue(input.templateId);

  return [
    "Create a non-graphic educational medical illustration for patient education.",
    `Clinical topic: ${clinicalTopic}.`,
    `Specialty context: ${specialty}.`,
    formCode ? `Form code: ${formCode}.` : "",
    templateId ? `Template reference: ${templateId}.` : "",
    "Show the disease or condition together with the planned treatment or procedure.",
    "Use a clean enterprise infographic style with simple anatomical context and no patient identifiers.",
  ].filter(Boolean).join(" ");
}

function hashSeed(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

function buildSvg(args: {
  width: number;
  height: number;
  title: string;
  subtitle: string;
  accent: string;
  accentSoft: string;
  language: EducationVisualLanguage;
}): string {
  const rtl = args.language === "ar";
  const titleX = rtl ? args.width - 28 : 28;
  const anchor = rtl ? "end" : "start";
  const dir = rtl ? "rtl" : "ltr";

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${args.width}" height="${args.height}" viewBox="0 0 ${args.width} ${args.height}" role="img" aria-label="Educational medical visual">
    <defs>
      <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="#f8fbff" />
        <stop offset="100%" stop-color="#edf5fb" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" rx="20" fill="url(#bg)" />
    <rect x="18" y="18" width="${args.width - 36}" height="${args.height - 36}" rx="18" fill="#ffffff" stroke="#d6e0ea" />
    <circle cx="${Math.round(args.width * 0.24)}" cy="${Math.round(args.height * 0.56)}" r="${Math.round(args.height * 0.15)}" fill="${args.accentSoft}" />
    <ellipse cx="${Math.round(args.width * 0.67)}" cy="${Math.round(args.height * 0.58)}" rx="${Math.round(args.width * 0.13)}" ry="${Math.round(args.height * 0.18)}" fill="#e8f1f8" stroke="${args.accent}" stroke-width="3" />
    <path d="M ${Math.round(args.width * 0.34)} ${Math.round(args.height * 0.62)} C ${Math.round(args.width * 0.44)} ${Math.round(args.height * 0.44)}, ${Math.round(args.width * 0.52)} ${Math.round(args.height * 0.44)}, ${Math.round(args.width * 0.61)} ${Math.round(args.height * 0.58)}" fill="none" stroke="${args.accent}" stroke-width="6" stroke-linecap="round" />
    <circle cx="${Math.round(args.width * 0.36)}" cy="${Math.round(args.height * 0.58)}" r="10" fill="${args.accent}" />
    <rect x="${Math.round(args.width * 0.58)}" y="${Math.round(args.height * 0.34)}" width="${Math.round(args.width * 0.16)}" height="${Math.round(args.height * 0.1)}" rx="12" fill="${args.accentSoft}" stroke="${args.accent}" stroke-width="2" />
    <text x="${titleX}" y="54" text-anchor="${anchor}" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#002b5c" direction="${dir}">${escapeXml(args.title)}</text>
    <text x="${titleX}" y="84" text-anchor="${anchor}" font-family="Arial, sans-serif" font-size="14" fill="#475569" direction="${dir}">${escapeXml(args.subtitle)}</text>
    <text x="${titleX}" y="${args.height - 24}" text-anchor="${anchor}" font-family="Arial, sans-serif" font-size="12" fill="#64748b" direction="${dir}">${escapeXml(DISCLAIMER_EN)}</text>
  </svg>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildEducationVisualAid(
  input: EducationVisualGenerateInput,
  overrides: Partial<Pick<EducationVisualAid, "displayed" | "patientAcknowledged" | "generatedAt">> = {},
): EducationVisualAid {
  const language = toLanguage(input.language);
  const clinicalTopic = buildClinicalTopic(input);
  const promptSummary = buildPromptSummary(input, clinicalTopic);
  const seed = hashSeed(`${clinicalTopic}|${promptSummary}|${language}`);
  const accent = `#${seed.slice(0, 6)}`;
  const accentSoft = `#${seed.slice(6, 12)}22`;
  const displayedTitle = buildDisplayedTitle(language, clinicalTopic);
  const generatedAt = overrides.generatedAt || new Date().toISOString();
  const visualAssetId = buildVisualAssetId(seed);

  return {
    displayed: overrides.displayed ?? true,
    displayedTitle,
    visualType: "AI-assisted Clinical Illustration",
    visualAssetId,
    clinicalTopic,
    language,
    imageUrl: svgToDataUrl(buildSvg({
      width: 960,
      height: 540,
      title: displayedTitle,
      subtitle: clinicalTopic,
      accent,
      accentSoft,
      language,
    })),
    thumbnailUrl: svgToDataUrl(buildSvg({
      width: 420,
      height: 280,
      title: language === "ar" ? "معاينة مرئية" : "Visual Preview",
      subtitle: clinicalTopic,
      accent,
      accentSoft,
      language,
    })),
    promptSummary,
    generatedAt,
    approvedForEducation: true,
    source: "ai-generated",
    disclaimerEn: DISCLAIMER_EN,
    disclaimerAr: DISCLAIMER_AR,
    patientAcknowledged: overrides.patientAcknowledged ?? false,
  };
}

export function parseEducationVisualAid(value: unknown): EducationVisualAid | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.source !== "ai-generated") return null;
  if (typeof record.imageUrl !== "string" || typeof record.thumbnailUrl !== "string") return null;
  if (typeof record.clinicalTopic !== "string") return null;

  return {
    displayed: record.displayed !== false,
    displayedTitle: typeof record.displayedTitle === "string" ? record.displayedTitle : "Educational Medical Visual / صورة تثقيفية طبية",
    visualType: typeof record.visualType === "string" && record.visualType.trim() ? record.visualType.trim() : "AI-assisted Clinical Illustration",
    visualAssetId: typeof record.visualAssetId === "string" && record.visualAssetId.trim() ? record.visualAssetId.trim() : buildVisualAssetId(hashSeed(record.clinicalTopic)),
    clinicalTopic: record.clinicalTopic,
    language: toLanguage(typeof record.language === "string" ? record.language : null),
    imageUrl: record.imageUrl,
    thumbnailUrl: record.thumbnailUrl,
    promptSummary: typeof record.promptSummary === "string" ? record.promptSummary : "",
    generatedAt: typeof record.generatedAt === "string" ? record.generatedAt : new Date().toISOString(),
    approvedForEducation: record.approvedForEducation !== false,
    source: "ai-generated",
    disclaimerEn: typeof record.disclaimerEn === "string" ? record.disclaimerEn : DISCLAIMER_EN,
    disclaimerAr: typeof record.disclaimerAr === "string" ? record.disclaimerAr : DISCLAIMER_AR,
    patientAcknowledged: record.patientAcknowledged === true,
  };
}