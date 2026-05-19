import { createHash } from "node:crypto";

import { indexEvidenceRecord } from "@/lib/pdf-engine/persistence/evidence-index";
import { registerSnapshot } from "@/lib/pdf-engine/persistence/snapshot-registry";
import { verifyArchiveIntegrity } from "@/lib/pdf-engine/persistence/archive-integrity";
import type { LegalEvidencePackage } from "@/lib/pdf-engine/runtime/legal-evidence-package";

export interface ArchivedEvidenceRecord {
  archiveId: string;
  archivedAt: string;
  evidenceId: string;
  legalEvidencePackage: LegalEvidencePackage;
  snapshotRegistrySequence: number;
}

export interface ArchivedEvidenceIntegrityVerification {
  archiveId: string | null;
  archived: boolean;
  evidenceId: string;
  integrityValid: boolean;
}

const archiveById = new Map<string, ArchivedEvidenceRecord>();
const archiveIdByEvidenceId = new Map<string, string>();

function buildArchiveId(evidencePackage: LegalEvidencePackage): string {
  return createHash("sha256")
    .update([evidencePackage.evidenceId, evidencePackage.snapshot.snapshotHash, evidencePackage.immutableSeal.fingerprint].join("|"), "utf8")
    .digest("hex")
    .slice(0, 24);
}

export function archiveEvidencePackage(legalEvidencePackage: LegalEvidencePackage): ArchivedEvidenceRecord {
  const snapshotRecord = registerSnapshot(legalEvidencePackage.snapshot);
  const archiveId = buildArchiveId(legalEvidencePackage);
  const archivedRecord: ArchivedEvidenceRecord = {
    archiveId,
    archivedAt: new Date().toISOString(),
    evidenceId: legalEvidencePackage.evidenceId,
    legalEvidencePackage,
    snapshotRegistrySequence: snapshotRecord.sequenceNumber,
  };

  archiveById.set(archiveId, archivedRecord);
  archiveIdByEvidenceId.set(legalEvidencePackage.evidenceId, archiveId);
  indexEvidenceRecord({
    auditId: legalEvidencePackage.metadata.auditId,
    documentType: legalEvidencePackage.metadata.sourceModule,
    evidenceId: legalEvidencePackage.evidenceId,
    generatedDate: legalEvidencePackage.metadata.generatedAt,
    patientMrn: legalEvidencePackage.signerDetails.signerReference,
    signer: legalEvidencePackage.signerDetails.signerName || legalEvidencePackage.signerDetails.signerReference,
  });
  return archivedRecord;
}

export function retrieveArchivedEvidence(identifier: string): ArchivedEvidenceRecord | null {
  const archiveId = archiveById.has(identifier) ? identifier : archiveIdByEvidenceId.get(identifier);
  if (!archiveId) {
    return null;
  }

  return archiveById.get(archiveId) || null;
}

export function listArchivedEvidence(): ArchivedEvidenceRecord[] {
  return Array.from(archiveById.values()).sort(
    (left, right) => left.archivedAt.localeCompare(right.archivedAt) || left.evidenceId.localeCompare(right.evidenceId),
  );
}

export function verifyArchivedEvidenceIntegrity(identifier: string): ArchivedEvidenceIntegrityVerification {
  const archivedRecord = retrieveArchivedEvidence(identifier);

  if (!archivedRecord) {
    return {
      archiveId: null,
      archived: false,
      evidenceId: identifier,
      integrityValid: false,
    };
  }

  const integrity = verifyArchiveIntegrity(archivedRecord);

  return {
    archiveId: archivedRecord.archiveId,
    archived: true,
    evidenceId: archivedRecord.evidenceId,
    integrityValid: integrity.integrityValid,
  };
}