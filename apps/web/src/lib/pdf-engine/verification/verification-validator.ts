import { createHash } from "node:crypto";

import { generateAuditChainHash } from "@/lib/pdf-engine/runtime/forensic-audit-chain";
import { generateImmutableEvidenceSeal } from "@/lib/pdf-engine/runtime/immutable-evidence";
import type { LegalEvidencePackage } from "@/lib/pdf-engine/runtime/legal-evidence-package";

export interface EvidencePackageValidationResult {
  auditChainIntegrityValid: boolean;
  evidenceHashValid: boolean;
  immutableSealValid: boolean;
  otpEvidencePresent: boolean;
  snapshotValid: boolean;
  valid: boolean;
}

export function validateEvidencePackage(
  legalEvidencePackage: LegalEvidencePackage,
): EvidencePackageValidationResult {
  const expectedSeal = generateImmutableEvidenceSeal({
    sha256Hash: legalEvidencePackage.evidenceHash,
    timestamp: legalEvidencePackage.immutableSeal.sealedAt,
    evidenceId: legalEvidencePackage.evidenceId,
    signerReference: legalEvidencePackage.signerDetails.signerReference,
  });
  const { currentChainHash, ...chainPayload } = legalEvidencePackage.auditChain;
  const recalculatedSnapshotHash = createHash("sha256")
    .update(legalEvidencePackage.snapshot.serializedSnapshot, "utf8")
    .digest("hex");

  const immutableSealValid = expectedSeal.fingerprint === legalEvidencePackage.immutableSeal.fingerprint;
  const auditChainIntegrityValid = generateAuditChainHash(chainPayload) === currentChainHash;
  const snapshotValid = recalculatedSnapshotHash === legalEvidencePackage.snapshot.snapshotHash;
  const evidenceHashValid = legalEvidencePackage.evidenceHash === legalEvidencePackage.snapshot.evidenceHash;
  const otpEvidencePresent = Boolean(legalEvidencePackage.otpEvidence);

  return {
    auditChainIntegrityValid,
    evidenceHashValid,
    immutableSealValid,
    otpEvidencePresent,
    snapshotValid,
    valid: immutableSealValid && auditChainIntegrityValid && snapshotValid && evidenceHashValid && otpEvidencePresent,
  };
}