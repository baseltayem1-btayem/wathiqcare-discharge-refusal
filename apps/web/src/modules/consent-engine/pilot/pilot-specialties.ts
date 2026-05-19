/**
 * Pilot Specialty Allow-List
 *
 * Static, in-code. No DB lookup. Case-insensitive with alias support.
 */

export const PILOT_ALLOWED_SPECIALTIES = [
  "CARDIOLOGY",
  "GENERAL_SURGERY",
  "ORTHOPEDICS",
  "ANESTHESIA",
  "DAMA",
  "BLOOD_TRANSFUSION",
] as const;

export type PilotSpecialty = (typeof PILOT_ALLOWED_SPECIALTIES)[number];

const SPECIALTY_ALIASES: Record<string, PilotSpecialty> = {
  cardiology: "CARDIOLOGY",
  "general-surgery": "GENERAL_SURGERY",
  general_surgery: "GENERAL_SURGERY",
  "general surgery": "GENERAL_SURGERY",
  orthopedics: "ORTHOPEDICS",
  orthopaedics: "ORTHOPEDICS",
  anesthesia: "ANESTHESIA",
  anaesthesia: "ANESTHESIA",
  dama: "DAMA",
  "blood-transfusion": "BLOOD_TRANSFUSION",
  blood_transfusion: "BLOOD_TRANSFUSION",
  "blood transfusion": "BLOOD_TRANSFUSION",
};

/**
 * Normalize an arbitrary specialty string to a canonical pilot
 * specialty constant. Returns null on unknown / invalid input.
 */
export function normalizePilotSpecialty(
  specialty?: string | null,
): PilotSpecialty | null {
  try {
    if (specialty == null || typeof specialty !== "string") return null;
    const trimmed = specialty.trim();
    if (trimmed.length === 0) return null;
    const lower = trimmed.toLowerCase();

    if (SPECIALTY_ALIASES[lower]) return SPECIALTY_ALIASES[lower];

    const upper = trimmed.toUpperCase().replace(/[\s-]+/g, "_");
    if ((PILOT_ALLOWED_SPECIALTIES as readonly string[]).includes(upper)) {
      return upper as PilotSpecialty;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Returns true iff the specialty is on the static pilot allow-list.
 * Safe-fallback false.
 */
export function isPilotSpecialty(specialty?: string | null): boolean {
  return normalizePilotSpecialty(specialty) !== null;
}
