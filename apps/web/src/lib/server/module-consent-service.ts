import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { recordCaseConsent } from "@/lib/server/consent-service";

type ListConsentArgs = {
  caseId?: string;
  status?: string;
  limit?: number;
};

type CreateConsentPayload = {
  caseId?: string;
  processingPurpose?: string;
  lawfulBasis?: string;
  consentType?: string;
  consentMethod?: string;
  documentVersion?: string;
  witnessName?: string;
  otpReference?: string;
  documentSnapshot?: Record<string, unknown>;
};

const prisma = getPrisma();

function requireTenantId(auth: AuthContext): string {
  if (!auth.tenant_id) {
    throw new ApiError(403, "Tenant context is required");
  }
  return auth.tenant_id;
}

export async function listTenantConsentRecords(auth: AuthContext, args: ListConsentArgs = {}) {
  const tenantId = requireTenantId(auth);
  const take = Math.min(Math.max(args.limit ?? 50, 1), 200);

  return prisma.consentRecord.findMany({
    where: {
      tenantId,
      ...(args.caseId ? { caseId: args.caseId } : {}),
      ...(args.status ? { status: args.status } : {}),
    },
    include: {
      case: {
        select: {
          id: true,
          caseNumber: true,
          patientName: true,
          patientIdNumber: true,
          medicalRecordNo: true,
        },
      },
    },
    orderBy: { consentedAt: "desc" },
    take,
  });
}

export async function createTenantConsentRecord(
  auth: AuthContext,
  payload: CreateConsentPayload,
  request?: NextRequest,
) {
  const tenantId = requireTenantId(auth);
  const caseId = payload.caseId?.trim();

  if (!caseId) {
    throw new ApiError(400, "caseId is required");
  }

  const caseRecord = await prisma.case.findFirst({
    where: {
      id: caseId,
      tenantId,
    },
    select: { id: true },
  });

  if (!caseRecord) {
    throw new ApiError(404, "Case not found");
  }

  return recordCaseConsent(
    auth,
    caseId,
    {
      processingPurpose: payload.processingPurpose,
      lawfulBasis: payload.lawfulBasis,
      consentType: payload.consentType,
      consentMethod: payload.consentMethod,
      documentVersion: payload.documentVersion,
      witnessName: payload.witnessName,
      otpReference: payload.otpReference,
      documentSnapshot: payload.documentSnapshot,
    },
    request,
  );
}
