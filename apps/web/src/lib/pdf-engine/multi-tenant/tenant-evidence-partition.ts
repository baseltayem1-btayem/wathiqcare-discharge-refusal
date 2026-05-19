import { listArchivedEvidence, type ArchivedEvidenceRecord } from "@/lib/pdf-engine/persistence/evidence-archive";
import type { EvidenceSensitivity } from "@/lib/pdf-engine/access-control/evidence-permissions";

export interface TenantEvidencePartition {
  evidenceId: string;
  partitionKey: string;
  sensitivity: EvidenceSensitivity;
  tenantId: string;
}

const partitionRegistry = new Map<string, TenantEvidencePartition>();

export function registerTenantEvidencePartition(input: {
  evidenceId: string;
  sensitivity?: EvidenceSensitivity;
  tenantId: string;
}): TenantEvidencePartition {
  const partition: TenantEvidencePartition = {
    evidenceId: input.evidenceId,
    partitionKey: `${input.tenantId}:${input.evidenceId}`,
    sensitivity: input.sensitivity || "standard",
    tenantId: input.tenantId,
  };

  partitionRegistry.set(input.evidenceId, partition);
  return partition;
}

export function resolveTenantEvidencePartition(evidenceId: string): TenantEvidencePartition | null {
  return partitionRegistry.get(evidenceId) || null;
}

export function retrieveTenantScopedEvidence(
  tenantId: string,
  records: ArchivedEvidenceRecord[] = listArchivedEvidence(),
): ArchivedEvidenceRecord[] {
  return records.filter((record) => resolveTenantEvidencePartition(record.evidenceId)?.tenantId === tenantId);
}