import crypto from "node:crypto";
import { ConsentMethod, Prisma, type ConsentRecord } from "@prisma/client";
import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { appendAuditChainEvent } from "@/lib/server/audit-chain-service";
import { asRecord } from "@/lib/server/compliance-utils";
import { writeAuditLog } from "@/lib/server/saas-services";
import { assertWitnessIntegrityOrThrow } from "@/lib/server/witness-integrity-service";

const prisma = () => getPrisma();

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

function isMissingConsentMethodEnumError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  return (
    normalized.includes("consentmethod") &&
    normalized.includes("does not exist") &&
    normalized.includes("type")
  );
}

async function createConsentRecordWithFallback(args: {
  tenantId: string;
  caseId: string;
  payload: {
    processingPurpose?: string;
    lawfulBasis?: string;
    consentType?: string;
    consentMethod?: string;
    documentVersion?: string;
    witnessName?: string;
    otpReference?: string;
    documentSnapshot?: Record<string, unknown>;
  };
  documentHash: string;
}): Promise<ConsentRecord> {
  const normalizedMethod = normalizeConsentMethod(args.payload.consentMethod);
  const metadataValue = args.payload.documentSnapshot ?? args.payload;
  const createData = {
    tenantId: args.tenantId,
    caseId: args.caseId,
    processingPurpose:
      args.payload.processingPurpose?.trim() || "Discharge refusal medico-legal processing",
    lawfulBasis:
      args.payload.lawfulBasis?.trim() || "PDPL healthcare and legal obligation basis",
    consentType: args.payload.consentType?.trim() || "informed_refusal_consent",
    consentMethod: normalizedMethod,
    documentVersion: args.payload.documentVersion?.trim() || "1.0",
    documentHash: args.documentHash,
    witnessName: args.payload.witnessName?.trim() || null,
    otpReference: args.payload.otpReference?.trim() || null,
    metadata: metadataValue as Prisma.InputJsonValue,
  };

  try {
    return await prisma().consentRecord.create({ data: createData });
  } catch (error) {
    if (!isMissingConsentMethodEnumError(error)) {
      throw error;
    }

    const generatedId = crypto.randomUUID();

    const inserted = await prisma().$queryRaw<Array<{
      id: string;
      tenant_id: string;
      case_id: string;
      processing_purpose: string;
      lawful_basis: string;
      consent_type: string;
      consent_method: string;
      consented_at: Date;
      document_id: string | null;
      document_version: string | null;
      document_hash: string | null;
      witness_name: string | null;
      otp_reference: string | null;
      status: string;
      metadata: Prisma.JsonValue | null;
      created_at: Date;
      updated_at: Date;
    }>>(
      Prisma.sql`
        INSERT INTO consent_records (
          id,
          tenant_id,
          case_id,
          processing_purpose,
          lawful_basis,
          consent_type,
          consent_method,
          document_version,
          document_hash,
          witness_name,
          otp_reference,
          status,
          metadata,
          created_at,
          updated_at
        )
        VALUES (
          ${generatedId},
          ${createData.tenantId},
          ${createData.caseId},
          ${createData.processingPurpose},
          ${createData.lawfulBasis},
          ${createData.consentType},
          ${createData.consentMethod},
          ${createData.documentVersion},
          ${createData.documentHash},
          ${createData.witnessName},
          ${createData.otpReference},
          ${"captured"},
          ${JSON.stringify(metadataValue)}::jsonb,
          NOW(),
          NOW()
        )
        RETURNING
          id,
          tenant_id,
          case_id,
          processing_purpose,
          lawful_basis,
          consent_type,
          consent_method,
          consented_at,
          document_id,
          document_version,
          document_hash,
          witness_name,
          otp_reference,
          status,
          metadata,
          created_at,
          updated_at
      `,
    );

    const row = inserted[0];
    if (!row) {
      throw new Error("Consent insert fallback did not return a row");
    }

    return {
      id: row.id,
      tenantId: row.tenant_id,
      caseId: row.case_id,
      processingPurpose: row.processing_purpose,
      lawfulBasis: row.lawful_basis,
      consentType: row.consent_type,
      consentMethod: normalizeConsentMethod(row.consent_method),
      consentedAt: row.consented_at,
      documentId: row.document_id,
      documentVersion: row.document_version,
      documentHash: row.document_hash,
      witnessName: row.witness_name,
      otpReference: row.otp_reference,
      status: row.status,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

async function getAuthorizedCase(auth: AuthContext, caseId: string) {
  if (!auth.tenant_id) {
    throw new ApiError(403, "Tenant context is required");
  }

  const caseRecord = await prisma().case.findFirst({
    where: { id: caseId, tenantId: auth.tenant_id },
  });

  if (!caseRecord) {
    throw new ApiError(404, "Case not found");
  }

  return caseRecord;
}

export async function listCaseConsentRecords(auth: AuthContext, caseId: string) {
  await getAuthorizedCase(auth, caseId);

  return prisma().consentRecord.findMany({
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
  assertWitnessIntegrityOrThrow(caseRecord.metadata);
  const documentHash = hashDocumentVersion(payload.documentSnapshot ?? payload);

  const record = await createConsentRecordWithFallback({
    tenantId: auth.tenant_id!,
    caseId,
    payload,
    documentHash,
  });

  const metadata = asRecord(caseRecord.metadata);
  await prisma().case.update({
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
  const records = await prisma().consentRecord.findMany({
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