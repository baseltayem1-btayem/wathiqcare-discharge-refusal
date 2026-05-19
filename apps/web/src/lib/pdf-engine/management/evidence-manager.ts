import { performForensicVerification } from "@/lib/pdf-engine/audit/forensic-verification";
import { resolveEvidenceLifecycleState } from "@/lib/pdf-engine/management/evidence-lifecycle";
import { resolveLegalHoldStatus } from "@/lib/pdf-engine/management/legal-hold-manager";
import {
  archiveEvidencePackage,
  retrieveArchivedEvidence,
  type ArchivedEvidenceRecord,
} from "@/lib/pdf-engine/persistence/evidence-archive";
import type { LegalEvidencePackage } from "@/lib/pdf-engine/runtime/legal-evidence-package";
import { registerTenantEvidencePartition, resolveTenantEvidencePartition } from "@/lib/pdf-engine/multi-tenant/tenant-evidence-partition";

export interface EvidenceSummary {
  archiveId: string | null;
  evidenceId: string;
  lifecycleState: ReturnType<typeof resolveEvidenceLifecycleState>;
  signer: string;
  tenantPartitionKey: string | null;
  verificationValid: boolean;
}

export function registerEvidence(input: {
  legalEvidencePackage: LegalEvidencePackage;
  sensitivity?: "forensic" | "restricted" | "sealed" | "standard";
  tenantId: string;
}): { archivedEvidence: ArchivedEvidenceRecord; tenantPartition: ReturnType<typeof registerTenantEvidencePartition> } {
  const archivedEvidence = archiveEvidencePackage(input.legalEvidencePackage);
  const tenantPartition = registerTenantEvidencePartition({
    evidenceId: archivedEvidence.evidenceId,
    sensitivity: input.sensitivity,
    tenantId: input.tenantId,
  });

  return { archivedEvidence, tenantPartition };
}

export function archiveEvidence(legalEvidencePackage: LegalEvidencePackage): ArchivedEvidenceRecord {
  return archiveEvidencePackage(legalEvidencePackage);
}

export function verifyEvidence(input: {
  archivedEvidence?: ArchivedEvidenceRecord | null;
  legalEvidencePackage: LegalEvidencePackage;
  verificationToken?: string | null;
}) {
  return performForensicVerification(input);
}

export function retrieveEvidence(identifier: string): ArchivedEvidenceRecord | null {
  return retrieveArchivedEvidence(identifier);
}

export function buildEvidenceSummary(record: ArchivedEvidenceRecord): EvidenceSummary {
  const verification = verifyEvidence({ archivedEvidence: record, legalEvidencePackage: record.legalEvidencePackage });
  const legalHold = resolveLegalHoldStatus({ evidenceId: record.evidenceId });
  const partition = resolveTenantEvidencePartition(record.evidenceId);

  return {
    archiveId: record.archiveId,
    evidenceId: record.evidenceId,
    lifecycleState: resolveEvidenceLifecycleState({
      archivedEvidence: record,
      legalEvidencePackage: record.legalEvidencePackage,
      legalHoldState: legalHold.isOnLegalHold,
    }),
    signer: record.legalEvidencePackage.signerDetails.signerName || record.legalEvidencePackage.signerDetails.signerReference,
    tenantPartitionKey: partition?.partitionKey || null,
    verificationValid: verification.valid,
  };
}