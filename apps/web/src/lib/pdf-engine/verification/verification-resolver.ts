import { verifyDeterministicVerificationToken } from "@/lib/pdf-engine/evidence/verification-token";
import { listArchivedEvidence, retrieveArchivedEvidence, type ArchivedEvidenceRecord } from "@/lib/pdf-engine/persistence/evidence-archive";

export interface VerificationResolutionRequest {
  evidenceId: string;
  verificationToken?: string | null;
}

export interface VerificationResolutionResult {
  archived: boolean;
  evidenceId: string;
  evidencePackage: ArchivedEvidenceRecord | null;
  verificationUrl: string | null;
  verificationTokenValid: boolean;
}

export function resolveVerificationRequest(
  input: VerificationResolutionRequest,
): VerificationResolutionResult {
  const archived = retrieveArchivedEvidence(input.evidenceId);
  const verificationTokenValid = Boolean(
    archived &&
      input.verificationToken &&
      verifyDeterministicVerificationToken(
        {
          evidenceId: archived.evidenceId,
          documentHash: archived.legalEvidencePackage.evidenceHash,
          auditId: archived.legalEvidencePackage.metadata.auditId,
        },
        input.verificationToken,
      ),
  );

  return {
    archived: Boolean(archived),
    evidenceId: input.evidenceId,
    evidencePackage: archived,
    verificationUrl: archived?.legalEvidencePackage.verificationRecord.verificationUrl || null,
    verificationTokenValid,
  };
}

export function resolveEvidenceByVerificationToken(verificationToken: string): ArchivedEvidenceRecord | null {
  return (
    listArchivedEvidence().find((archived) =>
      verifyDeterministicVerificationToken(
        {
          evidenceId: archived.evidenceId,
          documentHash: archived.legalEvidencePackage.evidenceHash,
          auditId: archived.legalEvidencePackage.metadata.auditId,
        },
        verificationToken,
      ),
    ) || null
  );
}