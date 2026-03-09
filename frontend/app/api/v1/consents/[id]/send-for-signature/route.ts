import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import { isGovernanceModuleEnabled } from "@/lib/server/governance/feature-flag";
import { initializeSignatureProof } from "@/lib/server/governance/signature-proof-service";

const governanceDb = prisma as unknown as {
  consent: {
    findUnique: (args: { where: { id: string } }) => Promise<
      | {
          id: string;
          tenantId: string;
          patientId: string;
          caseId: string | null;
          signatureMethod: "SMS_OTP" | "NAFATH" | "TABLET" | null;
        }
      | null
    >;
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<{ caseId: string | null }>;
  };
  patient: {
    findUnique: (args: { where: { id: string } }) => Promise<{ mobileNumber: string | null } | null>;
  };
  signature: {
    create: (args: { data: Record<string, unknown> }) => Promise<{ id: string; otpReference: string | null; phoneMasked: string | null }>;
  };
};

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

    const consent = await governanceDb.consent.findUnique({ where: { id } });
    if (!consent) {
      throw new ApiError(404, "Consent not found");
    }
    if (consent.tenantId !== auth.tenant_id) {
      throw new ApiError(403, "Tenant access denied");
    }
    if (!consent.signatureMethod) {
      throw new ApiError(400, "signatureMethod must be set before sending for signature");
    }

    const patient = await governanceDb.patient.findUnique({ where: { id: consent.patientId } });
    const init = initializeSignatureProof({
      method: consent.signatureMethod,
      mobileNumber: patient?.mobileNumber,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
    });

    const signature = await governanceDb.signature.create({
      data: {
        tenantId: auth.tenant_id,
        consentId: consent.id,
        patientId: consent.patientId,
        caseId: consent.caseId,
        signatureMethod: consent.signatureMethod,
        status: init.status,
        providerName: consent.signatureMethod,
        otpReference: init.otpReference,
        otpCodeHash: init.otpCodeHash,
        phoneMasked: init.phoneMasked,
        metadata: {
          providerSummary: init.providerSummary,
        },
      },
    });

    const updated = await governanceDb.consent.update({
      where: { id },
      data: {
        status: "SIGNATURE_PENDING",
        signatureStatus:
          init.status === "SIGNED"
            ? "SIGNED"
            : "PENDING",
      },
    });

    await writeAuditLog({
      tenantId: auth.tenant_id,
      userId: auth.sub,
      entityType: "consent",
      entityId: id,
      action: "consent_sent_for_signature",
      details: "Consent sent for signature",
      caseId: updated.caseId,
      metadataJson: {
        method: consent.signatureMethod,
        signatureId: signature.id,
      },
      request,
    });

    if (consent.signatureMethod === "SMS_OTP") {
      await writeAuditLog({
        tenantId: auth.tenant_id,
        userId: auth.sub,
        entityType: "signature",
        entityId: signature.id,
        action: "sms_otp_sent",
        details: "SMS OTP initiated in safe mode",
        caseId: updated.caseId,
        metadataJson: {
          otpReference: signature.otpReference,
          phoneMasked: signature.phoneMasked,
        },
        request,
      });
    }

    if (consent.signatureMethod === "NAFATH") {
      await writeAuditLog({
        tenantId: auth.tenant_id,
        userId: auth.sub,
        entityType: "signature",
        entityId: signature.id,
        action: "nafath_started",
        details: "Nafath placeholder flow started",
        caseId: updated.caseId,
        request,
      });
    }

    return NextResponse.json(toJsonSafe({ consent: updated, signature }));
  } catch (error) {
    return handleApiError(error);
  }
}
