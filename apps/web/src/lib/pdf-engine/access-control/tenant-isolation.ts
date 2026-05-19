import { evaluateRolePrivilege, type EvidenceRole } from "@/lib/pdf-engine/access-control/role-policy";

export interface TenantBoundary {
  actorTenantId: string | null;
  crossTenantRequested: boolean;
  evidenceTenantId: string | null;
  sameTenant: boolean;
}

export interface TenantIsolationResult {
  allowed: boolean;
  boundary: TenantBoundary;
  reason: string;
}

export function resolveTenantBoundary(input: {
  actorTenantId?: string | null;
  evidenceTenantId?: string | null;
}): TenantBoundary {
  const actorTenantId = input.actorTenantId || null;
  const evidenceTenantId = input.evidenceTenantId || null;

  return {
    actorTenantId,
    crossTenantRequested: Boolean(actorTenantId && evidenceTenantId && actorTenantId !== evidenceTenantId),
    evidenceTenantId,
    sameTenant: actorTenantId !== null && actorTenantId === evidenceTenantId,
  };
}

export function verifyCrossTenantAccess(input: {
  actorTenantId?: string | null;
  evidenceTenantId?: string | null;
  legalPrivilege?: boolean;
  role: EvidenceRole;
}): TenantIsolationResult {
  const boundary = resolveTenantBoundary(input);
  if (!boundary.crossTenantRequested) {
    return {
      allowed: true,
      boundary,
      reason: "Tenant boundary validated within the same tenant.",
    };
  }

  const privilege = evaluateRolePrivilege({
    legalPrivilege: input.legalPrivilege,
    requestedPermission: "view",
    role: input.role,
  });
  const privilegedCrossTenantRole = input.role === "legal-admin" || input.role === "compliance-officer" || input.role === "investigator";
  const allowed = privilegedCrossTenantRole && privilege.allowed && Boolean(input.legalPrivilege);

  return {
    allowed,
    boundary,
    reason: allowed
      ? "Cross-tenant access allowed under privileged legal review placeholder."
      : "Cross-tenant evidence access is blocked by tenant isolation policy.",
  };
}

export function validateTenantIsolation(input: {
  actorTenantId?: string | null;
  evidenceTenantId?: string | null;
  legalPrivilege?: boolean;
  role: EvidenceRole;
}): TenantIsolationResult {
  return verifyCrossTenantAccess(input);
}