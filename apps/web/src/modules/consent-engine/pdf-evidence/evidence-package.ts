/**
 * Legal Evidence PDF Pipeline — Evidence Package Builder
 *
 * Pure, deterministic. No I/O. No DB writes.
 */

import type {
  EvidencePackage,
} from "@/modules/consent-engine/pdf-evidence/evidence-types";
import {
  deriveEvidenceId,
} from "@/modules/consent-engine/pdf-evidence/evidence-hash";
import {
  buildVerificationUrl,
} from "@/modules/consent-engine/pdf-evidence/verification-url";
import {
  buildEvidenceQrPlaceholder,
} from "@/modules/consent-engine/pdf-evidence/qr-placeholder";

const LEGAL_FOOTER =
  "WathiqCare™ Evidence-Ready • Chain-of-Custody Protected — " +
  "جاهز كدليل قانوني — محمي بسلسلة الإسناد";

export interface BuildEvidencePackageInput {
  evidenceId?: string | null;
  templateId: string;
  templateVersion: string;
  templateHash: string;
  payloadHash: string;
  auditHash: string;
  patientMrn: string;
  encounterNo: string;
  caseNumber: string;
  generatedAt: string;
  generatedBy: string;
  verificationBaseUrl?: string;
}

export function buildEvidencePackage(
  input: BuildEvidencePackageInput,
): EvidencePackage {
  const evidenceId =
    input.evidenceId && input.evidenceId.length > 0
      ? input.evidenceId
      : deriveEvidenceId(
          input.templateHash,
          input.payloadHash,
          input.auditHash,
          input.generatedAt,
        );

  const verificationUrl = buildVerificationUrl(evidenceId, {
    baseUrl: input.verificationBaseUrl,
  });

  const qrPlaceholder = buildEvidenceQrPlaceholder({
    evidenceId,
    verificationUrl,
    auditHash: input.auditHash,
  });

  return {
    evidenceId,
    templateId: input.templateId,
    templateVersion: input.templateVersion,
    patientMrn: input.patientMrn,
    encounterNo: input.encounterNo,
    caseNumber: input.caseNumber,
    generatedAt: input.generatedAt,
    generatedBy: input.generatedBy,
    auditHash: input.auditHash,
    templateHash: input.templateHash,
    payloadHash: input.payloadHash,
    verificationUrl,
    qrPlaceholder,
    legalFooter: LEGAL_FOOTER,
  };
}
