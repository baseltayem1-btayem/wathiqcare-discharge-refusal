import {
  canExportEvidence,
  canInspectForensics,
  canPlaceLegalHold,
  canVerifyEvidence,
  canViewEvidence,
  type EvidencePermissionContext,
  type EvidenceSensitivity,
} from "@/lib/pdf-engine/access-control/evidence-permissions";
import { validateTenantIsolation } from "@/lib/pdf-engine/access-control/tenant-isolation";
import type { EvidenceRole } from "@/lib/pdf-engine/access-control/role-policy";

export type EvidenceAccessAction = "export" | "inspect-forensics" | "place-legal-hold" | "verify" | "view";

export interface EvidenceAccessContext extends EvidencePermissionContext {
  action: EvidenceAccessAction;
  actorId: string;
  actorTenantId: string | null;
  evidenceId: string;
  evidenceTenantId: string | null;
}

export interface EvidenceAccessResolution {
  allowed: boolean;
  context: EvidenceAccessContext;
  reason: string;
}

export function buildEvidenceAccessContext(input: {
  action: EvidenceAccessAction;
  actorId: string;
  actorTenantId?: string | null;
  department?: string | null;
  evidenceId: string;
  evidenceSensitivity?: EvidenceSensitivity;
  evidenceTenantId?: string | null;
  legalHoldState?: boolean;
  legalPrivilege?: boolean;
  role: EvidenceRole;
}): EvidenceAccessContext {
  const tenantIsolation = validateTenantIsolation({
    actorTenantId: input.actorTenantId,
    evidenceTenantId: input.evidenceTenantId,
    legalPrivilege: input.legalPrivilege,
    role: input.role,
  });

  return {
    action: input.action,
    actorId: input.actorId,
    actorTenantId: input.actorTenantId || null,
    department: input.department,
    evidenceId: input.evidenceId,
    evidenceSensitivity: input.evidenceSensitivity || "standard",
    evidenceTenantId: input.evidenceTenantId || null,
    legalHoldState: input.legalHoldState,
    legalPrivilege: input.legalPrivilege,
    role: input.role,
    tenantAccessValid: tenantIsolation.allowed,
  };
}

export function validateEvidenceAccess(context: EvidenceAccessContext): EvidenceAccessResolution {
  const tenantIsolation = validateTenantIsolation({
    actorTenantId: context.actorTenantId,
    evidenceTenantId: context.evidenceTenantId,
    legalPrivilege: context.legalPrivilege,
    role: context.role,
  });

  const allowed =
    context.action === "view"
      ? canViewEvidence(context)
      : context.action === "export"
        ? canExportEvidence(context)
        : context.action === "verify"
          ? canVerifyEvidence(context)
          : context.action === "place-legal-hold"
            ? canPlaceLegalHold(context)
            : canInspectForensics(context);

  return {
    allowed,
    context,
    reason: allowed ? "Evidence access granted." : tenantIsolation.allowed ? "Evidence permission denied." : tenantIsolation.reason,
  };
}

export function resolveEvidenceAccess(input: {
  action: EvidenceAccessAction;
  actorId: string;
  actorTenantId?: string | null;
  department?: string | null;
  evidenceId: string;
  evidenceSensitivity?: EvidenceSensitivity;
  evidenceTenantId?: string | null;
  legalHoldState?: boolean;
  legalPrivilege?: boolean;
  role: EvidenceRole;
}): EvidenceAccessResolution {
  return validateEvidenceAccess(buildEvidenceAccessContext(input));
}