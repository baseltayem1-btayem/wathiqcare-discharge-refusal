import { generateImmutableEvidenceSeal } from "@/lib/pdf-engine/runtime/immutable-evidence";
import type { ArchivedEvidenceRecord } from "@/lib/pdf-engine/persistence/evidence-archive";

export interface ArchiveIntegrityResult {
  archiveId: string;
  evidenceId: string;
  integrityValid: boolean;
  immutableSealValid: boolean;
  matchingHashes: boolean;
}

export function compareEvidenceHashes(left: string | null | undefined, right: string | null | undefined): boolean {
  return Boolean(left && right && left === right);
}

export function validateImmutableSeal(record: ArchivedEvidenceRecord): boolean {
  const expectedSeal = generateImmutableEvidenceSeal({
    sha256Hash: record.legalEvidencePackage.evidenceHash,
    timestamp: record.legalEvidencePackage.immutableSeal.sealedAt,
    evidenceId: record.legalEvidencePackage.evidenceId,
    signerReference: record.legalEvidencePackage.signerDetails.signerReference,
  });

  return expectedSeal.fingerprint === record.legalEvidencePackage.immutableSeal.fingerprint;
}

export function verifyArchiveIntegrity(record: ArchivedEvidenceRecord): ArchiveIntegrityResult {
  const matchingHashes = compareEvidenceHashes(
    record.legalEvidencePackage.evidenceHash,
    record.legalEvidencePackage.snapshot.evidenceHash,
  );
  const immutableSealValid = validateImmutableSeal(record);

  return {
    archiveId: record.archiveId,
    evidenceId: record.evidenceId,
    integrityValid: matchingHashes && immutableSealValid,
    immutableSealValid,
    matchingHashes,
  };
}