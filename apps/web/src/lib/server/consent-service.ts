import crypto from "node:crypto";
import { ConsentMethod, Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { appendAuditChainEvent } from "@/lib/server/audit-chain-service";
import { asRecord } from "@/lib/server/compliance-utils";
import { writeAuditLog } from "@/lib/server/saas-services";

const prisma = getPrisma();

function normalizeConsentMethod(value: string | null | undefined): ConsentMethod {
  const normalized = (value ?? "").trim().toUpperCase();
  switch (normalized) {
    case "OTP":
      return ConsentMethod.OTP;
    case "WITNESS_ACKNOWLEDGMENT":
    case "WITNESS":
      return ConsentMethod.WITNESS_ACKNOWLEDGMENT;
    case "WRITTEN":
      return ConsentMethod.WRITTEN;
    default:
      return ConsentMethod.ELECTRONIC_SIGNATURE;
  }
}

function hashDocumentVersion(payload: Record<string, unknown>): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

async function getAuthorizedCase(auth: AuthContext, caseId: string) {
  if (!auth.tenant_id) {
    throw new ApiError(403, "Tenant context is required");
  }

  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, tenantId: auth.tenant_id },
  });

  if (!caseRecord) {
    throw new ApiError(404, "Case not found");
  }

  return caseRecord;
}

export async function listCaseConsentRecords(auth: AuthContext, caseId: string) {
  await getAuthorizedCase(auth, caseId);

  return prisma.consentRecord.findMany({
    where: { tenantId: auth.tenant_id!, caseId },
    orderBy: { consentedAt: "desc" },
  });
}

export async function recordCaseConsent(
  auth: AuthContext,
  caseId: string,
  payload: {
    processingPurpose?: string;
    lawfulBasis?: string;
    consentType?: string;
    consentMethod?: string;
    documentVersion?: string;
    witnessName?: string;
    otpReference?: string;
    documentSnapshot?: Record<string, unknown>;
  },
  request?: NextRequest,
) {
  const caseRecord = await getAuthorizedCase(auth, caseId);
  const documentHash = hashDocumentVersion(payload.documentSnapshot ?? payload);

  const record = await prisma.consentRecord.create({
    data: {
      tenantId: auth.tenant_id!,
      caseId,
      processingPurpose: payload.processingPurpose?.trim() || "Discharge refusal medico-legal processing",
      lawfulBasis: payload.lawfulBasis?.trim() || "PDPL healthcare and legal obligation basis",
      consentType: payload.consentType?.trim() || "informed_refusal_consent",
      consentMethod: normalizeConsentMethod(payload.consentMethod),
      documentVersion: payload.documentVersion?.trim() || "1.0",
      documentHash,
      witnessName: payload.witnessName?.trim() || null,
      otpReference: payload.otpReference?.trim() || null,
      metadata: (payload.documentSnapshot ?? payload) as Prisma.InputJsonValue,
    },
  });

  const metadata = asRecord(caseRecord.metadata);
  await prisma.case.update({
    where: { id: caseId },
    data: {
      metadata: {
        ...(metadata ?? {}),
        consent: {
          record_id: record.id,
          consent_method: record.consentMethod,
          document_hash: record.documentHash,
          consented_at: record.consentedAt.toISOString(),
        },
      } as Prisma.InputJsonValue,
    },
  });

  await writeAuditLog({
    tenantId: auth.tenant_id!,
    userId: auth.sub,
    entityType: "consent_record",
    entityId: record.id,
    action: "consent_recorded",
    details: `Consent captured via ${record.consentMethod}`,
    caseId,
    metadataJson: {
      consentMethod: record.consentMethod,
      documentHash: record.documentHash,
    },
    request,
  });

  await appendAuditChainEvent({
    tenantId: auth.tenant_id!,
    caseId,
    eventType: "CONSENT_RECORDED",
    actorId: auth.sub,
    actorRole: auth.role ?? null,
    payloadSummary: `Consent recorded (${record.consentMethod})`,
    documentVersion: record.documentVersion,
    metadataJson: {
      consentRecordId: record.id,
      documentHash: record.documentHash,
    },
    request,
  }).catch(() => undefined);

  return record;
}

export async function getConsentSummary(tenantId: string) {
  const records = await prisma.consentRecord.findMany({
    where: { tenantId },
    orderBy: { consentedAt: "desc" },
    take: 50,
  }).catch(() => []);

  return {
    total: records.length,
    byMethod: records.reduce<Record<string, number>>((acc, item) => {
      acc[item.consentMethod] = (acc[item.consentMethod] ?? 0) + 1;
      return acc;
    }, {}),
    records,
  };
}