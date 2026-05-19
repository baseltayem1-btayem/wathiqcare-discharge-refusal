import { performForensicVerification } from "@/lib/pdf-engine/audit/forensic-verification";
import { resolveEvidenceAccess, type EvidenceAccessAction } from "@/lib/pdf-engine/access-control/evidence-access";
import type { EvidenceRole } from "@/lib/pdf-engine/access-control/role-policy";
import { resolveEvidenceLifecycleState, type EvidenceLifecycleState } from "@/lib/pdf-engine/management/evidence-lifecycle";
import { buildRetentionDashboard } from "@/lib/pdf-engine/operations/retention-dashboard";
import { searchEvidence, type EvidenceSearchQuery, type EvidenceSearchResult } from "@/lib/pdf-engine/operations/evidence-search";
import { listArchivedEvidence, type ArchivedEvidenceRecord } from "@/lib/pdf-engine/persistence/evidence-archive";
import { resolveTenantEvidencePartition } from "@/lib/pdf-engine/multi-tenant/tenant-evidence-partition";

export interface EnterpriseSearchQuery extends EvidenceSearchQuery {
  action?: EvidenceAccessAction;
  actorId?: string;
  actorTenantId?: string | null;
  department?: string | null;
  evidenceSensitivity?: "forensic" | "restricted" | "sealed" | "standard";
  forensicStatus?: "invalid" | "valid";
  legalPrivilege?: boolean;
  lifecycleState?: EvidenceLifecycleState;
  retentionStatus?: "active" | "expired" | "expiring" | "legal-hold";
  role?: EvidenceRole;
  tenantId?: string | null;
}

export interface EnterpriseSearchResult extends EvidenceSearchResult {
  integrityStatus: "invalid" | "valid";
  lifecycleState: EvidenceLifecycleState;
  retentionStatus: "active" | "expired" | "expiring" | "legal-hold";
  tenantId: string | null;
}

function resolveRetentionStatus(record: ArchivedEvidenceRecord): EnterpriseSearchResult["retentionStatus"] {
  const item = buildRetentionDashboard([record])[0];
  if (!item) {
    return "active";
  }
  if (item.legalHoldStatus === "legal-hold") {
    return "legal-hold";
  }
  if (item.daysRemaining != null && item.daysRemaining < 0) {
    return "expired";
  }
  if (item.daysRemaining != null && item.daysRemaining <= 90) {
    return "expiring";
  }
  return "active";
}

export function searchEnterpriseEvidence(
  query: EnterpriseSearchQuery,
  records: ArchivedEvidenceRecord[] = listArchivedEvidence(),
): EnterpriseSearchResult[] {
  const baseResults = searchEvidence(query, records);

  return baseResults
    .map((result) => {
      const record = records.find((candidate) => candidate.evidenceId === result.evidenceId);
      if (!record) {
        return null;
      }

      const partition = resolveTenantEvidencePartition(record.evidenceId);
      const integrityStatus = performForensicVerification({
        archivedEvidence: record,
        legalEvidencePackage: record.legalEvidencePackage,
      }).valid
        ? "valid"
        : "invalid";
      const lifecycleState = resolveEvidenceLifecycleState({
        archivedEvidence: record,
        legalEvidencePackage: record.legalEvidencePackage,
        legalHoldState: resolveRetentionStatus(record) === "legal-hold",
      });
      const retentionStatus = resolveRetentionStatus(record);
      const accessEvaluation = query.role && query.actorId
        ? resolveEvidenceAccess({
            action: query.action || "view",
            actorId: query.actorId,
            actorTenantId: query.actorTenantId,
            department: query.department,
            evidenceId: record.evidenceId,
            evidenceSensitivity: query.evidenceSensitivity || partition?.sensitivity,
            evidenceTenantId: partition?.tenantId,
            legalPrivilege: query.legalPrivilege,
            role: query.role,
          })
        : { allowed: true };

      return {
        ...result,
        integrityStatus,
        lifecycleState,
        retentionStatus,
        tenantId: partition?.tenantId || null,
        visible: accessEvaluation.allowed,
      };
    })
    .filter((result): result is EnterpriseSearchResult & { visible: boolean } => Boolean(result))
    .filter((result) => result.visible)
    .filter((result) => (query.tenantId ? result.tenantId === query.tenantId : true))
    .filter((result) => (query.forensicStatus ? result.integrityStatus === query.forensicStatus : true))
    .filter((result) => (query.lifecycleState ? result.lifecycleState === query.lifecycleState : true))
    .filter((result) => (query.retentionStatus ? result.retentionStatus === query.retentionStatus : true))
    .map(({ visible: _visible, ...result }) => result);
}