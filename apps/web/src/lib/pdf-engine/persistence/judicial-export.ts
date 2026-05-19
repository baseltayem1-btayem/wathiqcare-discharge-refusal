import {
  calculateRetentionExpiry,
  determineRetentionClass,
  resolveLegalHoldStatus,
  type RetentionClass,
} from "@/lib/pdf-engine/persistence/retention-policy";
import type { ArchivedEvidenceRecord } from "@/lib/pdf-engine/persistence/evidence-archive";
import type { LegalEvidencePackage } from "@/lib/pdf-engine/runtime/legal-evidence-package";

export interface JudicialEvidenceExport {
  auditChain: LegalEvidencePackage["auditChain"];
  documentType: string;
  evidenceId: string;
  html: string;
  immutableSeal: LegalEvidencePackage["immutableSeal"];
  judicialExportReference: string;
  legalFooterReferences: {
    archiveReference: string | null;
    forensicVerificationReference: string | null;
    judicialExportReference: string;
    retentionClass: RetentionClass;
  };
  metadata: LegalEvidencePackage["metadata"];
  otpEvidence: LegalEvidencePackage["otpEvidence"];
  retention: {
    expiryAt: string | null;
    legalHold: ReturnType<typeof resolveLegalHoldStatus>;
    retentionClass: RetentionClass;
  };
  verificationPayload: string;
}

export interface BuildJudicialEvidenceExportInput {
  archivedEvidence?: ArchivedEvidenceRecord | null;
  forensicVerificationReference?: string | null;
  legalEvidencePackage: LegalEvidencePackage;
}

export function buildJudicialEvidenceExport(
  input: BuildJudicialEvidenceExportInput,
): JudicialEvidenceExport {
  const retentionClass = determineRetentionClass({
    documentType: input.legalEvidencePackage.metadata.sourceModule,
    moduleKey: input.legalEvidencePackage.metadata.sourceModule,
    medicoLegal: input.legalEvidencePackage.metadata.sourceModule.includes("legal"),
  });
  const legalHold = resolveLegalHoldStatus({ retentionClass });
  const judicialExportReference = `judicial-${input.legalEvidencePackage.evidenceId}`;

  return {
    auditChain: input.legalEvidencePackage.auditChain,
    documentType: input.legalEvidencePackage.metadata.sourceModule,
    evidenceId: input.legalEvidencePackage.evidenceId,
    html: input.legalEvidencePackage.html,
    immutableSeal: input.legalEvidencePackage.immutableSeal,
    judicialExportReference,
    legalFooterReferences: {
      archiveReference: input.archivedEvidence?.archiveId || null,
      forensicVerificationReference: input.forensicVerificationReference || null,
      judicialExportReference,
      retentionClass,
    },
    metadata: input.legalEvidencePackage.metadata,
    otpEvidence: input.legalEvidencePackage.otpEvidence,
    retention: {
      expiryAt: calculateRetentionExpiry(retentionClass, input.legalEvidencePackage.metadata.generatedAt, legalHold),
      legalHold,
      retentionClass,
    },
    verificationPayload: input.legalEvidencePackage.qrVerificationPayload,
  };
}