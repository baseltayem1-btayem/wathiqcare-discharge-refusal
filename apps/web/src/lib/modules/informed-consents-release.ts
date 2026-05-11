export const INFORMED_CONSENTS_ROLE_ACCESS_CONFIG = [
  { key: "doctor", label: "Doctor", canonicalRole: "doctor" },
  { key: "nurse", label: "Nurse", canonicalRole: "nursing" },
  { key: "legal-affairs", label: "Legal Affairs", canonicalRole: "legal_admin" },
  { key: "admin", label: "Admin", canonicalRole: "tenant_admin" },
  { key: "compliance-officer", label: "Compliance Officer", canonicalRole: "compliance" },
] as const;

export const INFORMED_CONSENTS_ALLOWED_ROLES = INFORMED_CONSENTS_ROLE_ACCESS_CONFIG.map(
  (item) => item.canonicalRole,
);

function normalizeFlag(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function isInformedConsentsEnabled(): boolean {
  return normalizeFlag(process.env.ENABLE_INFORMED_CONSENTS, true);
}
