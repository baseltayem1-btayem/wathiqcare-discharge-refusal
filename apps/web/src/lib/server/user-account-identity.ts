import crypto from "node:crypto";

const ROLE_SEGMENT_ALIAS: Record<string, string> = {
  tenant_admin: "admin",
  tenant_owner: "admin",
  legal_admin: "legal",
  medical_director: "meddirector",
  nursing: "nurse",
  doctor: "doctor",
  case_manager: "case.manager",
  finance_officer: "finance",
  platform_admin: "admin",
  platform_superadmin: "superadmin",
};

function sanitizeSegment(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.|\.$/g, "");
}

export function roleToUsernameSegment(role: string): string {
  const normalizedRole = sanitizeSegment(role.replace(/\s+/g, "_"));
  const roleSegment =
    ROLE_SEGMENT_ALIAS[normalizedRole] ?? normalizedRole;

  return roleSegment || "user";
}

export function buildAutoUsername(args: {
  tenantCode: string;
  branchCode?: string | null;
  role: string;
  sequence?: number | null;
}): string {
  const tenant = sanitizeSegment(args.tenantCode) || "tenant";
  const branch = sanitizeSegment(args.branchCode || "") || "hq";
  const roleSegment = roleToUsernameSegment(args.role);
  const sequence = args.sequence && args.sequence > 0 ? String(args.sequence) : "";
  return `${tenant}.${branch}.${roleSegment}${sequence}`;
}

export function generateTemporaryPassword(): string {
  // Mixed charset for policy compliance while avoiding ambiguous characters.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
  const bytes = crypto.randomBytes(14);
  let body = "";
  for (const b of bytes) {
    body += alphabet[b % alphabet.length];
  }
  return `Wtq!${body}`;
}
