import crypto from "node:crypto";
import type { DocumentType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import { buildSignatureEvidence } from "@/lib/server/platform/signature-evidence";
import type { GenerateDocumentInput, LegalEvidenceChain } from "@/lib/server/platform/types";

function mapTemplateToDocumentType(templateKey: GenerateDocumentInput["templateKey"]): DocumentType {
  if (templateKey === "refusal_of_discharge") {
    return "DISCHARGE_REFUSAL_FORM";
  }
  if (templateKey === "financial_liability_notice") {
    return "FINANCIAL_RESPONSIBILITY_NOTICE";
  }
  return "OTHER";
}

function hashPayload(payload: Prisma.InputJsonValue): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function buildPreviewHtml(input: GenerateDocumentInput): string {
  return [
    `<h1>${input.title}</h1>`,
    `<p><strong>Template:</strong> ${input.templateKey}</p>`,
    `<p><strong>Generated:</strong> ${new Date().toISOString()}</p>`,
    `<pre>${JSON.stringify(input.payload, null, 2)}</pre>`,
  ].join("\n");
}

export async function generateLegalDocument(input: GenerateDocumentInput) {
  const documentHash = hashPayload(input.payload);
  const signatureEvidence = buildSignatureEvidence({
    signatureRecord: input.signatureRecord,
    signatureMethod: input.signatureMethod,
    ipAddress: input.requestIp,
    deviceInfo: input.deviceInfo,
  });

  const legalEvidenceChain: LegalEvidenceChain = {
    document_hash: documentHash,
    audit_log: [
      {
        action: "document_created",
        at: new Date().toISOString(),
        actor_user_id: input.actorUserId,
      },
    ],
    signature_evidence: signatureEvidence,
  };

  const created = await prisma.document.create({
    data: {
      tenantId: input.tenantId,
      caseId: input.caseId,
      documentType: mapTemplateToDocumentType(input.templateKey),
      status: "SIGNED",
      documentCode: `DOC-${Date.now()}`,
      titleEn: input.title,
      titleAr: input.titleAr,
      templateKey: input.templateKey,
      fileName: `${input.templateKey}_${Date.now()}.pdf`,
      mimeType: "application/pdf",
      storagePath: `generated/${input.templateKey}/${Date.now()}.pdf`,
      previewHtml: buildPreviewHtml(input),
      payloadJson: input.payload,
      generatedByUserId: input.actorUserId,
      signedByUserId: input.actorUserId,
      signedAt: new Date(),
      metadata: {
        final_signed_pdf: true,
        legal_evidence_chain: legalEvidenceChain,
      },
    },
  });

  await writeAuditLog({
    tenantId: input.tenantId,
    userId: input.actorUserId,
    entityType: "document",
    entityId: created.id,
    action: "platform_document_generated",
    details: `${input.templateKey} document generated with signature evidence`,
    caseId: input.caseId,
    documentId: created.id,
    metadataJson: {
      template: input.templateKey,
      document_hash: documentHash,
      verification_method: input.signatureMethod,
    },
  });

  return {
    document: created,
    legalEvidenceChain,
  };
}
