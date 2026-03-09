import { GovernanceArchiveStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/prisma";

export type IndexArchiveArgs = {
  tenantId: string;
  patientId?: string | null;
  caseId?: string | null;
  consentId?: string | null;
  roiRequestId?: string | null;
  formNumber?: string | null;
  formTitle?: string | null;
  documentCategory?: string | null;
  pdfAttachmentId?: string | null;
  legalDocumentFlag?: boolean;
  metadata?: Prisma.InputJsonValue;
};

export async function indexArchiveRecord(args: IndexArchiveArgs) {
  return prisma.archiveRecord.create({
    data: {
      tenantId: args.tenantId,
      patientId: args.patientId,
      caseId: args.caseId,
      consentId: args.consentId,
      roiRequestId: args.roiRequestId,
      formNumber: args.formNumber,
      formTitle: args.formTitle,
      documentCategory: args.documentCategory,
      pdfAttachmentId: args.pdfAttachmentId,
      archiveReferenceId: `ARC-${Date.now()}`,
      archiveStatus: GovernanceArchiveStatus.INDEXED,
      indexedAt: new Date(),
      legalDocumentFlag: args.legalDocumentFlag ?? false,
      metadata: args.metadata,
    },
  });
}
