import {
  ConsentLifecycleStatus,
  GovernanceArchiveStatus,
  GovernanceSignatureMethod,
  GovernanceSignerType,
  SignatureProofStatus,
  type Prisma,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import { isGovernanceModuleEnabled } from "@/lib/server/governance/feature-flag";
import { deriveConsentRecommendations } from "@/lib/server/governance/consent-intelligence";

function parseSignerType(raw: string | undefined): GovernanceSignerType {
  const value = (raw ?? "PATIENT").trim().toUpperCase();
  if (value === "GUARDIAN") return GovernanceSignerType.GUARDIAN;
  if (value === "SURROGATE") return GovernanceSignerType.SURROGATE;
  if (value === "WITNESS") return GovernanceSignerType.WITNESS;
  return GovernanceSignerType.PATIENT;
}

function parseSignatureMethod(raw: string | undefined): GovernanceSignatureMethod | null {
  const value = (raw ?? "").trim().toUpperCase();
  if (value === "SMS_OTP" || value === "SMS") return GovernanceSignatureMethod.SMS_OTP;
  if (value === "NAFATH") return GovernanceSignatureMethod.NAFATH;
  if (value === "TABLET") return GovernanceSignatureMethod.TABLET;
  return null;
}

export async function GET(request: NextRequest) {
  try {
    if (!isGovernanceModuleEnabled()) {
      throw new ApiError(404, "Governance module is disabled");
    }

    const auth = requireAuth(request);
    const consents = await prisma.consent.findMany({
      where: { tenantId: auth.tenant_id },
      orderBy: { createdAt: "desc" },
      take: 300,
    });

    return NextResponse.json(toJsonSafe(consents));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isGovernanceModuleEnabled()) {
      throw new ApiError(404, "Governance module is disabled");
    }

    const auth = requireAuth(request);
    const payload = (await request.json().catch(() => null)) as
      | {
          patientId?: string;
          caseId?: string | null;
          consentTypeId?: string | null;
          templateId?: string | null;
          linkedProcedureId?: string | null;
          linkedServiceModel?: string | null;
          signerType?: string;
          signerName?: string | null;
          signerIdNumber?: string | null;
          signatureMethod?: string | null;
          expiresAt?: string | null;
          language?: string | null;
          payloadJson?: Prisma.InputJsonValue;
          metadata?: Prisma.InputJsonValue;
          intelligenceInput?: {
            highRisk?: boolean;
            requiresAnesthesia?: boolean;
            requiresBloodProducts?: boolean;
            serviceModel?: string;
            patientCapacityStatus?: string;
            releaseRequestSubmitted?: boolean;
          };
        }
      | null;

    if (!payload?.patientId) {
      throw new ApiError(400, "patientId is required");
    }

    const patient = await prisma.patient.findUnique({ where: { id: payload.patientId } });
    if (!patient || patient.tenantId !== auth.tenant_id) {
      throw new ApiError(404, "Patient not found");
    }

    const recommendations = deriveConsentRecommendations({
      highRisk: payload.intelligenceInput?.highRisk,
      requiresAnesthesia: payload.intelligenceInput?.requiresAnesthesia,
      requiresBloodProducts: payload.intelligenceInput?.requiresBloodProducts,
      serviceModel: payload.intelligenceInput?.serviceModel,
      patientCapacityStatus: payload.intelligenceInput?.patientCapacityStatus,
      releaseRequestSubmitted: payload.intelligenceInput?.releaseRequestSubmitted,
    });

    const metadata: Prisma.InputJsonObject = {
      intelligence: recommendations as Prisma.InputJsonValue,
    };

    if (payload.metadata && typeof payload.metadata === "object" && !Array.isArray(payload.metadata)) {
      Object.assign(metadata, payload.metadata as Prisma.InputJsonObject);
    }

    const created = await prisma.consent.create({
      data: {
        tenantId: auth.tenant_id,
        patientId: payload.patientId,
        caseId: payload.caseId ?? null,
        consentTypeId: payload.consentTypeId ?? null,
        templateId: payload.templateId ?? null,
        status: ConsentLifecycleStatus.DRAFT,
        linkedProcedureId: payload.linkedProcedureId ?? null,
        linkedServiceModel: payload.linkedServiceModel ?? null,
        signerType: parseSignerType(payload.signerType),
        signerName: payload.signerName ?? null,
        signerIdNumber: payload.signerIdNumber ?? null,
        signatureMethod: parseSignatureMethod(payload.signatureMethod ?? undefined),
        expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
        archiveStatus: GovernanceArchiveStatus.PENDING,
        signatureStatus: SignatureProofStatus.PENDING,
        language: payload.language ?? null,
        payloadJson: payload.payloadJson ?? undefined,
        metadata,
      },
    });

    await writeAuditLog({
      tenantId: auth.tenant_id,
      userId: auth.sub,
      entityType: "consent",
      entityId: created.id,
      action: "consent_created",
      details: "Consent draft created",
      caseId: created.caseId,
      metadataJson: {
        patientId: created.patientId,
        status: created.status,
      },
      request,
    });

    await writeAuditLog({
      tenantId: auth.tenant_id,
      userId: auth.sub,
      entityType: "consent",
      entityId: created.id,
      action: "consent_recommended",
      details: "Consent intelligence recommendation generated",
      caseId: created.caseId,
      metadataJson: recommendations as Prisma.InputJsonValue,
      request,
    });

    return NextResponse.json(toJsonSafe({ ...created, recommendations }), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
