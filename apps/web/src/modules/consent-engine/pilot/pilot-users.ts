/**
 * Pilot Physician Allow-List (STATIC ONLY)
 *
 * No DB. No external service. No Prisma model. No migration.
 *
 * Optional additive env override:
 *   DYNAMIC_CONSENT_PILOT_USERS="a@x.com,b@y.com"
 *
 * The env override is additive only — the static default allow-list
 * is always honored. Malformed values are ignored silently. No full
 * email list is ever logged.
 */

const PILOT_ALLOWED_USERS: readonly string[] = [
  "dr.ahmed@wathiqcare.med.sa",
  "pilot.cardiology@imc.med.sa",
];

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function safeReadEnvAllowList(): string[] {
  try {
    const raw = process.env.DYNAMIC_CONSENT_PILOT_USERS;
    if (!raw || typeof raw !== "string") return [];
    return raw
      .split(",")
      .map((entry) => normalizeEmail(entry))
      .filter((entry) => entry.length > 0 && entry.includes("@"));
  } catch {
    return [];
  }
}

/**
 * Returns the merged allow-list (static + env override). Safe to
 * call repeatedly; reads env each time so test overrides take effect.
 */
export function getPilotAllowList(): string[] {
  const base = PILOT_ALLOWED_USERS.map((entry) => normalizeEmail(entry));
  const env = safeReadEnvAllowList();
  const merged = new Set<string>([...base, ...env]);
  return Array.from(merged);
}

/**
 * Case-insensitive, trim-tolerant membership check. Safe-fallback
 * false for null / undefined / non-strings / malformed values.
 */
export function isPilotUser(email?: string | null): boolean {
  try {
    if (email == null) return false;
    if (typeof email !== "string") return false;
    const normalized = normalizeEmail(email);
    if (normalized.length === 0) return false;
    if (!normalized.includes("@")) return false;
    return getPilotAllowList().includes(normalized);
  } catch {
    return false;
  }
}

/**
 * Returns a masked form of an email suitable for display in audit
 * previews:  `dr.ahmed@wathiqcare.med.sa` -> `dr***@wathiqcare.med.sa`.
 * Returns "" for invalid input.
 */
export function maskPilotEmail(email?: string | null): string {
  try {
    if (email == null || typeof email !== "string") return "";
    const normalized = email.trim();
    if (normalized.length === 0) return "";
    const atIndex = normalized.indexOf("@");
    if (atIndex <= 0) return "***";
    const local = normalized.slice(0, atIndex);
    const domain = normalized.slice(atIndex);
    const head = local.slice(0, Math.min(2, local.length));
    return `${head}***${domain}`;
  } catch {
    return "";
  }
}
