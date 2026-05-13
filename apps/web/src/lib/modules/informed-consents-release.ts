export const INFORMED_CONSENTS_ROLE_ACCESS_CONFIG = [
  { key: "doctor", label: "Doctor", canonicalRole: "doctor", aliases: ["doctor"] },
  { key: "nurse", label: "Nurse", canonicalRole: "nursing", aliases: ["nursing", "nurse"] },
  { key: "legal-affairs", label: "Legal Affairs", canonicalRole: "legal_admin", aliases: ["legal_admin", "legal_affairs", "legal_officer"] },
  { key: "admin", label: "Admin", canonicalRole: "tenant_admin", aliases: ["tenant_admin", "tenant_owner", "admin"] },
  { key: "compliance-officer", label: "Compliance Officer", canonicalRole: "compliance", aliases: ["compliance", "compliance_officer"] },
  { key: "quality", label: "Quality", canonicalRole: "quality", aliases: ["quality", "quality_manager", "quality_lead"] },
  { key: "medical-director", label: "Medical Director", canonicalRole: "medical_director", aliases: ["medical_director"] },
  { key: "patient-relations", label: "Patient Relations", canonicalRole: "patient_affairs", aliases: ["patient_affairs", "patient_relations"] },
  { key: "external-reviewer", label: "External Reviewer", canonicalRole: "external_reviewer", aliases: ["external_reviewer"] },
  { key: "read-only-auditor", label: "Read-Only Auditor", canonicalRole: "read_only_auditor", aliases: ["read_only_auditor"] },
] as const;

export const INFORMED_CONSENTS_ALLOWED_ROLES = Array.from(
  new Set(INFORMED_CONSENTS_ROLE_ACCESS_CONFIG.map((item) => item.canonicalRole)),
);

export const INFORMED_CONSENTS_ALLOWED_ROLE_ALIASES = Array.from(
  new Set(INFORMED_CONSENTS_ROLE_ACCESS_CONFIG.flatMap((item) => item.aliases)),
);

function normalizeFlag(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function isInformedConsentsEnabled(): boolean {
  return normalizeFlag(process.env.ENABLE_INFORMED_CONSENTS, false);
}
