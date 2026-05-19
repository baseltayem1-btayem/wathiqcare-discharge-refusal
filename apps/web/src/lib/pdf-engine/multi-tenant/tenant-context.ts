import { resolveTenantRegistration } from "@/lib/pdf-engine/multi-tenant/tenant-registry";
import type { EvidenceRole } from "@/lib/pdf-engine/access-control/role-policy";

export interface TenantContext {
  actorId: string;
  legalPrivilege: boolean;
  role: EvidenceRole;
  tenantDisplayName: string | null;
  tenantId: string;
}

export function resolveTenantContext(input: {
  actorId: string;
  legalPrivilege?: boolean;
  role: EvidenceRole;
  tenantId: string;
}): TenantContext {
  const registration = resolveTenantRegistration(input.tenantId);

  return {
    actorId: input.actorId,
    legalPrivilege: Boolean(input.legalPrivilege),
    role: input.role,
    tenantDisplayName: registration?.displayName || null,
    tenantId: input.tenantId,
  };
}