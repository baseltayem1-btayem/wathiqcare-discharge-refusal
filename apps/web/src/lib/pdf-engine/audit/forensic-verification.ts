import { createHash } from "node:crypto";

import { verifyArchivedEvidenceIntegrity, type ArchivedEvidenceRecord } from "@/lib/pdf-engine/persistence/evidence-archive";
import { verifySnapshotHash } from "@/lib/pdf-engine/persistence/snapshot-registry";
import { validateQrVerification } from "@/lib/pdf-engine/verification/qr-verification-service";
import { validateEvidencePackage } from "@/lib/pdf-engine/verification/verification-validator";
import { verifyDeterministicVerificationToken } from "@/lib/pdf-engine/evidence/verification-token";
import type { LegalEvidencePackage } from "@/lib/pdf-engine/runtime/legal-evidence-package";

export interface ForensicVerificationReport {
  archiveIntegrityValid: boolean;
  auditChainIntegrityValid: boolean;
  immutableSealValid: boolean;
  qrVerificationValid: boolean;
  reference: string;
  snapshotValid: boolean;
  tokenValid: boolean;
  valid: boolean;
}

export function performForensicVerification(input: {
  archivedEvidence?: ArchivedEvidenceRecord | null;
  legalEvidencePackage: LegalEvidencePackage;
  verificationToken?: string | null;
}): ForensicVerificationReport {
  const packageValidation = validateEvidencePackage(input.legalEvidencePackage);
  const archiveIntegrity = input.archivedEvidence
    ? verifyArchivedEvidenceIntegrity(input.archivedEvidence.archiveId)
    : { integrityValid: true };
  const snapshotVerification = verifySnapshotHash(
    input.legalEvidencePackage.evidenceId,
    input.legalEvidencePackage.snapshot.snapshotHash,
  );
  const tokenValid = input.verificationToken
    ? verifyDeterministicVerificationToken(
        {
          evidenceId: input.legalEvidencePackage.evidenceId,
          documentHash: input.legalEvidencePackage.evidenceHash,
          auditId: input.legalEvidencePackage.metadata.auditId,
        },
        input.verificationToken,
      )
    : true;
  const qrVerificationValid = validateQrVerification(
    input.legalEvidencePackage.qrVerificationPayload,
    input.legalEvidencePackage.evidenceId,
  );
  const reference = createHash("sha256")
    .update(
      [
        input.legalEvidencePackage.evidenceId,
        input.legalEvidencePackage.auditChain.currentChainHash,
        input.legalEvidencePackage.snapshot.snapshotHash,
      ].join("|"),
      "utf8",
    )
    .digest("hex")
    .slice(0, 20);

  return {
    archiveIntegrityValid: archiveIntegrity.integrityValid,
    auditChainIntegrityValid: packageValidation.auditChainIntegrityValid,
    immutableSealValid: packageValidation.immutableSealValid,
    qrVerificationValid,
    reference,
    snapshotValid: snapshotVerification.valid && packageValidation.snapshotValid,
    tokenValid,
    valid:
      archiveIntegrity.integrityValid &&
      packageValidation.auditChainIntegrityValid &&
      packageValidation.immutableSealValid &&
      snapshotVerification.valid &&
      packageValidation.snapshotValid &&
      tokenValid &&
      qrVerificationValid,
  };
}