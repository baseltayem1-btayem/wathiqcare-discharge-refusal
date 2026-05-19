import type { LegalEvidencePackage } from "@/lib/pdf-engine/runtime/legal-evidence-package";
import type { EvidencePackageValidationResult } from "@/lib/pdf-engine/verification/verification-validator";

export interface VerificationPresentationModel {
  documentType: string;
  evidenceId: string;
  evidenceStatus: string;
  generatedDate: string;
  integrityStatus: string;
  qrVerificationResult: string;
  signer: string;
  verified: boolean;
}

export function buildVerificationPresentation(
  legalEvidencePackage: LegalEvidencePackage,
  validation: EvidencePackageValidationResult,
): VerificationPresentationModel {
  return {
    documentType: legalEvidencePackage.metadata.sourceModule,
    evidenceId: legalEvidencePackage.evidenceId,
    evidenceStatus: legalEvidencePackage.verificationRecord ? "registered" : "unregistered",
    generatedDate: legalEvidencePackage.metadata.generatedAt,
    integrityStatus: validation.valid ? "verified" : "integrity-check-failed",
    qrVerificationResult: legalEvidencePackage.qrVerificationPayload,
    signer: legalEvidencePackage.signerDetails.signerName || legalEvidencePackage.signerDetails.signerReference,
    verified: validation.valid,
  };
}