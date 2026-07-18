import type { Prisma, PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/server/prisma";
import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { logRuntimeIncident } from "@/lib/server/runtime-observability";

type JsonObject = Record<string, unknown>;

type OtpRow = {
  id: string;
  event_type: string;
  raw_payload: unknown;
  created_at: Date | string;
};

export type EvidenceSearchFilters = {
  mrn?: string;
  consent?: string;
  dateFrom?: string;
  dateTo?: string;
};

function asRecord(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JsonObject;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function detectDeviceType(userAgent: string | null | undefined): string {
  const source = (userAgent || "").toLowerCase();
  if (!source) return "unknown";
  if (source.includes("ipad") || source.includes("tablet")) return "tablet";
  if (source.includes("mobile") || source.includes("android") || source.includes("iphone")) return "mobile";
  return "desktop";
}

function detectBrowser(userAgent: string | null | undefined): string {
  const source = userAgent || "";
  if (!source) return "unknown";
  if (/Edg\//.test(source)) return "Edge";
  if (/OPR\//.test(source) || /Opera/.test(source)) return "Opera";
  if (/Firefox\//.test(source)) return "Firefox";
  if (/Chrome\//.test(source)) return "Chrome";
  if (/Safari\//.test(source) && !/Chrome\//.test(source)) return "Safari";
  return "unknown";
}

function parseOtpPayload(raw: unknown): JsonObject {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return asRecord(JSON.parse(raw));
    } catch {
      return {};
    }
  }
  return asRecord(raw);
}

async function readOtpRowsByDocument(documentId: string): Promise<OtpRow[]> {
  return getPrisma().$queryRawUnsafe<OtpRow[]>(
    `SELECT id, event_type, raw_payload, created_at
     FROM webhook_events
     WHERE provider_key = $1
       AND event_type IN ('OTP_REQUESTED', 'OTP_VERIFIED', 'OTP_VERIFY_FAILED')
       AND raw_payload ->> 'documentId' = $2
     ORDER BY created_at ASC`,
    "public_signing_otp",
    documentId,
  );
}

function buildEducationSummary(args: {
  procedureName: string | null;
  educationVersion: string | null;
  educationLanguage: string | null;
  educationViewed: boolean;
  viewDurationSeconds: number | null;
  imagesPresented: number;
  videosPresented: number;
  pdfsPresented: number;
}): string {
  return [
    `Procedure: ${args.procedureName || "n/a"}`,
    `Education version: ${args.educationVersion || "n/a"}`,
    `Language: ${args.educationLanguage || "n/a"}`,
    `Viewed: ${args.educationViewed ? "yes" : "no"}`,
    `Duration: ${args.viewDurationSeconds ?? 0}s`,
    `Assets: images=${args.imagesPresented}, videos=${args.videosPresented}, pdfs=${args.pdfsPresented}`,
  ].join(" | ");
}

function buildConsentSummary(args: {
  consentTemplate: string | null;
  consentVersion: string | null;
  consentLanguage: string | null;
  consentTimestamp: Date | null;
}): string {
  return [
    `Template: ${args.consentTemplate || "n/a"}`,
    `Version: ${args.consentVersion || "n/a"}`,
    `Language: ${args.consentLanguage || "n/a"}`,
    `Timestamp: ${args.consentTimestamp ? args.consentTimestamp.toISOString() : "n/a"}`,
  ].join(" | ");
}

function minDate(values: Array<Date | null | undefined>): Date | null {
  const valid = values.filter((value): value is Date => value instanceof Date && !Number.isNaN(value.getTime()));
  if (valid.length === 0) return null;
  return valid.sort((a, b) => a.getTime() - b.getTime())[0];
}

function maxDate(values: Array<Date | null | undefined>): Date | null {
  const valid = values.filter((value): value is Date => value instanceof Date && !Number.isNaN(value.getTime()));
  if (valid.length === 0) return null;
  return valid.sort((a, b) => b.getTime() - a.getTime())[0];
}

const EVIDENCE_SCHEMA_STATEMENTS = [
  `
    CREATE TABLE IF NOT EXISTS evidence_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      package_id UUID,
      case_id UUID,
      consent_document_id UUID,
      event_type TEXT NOT NULL,
      event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sequence_no INT,
      procedure_name TEXT,
      education_version TEXT,
      education_language TEXT,
      assets_presented INT,
      images_presented INT,
      videos_presented INT,
      pdfs_presented INT,
      education_viewed BOOLEAN,
      view_duration_seconds INT,
      consent_template TEXT,
      consent_version TEXT,
      consent_language TEXT,
      consent_timestamp TIMESTAMPTZ,
      signer_identity TEXT,
      signature_timestamp TIMESTAMPTZ,
      browser TEXT,
      device_type TEXT,
      ip_address TEXT,
      otp_sent_time TIMESTAMPTZ,
      otp_verification_time TIMESTAMPTZ,
      otp_verification_status TEXT,
      masked_mobile_number TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_evidence_events_tenant_type_time
      ON evidence_events (tenant_id, event_type, event_timestamp)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_evidence_events_case_time
      ON evidence_events (tenant_id, case_id, event_timestamp)
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_evidence_events_consent_time
      ON evidence_events (tenant_id, consent_document_id, event_timestamp)
  `,
];

let ensureEvidenceSchemaPromise: Promise<void> | null = null;

async function ensureEvidenceSchema(): Promise<void> {
  if (!ensureEvidenceSchemaPromise) {
    ensureEvidenceSchemaPromise = (async () => {
      const prisma = getPrisma();
      for (const statement of EVIDENCE_SCHEMA_STATEMENTS) {
        await prisma.$executeRawUnsafe(statement);
      }
    })().finally(() => {
      ensureEvidenceSchemaPromise = null;
    });
  }

  await ensureEvidenceSchemaPromise;
}

export async function ensureEvidenceEventSchema(): Promise<void> {
  await ensureEvidenceSchema();
}

export async function recordEvidenceEvent(
  input: {
    tenantId: string;
    packageId?: string;
    caseId?: string;
    consentDocumentId?: string;
    eventType: string;
    eventTimestamp?: Date;
    sequenceNo?: number;
    procedureName?: string | null;
    educationVersion?: string | null;
    educationLanguage?: string | null;
    assetsPresented?: number;
    imagesPresented?: number;
    videosPresented?: number;
    pdfsPresented?: number;
    educationViewed?: boolean;
    viewDurationSeconds?: number;
    consentTemplate?: string;
    consentVersion?: string;
    consentLanguage?: string;
    consentTimestamp?: Date;
    signerIdentity?: string | null;
    signatureTimestamp?: Date | null;
    browser?: string;
    deviceType?: string;
    ipAddress?: string | null;
    otpSentTime?: Date | null;
    otpVerificationTime?: Date | null;
    otpVerificationStatus?: string | null;
    maskedMobileNumber?: string | null;
    metadata?: JsonObject;
  },
  tx?: PrismaClient | Prisma.TransactionClient,
) {
  await ensureEvidenceSchema();
  const client = tx ?? getPrisma();
  try {
    return await client.evidenceEvent.create({
      data: {
        tenantId: input.tenantId,
        packageId: input.packageId,
        caseId: input.caseId,
        consentDocumentId: input.consentDocumentId,
        eventType: input.eventType,
        eventTimestamp: input.eventTimestamp ?? new Date(),
        sequenceNo: input.sequenceNo,
        procedureName: input.procedureName,
        educationVersion: input.educationVersion,
        educationLanguage: input.educationLanguage,
        assetsPresented: input.assetsPresented,
        imagesPresented: input.imagesPresented,
        videosPresented: input.videosPresented,
        pdfsPresented: input.pdfsPresented,
        educationViewed: input.educationViewed,
        viewDurationSeconds: input.viewDurationSeconds,
        consentTemplate: input.consentTemplate,
        consentVersion: input.consentVersion,
        consentLanguage: input.consentLanguage,
        consentTimestamp: input.consentTimestamp,
        signerIdentity: input.signerIdentity,
        signatureTimestamp: input.signatureTimestamp,
        browser: input.browser,
        deviceType: input.deviceType,
        ipAddress: input.ipAddress,
        otpSentTime: input.otpSentTime,
        otpVerificationTime: input.otpVerificationTime,
        otpVerificationStatus: input.otpVerificationStatus,
        maskedMobileNumber: input.maskedMobileNumber,
        metadata: input.metadata as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("does not exist in the current database")) {
      logRuntimeIncident({
        module: "evidence-package-2",
        type: "UNHANDLED_EXCEPTION",
        operation: "recordEvidenceEvent",
        tenantId: input.tenantId,
        error,
        details: { consentDocumentId: input.consentDocumentId, eventType: input.eventType },
      });
      return null;
    }
    throw error;
  }
}

export async function recordConsentTimelineEvent(
  input: {
    tenantId: string;
    consentDocumentId: string;
    signingSessionId?: string;
    action: string;
    actorUserId?: string | null;
    actorRole?: string | null;
    deviceInfo?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: JsonObject;
  },
  tx?: PrismaClient | Prisma.TransactionClient,
) {
  const client = tx ?? getPrisma();
  return client.consentTimelineEvent.create({
    data: {
      tenantId: input.tenantId,
      consentDocumentId: input.consentDocumentId,
      action: input.action,
      actorUserId: input.actorUserId ?? null,
      actorRole: input.actorRole ?? null,
      deviceInfo: input.deviceInfo ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata as Prisma.InputJsonValue,
    },
  });
}

export type EvidenceTimelineRecord = {
  key: string;
  label: string;
  occurredAt: Date;
  actorRole?: string | null;
  metadata?: JsonObject;
};

export function buildEvidenceTimelineRecords(args: {
  doc: {
    id: string;
    caseId: string | null;
    createdAt: Date;
    status: string;
    outcome?: string | null;
    finalPdfHash?: string | null;
  };
  signatures: Array<{
    role: string;
    signerName: string;
    signedAt: Date;
    outcome?: string | null;
  }>;
  signingSession?: {
    id: string;
    createdAt: Date;
    status: string;
    otpVerifiedAt?: Date | null;
    linkOpenedAt?: Date | null;
    dispatches?: Array<{
      channel: string;
      status: string;
      sentAt?: Date | null;
      deliveredAt?: Date | null;
      lastErrorCode?: string | null;
    }>;
  } | null;
  educationEvents: Array<{ createdAt: Date; action: string; metadata?: JsonObject }>;
  otpRows: Array<{ event_type: string; created_at: Date | string; raw_payload?: unknown }>;
  finalPdfHash?: string | null;
}): EvidenceTimelineRecord[] {
  const records: EvidenceTimelineRecord[] = [];

  records.push({
    key: "SESSION_CREATED",
    label: "Secure signing session created",
    occurredAt: args.signingSession?.createdAt ?? args.doc.createdAt,
    actorRole: "system",
    metadata: args.signingSession
      ? { sessionId: args.signingSession.id, status: args.signingSession.status }
      : undefined,
  });

  const dispatches = args.signingSession?.dispatches ?? [];
  for (const dispatch of dispatches) {
    const occurredAt = dispatch.deliveredAt ?? dispatch.sentAt ?? args.signingSession?.createdAt ?? args.doc.createdAt;
    records.push({
      key: "DISPATCHED",
      label: `${dispatch.channel} dispatch: ${dispatch.status}`,
      occurredAt,
      actorRole: "system",
      metadata: {
        channel: dispatch.channel,
        status: dispatch.status,
        lastErrorCode: dispatch.lastErrorCode,
      },
    });
  }

  if (args.signingSession?.linkOpenedAt) {
    records.push({
      key: "LINK_OPENED",
      label: "Patient opened signing link",
      occurredAt: args.signingSession.linkOpenedAt,
      actorRole: "patient",
    });
  }

  const otpVerified = args.otpRows.find((row) => row.event_type === "OTP_VERIFIED");
  if (otpVerified) {
    records.push({
      key: "OTP_VERIFIED",
      label: "OTP verified",
      occurredAt: toDate(otpVerified.created_at) ?? args.doc.createdAt,
      actorRole: "patient",
    });
  }

  const educationPresented = args.educationEvents.find((event) =>
    event.action.startsWith("EDUCATION_PRESENTED"),
  );
  if (educationPresented) {
    records.push({
      key: "EDUCATION_VIEWED",
      label: "Education material viewed",
      occurredAt: educationPresented.createdAt,
      actorRole: "patient",
    });
  }

  for (const signature of args.signatures) {
    const outcome = signature.outcome ?? args.doc.outcome;
    const key = outcome === "REFUSED" ? "DECISION_REFUSED" : "SIGNATURE_CAPTURED";
    const label = outcome === "REFUSED"
      ? `Refusal signature captured (${signature.role})`
      : `Signature captured (${signature.role})`;
    records.push({
      key,
      label,
      occurredAt: signature.signedAt,
      actorRole: signature.role.toLowerCase(),
      metadata: {
        signerName: signature.signerName,
        signerRole: signature.role,
        outcome,
      },
    });
  }

  if (args.doc.outcome === "REFUSED" || args.doc.outcome === "CONSENTED" || args.doc.outcome === "GUARDIAN_SIGNED") {
    records.push({
      key: "PDF_FINALIZED",
      label: "Final PDF generated and evidence package finalized",
      occurredAt: new Date(),
      actorRole: "system",
      metadata: {
        outcome: args.doc.outcome,
        finalPdfHash: args.finalPdfHash ?? args.doc.finalPdfHash,
      },
    });
  }

  return records
    .filter((record) => record.occurredAt && !Number.isNaN(record.occurredAt.getTime()))
    .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
}

export async function buildEvidencePackageV2(
  auth: AuthContext,
  consentDocumentId: string,
  options?: {
    signingSessionId?: string;
    finalPdfHash?: string;
    patientCopyDeliveryStatus?: string;
  },
) {
  const tenantId = (auth.tenant_id || "").trim();
  if (!tenantId) {
    throw new ApiError(400, "Missing tenant context");
  }

  const doc = await getPrisma().consentDocument.findFirst({
    where: { id: consentDocumentId, tenantId },
    include: {
      case: true,
      template: true,
      templateVersion: true,
      signatures: { orderBy: { signedAt: "asc" } },
      auditEvents: { orderBy: { createdAt: "asc" } },
      timelineEvents: { orderBy: { createdAt: "asc" } },
      signingSessions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { dispatches: true },
      },
    },
  });

  if (!doc) {
    throw new ApiError(404, "Consent document not found");
  }

  const educationEvents = doc.auditEvents.filter((event) => {
    const source = (event.source || "").toLowerCase();
    return source === "patient-education" || event.action.startsWith("EDUCATION_") || event.action.startsWith("UNDERSTANDING_");
  });

  const educationMetadata = educationEvents.map((event) => asRecord(event.metadata));
  const latestEducation = educationMetadata[educationMetadata.length - 1] || {};

  const procedureName =
    String(latestEducation.procedureName || "").trim()
    || String(doc.plannedProcedure || "").trim()
    || String(doc.template.titleEn || "").trim()
    || null;

  const educationVersion = String(latestEducation.educationVersion || latestEducation.templateCode || "").trim() || null;
  const educationLanguage = String(latestEducation.language || doc.language || "").trim() || null;
  const imagesPresented = Number(latestEducation.imagesPresented || 0) || 0;
  const videosPresented = Number(latestEducation.videosPresented || 0) || 0;
  const pdfsPresented = Number(latestEducation.pdfsPresented || 0) || 0;
  const assetsPresented = Number(latestEducation.assetsPresented || imagesPresented + videosPresented + pdfsPresented) || 0;
  const educationViewed = educationEvents.length > 0;
  const viewDurationSeconds = Number(latestEducation.durationSeconds || 0) || 0;
  const educationViewedAt = minDate(educationEvents.map((event) => event.createdAt));

  const otpRows = await readOtpRowsByDocument(doc.id);
  const otpRequested = otpRows.find((row) => row.event_type === "OTP_REQUESTED");
  const otpVerified = otpRows.find((row) => row.event_type === "OTP_VERIFIED");
  const otpFailed = otpRows.find((row) => row.event_type === "OTP_VERIFY_FAILED");

  const otpRequestedPayload = parseOtpPayload(otpRequested?.raw_payload);
  const otpVerifiedPayload = parseOtpPayload(otpVerified?.raw_payload);
  const maskedMobileNumber =
    String(otpRequestedPayload.maskedPhone || otpVerifiedPayload.maskedPhone || "").trim() || null;

  let otpVerificationStatus: string | null = null;
  if (otpVerified) otpVerificationStatus = "VERIFIED";
  else if (otpFailed) otpVerificationStatus = "FAILED";
  else if (otpRequested) otpVerificationStatus = "SENT";

  const otpSentTime = toDate(otpRequested?.created_at);
  const otpVerificationTime = toDate(otpVerified?.created_at);
  const otpRequestEventId = otpRequested?.id || null;
  const otpVerifyEventId = otpVerified?.id || null;

  const firstSignature = doc.signatures[0] || null;
  const latestSignature = doc.signatures[doc.signatures.length - 1] || null;
  const latestSignatureHash = latestSignature?.signatureHash || null;

  const browser = detectBrowser(firstSignature?.userAgent);
  const deviceType = detectDeviceType(firstSignature?.userAgent);

  const consentTimestamp = doc.createdAt;
  const consentTemplate = doc.template.templateCode;
  const consentVersion = doc.templateVersion.versionLabel;
  const consentLanguage = doc.language;

  const educationSummary = buildEducationSummary({
    procedureName,
    educationVersion,
    educationLanguage,
    educationViewed,
    viewDurationSeconds,
    imagesPresented,
    videosPresented,
    pdfsPresented,
  });

  const consentSummary = buildConsentSummary({
    consentTemplate,
    consentVersion,
    consentLanguage,
    consentTimestamp,
  });

  const signingSession =
    doc.signingSessions?.find((session) =>
      options?.signingSessionId ? session.id === options.signingSessionId : true,
    ) ?? null;

  const outcome =
    doc.outcome && doc.outcome !== "PENDING"
      ? doc.outcome
      : latestSignature?.outcome ?? "PENDING";

  const finalPdfHash = options?.finalPdfHash ?? doc.finalPdfHash ?? latestSignature?.signatureHash ?? null;

  const timelineRecords = buildEvidenceTimelineRecords({
    doc: {
      id: doc.id,
      caseId: doc.caseId,
      createdAt: doc.createdAt,
      status: doc.status,
      outcome,
      finalPdfHash,
    },
    signatures: doc.signatures.map((signature) => ({
      role: signature.role,
      signerName: signature.signerName,
      signedAt: signature.signedAt,
      outcome: signature.outcome,
    })),
    signingSession: signingSession
      ? {
          id: signingSession.id,
          createdAt: signingSession.createdAt,
          status: signingSession.status,
          otpVerifiedAt: signingSession.otpVerifiedAt,
          linkOpenedAt: signingSession.linkOpenedAt,
          dispatches: signingSession.dispatches.map((dispatch) => ({
            channel: dispatch.channel,
            status: dispatch.status,
            sentAt: dispatch.sentAt,
            deliveredAt: dispatch.deliveredAt,
            lastErrorCode: dispatch.lastErrorCode,
          })),
        }
      : null,
    educationEvents: educationEvents.map((event) => ({
      createdAt: event.createdAt,
      action: event.action,
      metadata: asRecord(event.metadata),
    })),
    otpRows,
    finalPdfHash,
  });

  const timelineSummary = timelineRecords
    .map((entry) => `${entry.label}: ${entry.occurredAt.toISOString()}`)
    .join(" | ");

  const pkg = await getPrisma().evidencePackage.create({
    data: {
      tenantId,
      caseId: doc.caseId,
      consentDocumentId: doc.id,
      signingSessionId: signingSession?.id ?? options?.signingSessionId ?? null,
      mrn: doc.mrn || doc.case?.medicalRecordNo || null,
      procedureName,
      educationVersion,
      educationLanguage,
      educationViewed,
      viewDurationSeconds,
      consentTemplate,
      consentVersion,
      consentLanguage,
      consentTimestamp,
      signerIdentity: latestSignature?.signerName || null,
      signatureTimestamp: latestSignature?.signedAt || null,
      browser,
      deviceType,
      ipAddress: latestSignature?.ipAddress || null,
      otpSentTime,
      otpVerificationTime,
      otpVerificationStatus,
      maskedMobileNumber,
      educationSummary,
      consentSummary,
      timelineSummary,
      outcome,
      finalPdfHash,
      patientCopyDeliveryStatus: options?.patientCopyDeliveryStatus ?? doc.patientCopyDeliveryStatus ?? null,
      metadata: {
        source: "phase24-evidence-package-2",
        educationEventCount: educationEvents.length,
        signatureCount: doc.signatures.length,
        otpRows: otpRows.length,
        otpRequestEventId,
        otpVerifyEventId,
        signatureHash: latestSignatureHash,
      } as Prisma.InputJsonValue,
    },
  });

  let sequenceNo = 10;
  for (const item of timelineRecords) {
    await recordEvidenceEvent({
      tenantId,
      packageId: pkg.id,
      caseId: doc.caseId,
      consentDocumentId: doc.id,
      eventType: item.key,
      eventTimestamp: item.occurredAt,
      sequenceNo,
      procedureName,
      educationVersion,
      educationLanguage,
      assetsPresented,
      imagesPresented,
      videosPresented,
      pdfsPresented,
      educationViewed,
      viewDurationSeconds,
      consentTemplate,
      consentVersion,
      consentLanguage,
      consentTimestamp,
      signerIdentity: latestSignature?.signerName || null,
      signatureTimestamp: latestSignature?.signedAt || null,
      browser,
      deviceType,
      ipAddress: latestSignature?.ipAddress || null,
      otpSentTime,
      otpVerificationTime,
      otpVerificationStatus,
      maskedMobileNumber,
      metadata: {
        label: item.label,
        otpRequestEventId,
        otpVerifyEventId,
        signatureHash: latestSignatureHash,
      },
    });
    await recordConsentTimelineEvent({
      tenantId,
      consentDocumentId: doc.id,
      signingSessionId: signingSession?.id ?? options?.signingSessionId ?? undefined,
      action: item.key,
      actorRole: item.actorRole ?? "system",
      metadata: {
        ...item.metadata,
        label: item.label,
        packageId: pkg.id,
      },
    });
    sequenceNo += 10;
  }

  if (assetsPresented > 0) {
    for (let i = 0; i < imagesPresented; i += 1) {
      await getPrisma().evidenceAssetRecord.create({
        data: {
          tenantId,
          packageId: pkg.id,
          assetType: "IMAGE",
          assetCategory: "education",
          title: `Education image ${i + 1}`,
          language: educationLanguage || "bilingual",
          sortOrder: i + 1,
          metadata: {
            presented: true,
          } as Prisma.InputJsonValue,
        },
      });
    }

    for (let i = 0; i < videosPresented; i += 1) {
      await getPrisma().evidenceAssetRecord.create({
        data: {
          tenantId,
          packageId: pkg.id,
          assetType: "VIDEO",
          assetCategory: "education",
          title: `Education video ${i + 1}`,
          language: educationLanguage || "bilingual",
          sortOrder: 100 + i + 1,
          metadata: {
            presented: true,
          } as Prisma.InputJsonValue,
        },
      });
    }

    for (let i = 0; i < pdfsPresented; i += 1) {
      await getPrisma().evidenceAssetRecord.create({
        data: {
          tenantId,
          packageId: pkg.id,
          assetType: "PDF",
          assetCategory: "education",
          title: `Education PDF ${i + 1}`,
          language: educationLanguage || "bilingual",
          sortOrder: 200 + i + 1,
          metadata: {
            presented: true,
          } as Prisma.InputJsonValue,
        },
      });
    }
  }

  await getPrisma().evidenceTimeline.create({
    data: {
      tenantId,
      packageId: pkg.id,
      caseId: doc.caseId,
      consentDocumentId: doc.id,
      mrn: pkg.mrn,
      timelineJson: {
        steps: timelineRecords.map((item) => ({
          key: item.key,
          label: item.label,
          occurredAt: item.occurredAt.toISOString(),
        })),
      } as Prisma.InputJsonValue,
      summaryText: timelineSummary,
      metadata: {
        source: "phase24-evidence-package-2",
      } as Prisma.InputJsonValue,
    },
  });

  return {
    packageId: pkg.id,
    educationSummary,
    consentSummary,
    timelineSummary,
  };
}

export async function listEvidencePackages(auth: AuthContext, filters: EvidenceSearchFilters) {
  const tenantId = (auth.tenant_id || "").trim();
  if (!tenantId) {
    throw new ApiError(400, "Missing tenant context");
  }

  const where: Prisma.EvidencePackageWhereInput = {
    tenantId,
  };

  if (filters.mrn && filters.mrn.trim()) {
    where.mrn = { contains: filters.mrn.trim(), mode: "insensitive" };
  }

  if (filters.consent && filters.consent.trim()) {
    where.OR = [
      { consentTemplate: { contains: filters.consent.trim(), mode: "insensitive" } },
      { consentVersion: { contains: filters.consent.trim(), mode: "insensitive" } },
    ];
  }

  if (filters.dateFrom || filters.dateTo) {
    where.generatedAt = {};
    if (filters.dateFrom) {
      where.generatedAt.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.generatedAt.lte = new Date(filters.dateTo);
    }
  }

  return getPrisma().evidencePackage.findMany({
    where,
    include: {
      timeline: true,
      assetRecords: {
        orderBy: { sortOrder: "asc" },
      },
      events: {
        orderBy: [{ sequenceNo: "asc" }, { eventTimestamp: "asc" }],
      },
    },
    orderBy: { generatedAt: "desc" },
    take: 100,
  });
}
