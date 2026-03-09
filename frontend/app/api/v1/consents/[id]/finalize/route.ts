import {
  ConsentLifecycleStatus,
  GovernanceArchiveStatus,
  SignatureProofStatus,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import { indexArchiveRecord } from "@/lib/server/governance/archive-service";
import { isGovernanceModuleEnabled } from "@/lib/server/governance/feature-flag";
import { issueGovernancePdf } from "@/lib/server/governance/pdf-issuer";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isGovernanceModuleEnabled()) {
      throw new ApiError(404, "Governance module is disabled");
    }

    const auth = requireAuth(request);
    const { id } = await params;

    const consent = await prisma.consent.findUnique({ where: { id } });
    if (!consent) {
      throw new ApiError(404, "Consent not found");
    }
    if (consent.tenantId !== auth.tenant_id) {
      throw new ApiError(403, "Tenant access denied");
    }

    const signature = await prisma.signature.findFirst({
      where: { tenantId: auth.tenant_id, consentId: id },
      orderBy: { createdAt: "desc" },
    });

    const signatureOk = !signature || signature.status === SignatureProofStatus.SIGNED || signature.status === SignatureProofStatus.VERIFIED;
    if (!signatureOk) {
      throw new ApiError(400, "Signature is not verified/signed yet");
    }

    if (signature?.signatureMethod === "SMS_OTP") {
      await writeAuditLog({
        tenantId: auth.tenant_id,
        userId: auth.sub,
        entityType: "signature",
        entityId: signature.id,
        action: "sms_otp_verified",
        details: "SMS OTP verification completed",
        caseId: consent.caseId,
        request,
      });
    }

    if (signature?.signatureMethod === "NAFATH") {
      await writeAuditLog({
        tenantId: auth.tenant_id,
        userId: auth.sub,
        entityType: "signature",
        entityId: signature.id,
        action: "nafath_completed",
        details: "Nafath signature flow completed",
        caseId: consent.caseId,
        request,
      });
    }

    if (signature?.signatureMethod === "TABLET") {
      await writeAuditLog({
        tenantId: auth.tenant_id,
        userId: auth.sub,
        entityType: "signature",
        entityId: signature.id,
        action: "tablet_signature_captured",
        details: "Tablet signature captured and finalized",
        caseId: consent.caseId,
        request,
      });
    }

    const pdf = issueGovernancePdf("consent", {
      consentId: consent.id,
      patientId: consent.patientId,
      caseId: consent.caseId,
      templateId: consent.templateId,
      version: consent.version,
      signatureMethod: consent.signatureMethod,
      language: consent.language,
      issuedAt: new Date().toISOString(),
    });

    const updated = await prisma.consent.update({
      where: { id },
      data: {
        status: ConsentLifecycleStatus.SIGNED,
        signatureStatus: SignatureProofStatus.SIGNED,
        signedAt: new Date(),
        pdfAttachmentId: pdf.storagePath,
        archiveStatus: GovernanceArchiveStatus.PENDING,
      },
    });

    const archive = await indexArchiveRecord({
      tenantId: auth.tenant_id,
      patientId: updated.patientId,
      caseId: updated.caseId,
      consentId: updated.id,
      formTitle: "Consent Document",
      documentCategory: "consent",
      pdfAttachmentId: updated.pdfAttachmentId,
      legalDocumentFlag: true,
      metadata: {
        templateId: updated.templateId,
        version: updated.version,
        integrityHash: pdf.integrityHash,
      },
    });

    await prisma.consent.update({
      where: { id },
      data: { archiveStatus: GovernanceArchiveStatus.ARCHIVED },
    });

    await writeAuditLog({
      tenantId: auth.tenant_id,
      userId: auth.sub,
      entityType: "consent",
      entityId: id,
      action: "pdf_generated",
      details: "Final consent PDF issued",
      caseId: updated.caseId,
      metadataJson: {
        pdfPath: updated.pdfAttachmentId,
        integrityHash: pdf.integrityHash,
      },
      request,
    });

    await writeAuditLog({
      tenantId: auth.tenant_id,
      userId: auth.sub,
      entityType: "archive",
      entityId: archive.id,
      action: "archive_indexed",
      details: "Consent archive metadata indexed",
      caseId: updated.caseId,
      metadataJson: {
        archiveReferenceId: archive.archiveReferenceId,
        archiveStatus: archive.archiveStatus,
      },
      request,
    });

    await writeAuditLog({
      tenantId: auth.tenant_id,
      userId: auth.sub,
      entityType: "consent",
      entityId: id,
      action: "consent_signed",
      details: "Consent finalized and signed",
      caseId: updated.caseId,
      request,
    });

    return NextResponse.json(toJsonSafe({ consent: updated, archive, pdf }));
  } catch (error) {
    return handleApiError(error);
  }
}
