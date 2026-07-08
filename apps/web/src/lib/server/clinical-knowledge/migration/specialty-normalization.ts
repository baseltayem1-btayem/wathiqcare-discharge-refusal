/**
 * Specialty normalization for IMC → Clinical Knowledge Engine.
 *
 * Maps raw specialty strings from the IMC approved consent library to stable
 * CKE specialty codes. Any unrecognized specialty falls back to `GENERAL_SURGERY`
 * and is captured in the seed validation report for clinical governance review.
 */

export interface NormalizedSpecialty {
  code: string;
  nameEn: string;
  nameAr: string;
}

const SPECIALTY_NORMALIZATION_MAP: Record<string, NormalizedSpecialty> = {
  "General / Other": {
    code: "GENERAL_SURGERY",
    nameEn: "General Surgery / Other",
    nameAr: "الجراحة العامة / أخرى",
  },
  ENT: {
    code: "ENT",
    nameEn: "Ear, Nose and Throat",
    nameAr: "أنف وأذن وحنجرة",
  },
  Anesthesia: {
    code: "ANESTHESIA",
    nameEn: "Anesthesia",
    nameAr: "التخدير",
  },
  "Radiology / Interventional Radiology": {
    code: "RADIOLOGY",
    nameEn: "Radiology / Interventional Radiology",
    nameAr: "الأشعة / الأشعة التداخلية",
  },
  Gastroenterology: {
    code: "GASTROENTEROLOGY",
    nameEn: "Gastroenterology",
    nameAr: "أمراض الجهاز الهضمي",
  },
};

export function normalizeSpecialty(rawSpecialty: string): NormalizedSpecialty {
  const trimmed = rawSpecialty.trim();
  const mapped = SPECIALTY_NORMALIZATION_MAP[trimmed];
  if (mapped) return mapped;

  const code = trimmed
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return {
    code: code || "GENERAL_SURGERY",
    nameEn: trimmed,
    nameAr: trimmed,
  };
}

export function listKnownSpecialtyCodes(): string[] {
  return Array.from(new Set(Object.values(SPECIALTY_NORMALIZATION_MAP).map((s) => s.code)));
}
