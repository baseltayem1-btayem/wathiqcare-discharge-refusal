export type AdminIdentity = {
  userType?: string | null;
  platformRole?: string | null;
  role?: string | null;
};

const ADMIN_ROLES = new Set([
  "tenant_admin",
  "tenant_owner",
  "platform_admin",
  "platform_superadmin",
  "legal_admin",
  "compliance",
]);

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function isAdministrator(identity: AdminIdentity): boolean {
  const userType = normalize(identity.userType);
  const platformRole = normalize(identity.platformRole);
  const role = normalize(identity.role);

  if (userType === "platform_admin") {
    return true;
  }

  return ADMIN_ROLES.has(platformRole) || ADMIN_ROLES.has(role);
}

export function toShortSha(sha: string | null | undefined): string {
  const normalized = (sha ?? "").trim();
  return normalized ? normalized.slice(0, 8) : "unknown";
}
