import { evaluateRolePrivilege, type EvidenceRole } from "@/lib/pdf-engine/access-control/role-policy";

export type EvidenceSensitivity = "forensic" | "restricted" | "sealed" | "standard";

export interface EvidencePermissionContext {
  department?: string | null;
  evidenceSensitivity?: EvidenceSensitivity;
  legalHoldState?: boolean;
  legalPrivilege?: boolean;
  role: EvidenceRole;
  tenantAccessValid?: boolean;
}

function sensitivityBlocksView(input: EvidencePermissionContext): boolean {
  if (!input.evidenceSensitivity || input.evidenceSensitivity === "standard") {
    return false;
  }

  if (input.evidenceSensitivity === "restricted") {
    return input.role === "read-only-reviewer";
  }

  if (input.evidenceSensitivity === "sealed") {
    return !(input.legalPrivilege || input.role === "legal-admin");
  }

  return !["legal-admin", "auditor", "investigator", "risk-management"].includes(input.role);
}

export function canViewEvidence(input: EvidencePermissionContext): boolean {
  const privilege = evaluateRolePrivilege({
    department: input.department,
    legalPrivilege: input.legalPrivilege,
    requestedPermission: "view",
    role: input.role,
  });
  return privilege.allowed && input.tenantAccessValid !== false && !sensitivityBlocksView(input);
}

export function canExportEvidence(input: EvidencePermissionContext): boolean {
  const privilege = evaluateRolePrivilege({
    department: input.department,
    legalPrivilege: input.legalPrivilege,
    requestedPermission: "export",
    role: input.role,
  });
  return privilege.allowed && canViewEvidence(input) && input.evidenceSensitivity !== "forensic";
}

export function canVerifyEvidence(input: EvidencePermissionContext): boolean {
  return evaluateRolePrivilege({
    department: input.department,
    legalPrivilege: input.legalPrivilege,
    requestedPermission: "verify",
    role: input.role,
  }).allowed && input.tenantAccessValid !== false;
}

export function canPlaceLegalHold(input: EvidencePermissionContext): boolean {
  const privilege = evaluateRolePrivilege({
    department: input.department,
    legalPrivilege: input.legalPrivilege,
    requestedPermission: "place-legal-hold",
    role: input.role,
  });
  return privilege.allowed && input.tenantAccessValid !== false && input.legalHoldState !== true;
}

export function canInspectForensics(input: EvidencePermissionContext): boolean {
  const privilege = evaluateRolePrivilege({
    department: input.department,
    legalPrivilege: input.legalPrivilege,
    requestedPermission: "inspect-forensics",
    role: input.role,
  });
  return privilege.allowed && input.tenantAccessValid !== false;
}