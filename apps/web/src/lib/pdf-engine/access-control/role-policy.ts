export type EvidenceRole =
  | "legal-admin"
  | "compliance-officer"
  | "medical-director"
  | "risk-management"
  | "physician"
  | "auditor"
  | "investigator"
  | "read-only-reviewer";

export type EvidencePermission =
  | "view"
  | "export"
  | "verify"
  | "place-legal-hold"
  | "inspect-forensics"
  | "read-access-audit"
  | "manage-retention";

export type EvidenceScope = "department" | "enterprise" | "forensic" | "self" | "tenant";

export interface RolePrivilegeEvaluation {
  allowed: boolean;
  permissions: EvidencePermission[];
  reason: string;
  role: EvidenceRole;
  scope: EvidenceScope;
}

const ROLE_PERMISSION_MAP: Record<EvidenceRole, EvidencePermission[]> = {
  auditor: ["view", "verify", "inspect-forensics", "read-access-audit"],
  "compliance-officer": ["view", "verify", "export", "place-legal-hold", "manage-retention", "read-access-audit"],
  investigator: ["view", "verify", "inspect-forensics", "export", "read-access-audit"],
  "legal-admin": ["view", "verify", "export", "place-legal-hold", "inspect-forensics", "read-access-audit", "manage-retention"],
  "medical-director": ["view", "verify", "export", "manage-retention"],
  physician: ["view", "verify"],
  "read-only-reviewer": ["view"],
  "risk-management": ["view", "verify", "inspect-forensics", "manage-retention", "read-access-audit"],
};

const ROLE_SCOPE_MAP: Record<EvidenceRole, EvidenceScope> = {
  auditor: "forensic",
  "compliance-officer": "enterprise",
  investigator: "forensic",
  "legal-admin": "enterprise",
  "medical-director": "tenant",
  physician: "self",
  "read-only-reviewer": "department",
  "risk-management": "tenant",
};

export function resolveRolePermissions(role: EvidenceRole): EvidencePermission[] {
  return ROLE_PERMISSION_MAP[role];
}

export function resolveRoleScope(role: EvidenceRole): EvidenceScope {
  return ROLE_SCOPE_MAP[role];
}

export function evaluateRolePrivilege(input: {
  department?: string | null;
  legalPrivilege?: boolean;
  requestedPermission: EvidencePermission;
  role: EvidenceRole;
}): RolePrivilegeEvaluation {
  const permissions = resolveRolePermissions(input.role);
  const scope = resolveRoleScope(input.role);
  const requestedAllowed = permissions.includes(input.requestedPermission);
  const privilegedRole = input.role === "legal-admin" || input.role === "compliance-officer" || input.role === "investigator";
  const legalPrivilegeSatisfied =
    input.requestedPermission !== "place-legal-hold" && input.requestedPermission !== "export"
      ? true
      : privilegedRole || Boolean(input.legalPrivilege);

  return {
    allowed: requestedAllowed && legalPrivilegeSatisfied,
    permissions,
    reason: requestedAllowed
      ? legalPrivilegeSatisfied
        ? `Role ${input.role} can perform ${input.requestedPermission}.`
        : `Role ${input.role} requires legal privilege for ${input.requestedPermission}.`
      : `Role ${input.role} cannot perform ${input.requestedPermission}.`,
    role: input.role,
    scope,
  };
}