import type { LegalEvidencePackage } from "@/lib/pdf-engine/runtime/legal-evidence-package";
import type { VerificationPageModel } from "@/lib/pdf-engine/ui-models/verification-page-model";
import type { EvidenceTimelineModel } from "@/lib/pdf-engine/ui-models/evidence-timeline-model";

export interface LegalDisclosurePackage {
  auditTimeline: EvidenceTimelineModel;
  evidenceMetadata: {
    auditId: string | null;
    documentType: string;
    evidenceId: string;
    generatedAt: string;
  };
  immutableSeal: string;
  judicialExportReference: string | null;
  otpEvidence: LegalEvidencePackage["otpEvidence"];
  verificationResult: VerificationPageModel;
}

export function buildLegalDisclosurePackage(input: {
  judicialExportReference?: string | null;
  legalEvidencePackage: LegalEvidencePackage;
  timelineModel: EvidenceTimelineModel;
  verificationPageModel: VerificationPageModel;
}): LegalDisclosurePackage {
  return {
    auditTimeline: input.timelineModel,
    evidenceMetadata: {
      auditId: input.legalEvidencePackage.metadata.auditId,
      documentType: input.legalEvidencePackage.metadata.sourceModule,
      evidenceId: input.legalEvidencePackage.evidenceId,
      generatedAt: input.legalEvidencePackage.metadata.generatedAt,
    },
    immutableSeal: input.legalEvidencePackage.immutableSeal.fingerprint,
    judicialExportReference: input.judicialExportReference || null,
    otpEvidence: input.legalEvidencePackage.otpEvidence,
    verificationResult: input.verificationPageModel,
  };
}