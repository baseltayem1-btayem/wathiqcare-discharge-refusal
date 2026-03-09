import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/prisma";

const governanceDb = prisma as unknown as {
  archiveRecord: {
    create: (args: {
      data: {
        tenantId: string;
        patientId?: string | null;
        caseId?: string | null;
        consentId?: string | null;
        roiRequestId?: string | null;
        formNumber?: string | null;
        formTitle?: string | null;
        documentCategory?: string | null;
        pdfAttachmentId?: string | null;
        archiveReferenceId: string;
        archiveStatus: string;
        indexedAt: Date;
        legalDocumentFlag: boolean;
        metadata?: Prisma.InputJsonValue;
      };
    }) => Promise<unknown>;
  };
};

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

export type IndexedArchiveRecord = {
  id: string;
  archiveReferenceId: string | null;
  archiveStatus: string;
};

export async function indexArchiveRecord(args: IndexArchiveArgs): Promise<IndexedArchiveRecord> {
  return governanceDb.archiveRecord.create({
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
      archiveStatus: "INDEXED",
      indexedAt: new Date(),
      legalDocumentFlag: args.legalDocumentFlag ?? false,
      metadata: args.metadata,
    },
  }) as Promise<IndexedArchiveRecord>;
}
