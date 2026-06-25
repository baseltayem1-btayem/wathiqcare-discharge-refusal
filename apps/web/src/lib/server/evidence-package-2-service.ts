import "server-only";

import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/server/prisma";
import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";

type JsonObject = Record<string, unknown>;

type OtpRow = {
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
    `SELECT event_type, raw_payload, created_at
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

export async function recordEvidenceEvent(input: {
  tenantId: string;
  packageId?: string;
  caseId?: string;
  consentDocumentId?: string;
  eventType: string;
  eventTimestamp?: Date;
  sequenceNo?: number;
  procedureName?: string;
  educationVersion?: string;
  educationLanguage?: string;
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
  signerIdentity?: string;
  signatureTimestamp?: Date;
  browser?: string;
  deviceType?: string;
  ipAddress?: string;
  otpSentTime?: Date;
  otpVerificationTime?: Date;
  otpVerificationStatus?: string;
  maskedMobileNumber?: string;
  metadata?: JsonObject;
}) {
  return getPrisma().evidenceEvent.create({
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
}

export async function buildEvidencePackageV2(auth: AuthContext, consentDocumentId: string) {
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

  const firstSignature = doc.signatures[0] || null;
  const latestSignature = doc.signatures[doc.signatures.length - 1] || null;

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

  const timelineRecords = [
    {
      key: "MRN_SELECTED",
      label: "MRN Selected",
      occurredAt: doc.case?.createdAt ?? doc.createdAt,
    },
    {
      key: "EDUCATION_VIEWED",
      label: "Education Viewed",
      occurredAt: educationViewedAt,
    },
    {
      key: "CONSENT_OPENED",
      label: "Consent Opened",
      occurredAt: doc.createdAt,
    },
    {
      key: "SIGNATURE_APPLIED",
      label: "Signature Applied",
      occurredAt: firstSignature?.signedAt ?? null,
    },
    {
      key: "OTP_VERIFIED",
      label: "OTP Verified",
      occurredAt: otpVerificationTime,
    },
    {
      key: "EVIDENCE_GENERATED",
      label: "Evidence Generated",
      occurredAt: new Date(),
    },
  ].filter((entry) => entry.occurredAt !== null) as Array<{ key: string; label: string; occurredAt: Date }>;

  const timelineSummary = timelineRecords
    .map((entry) => `${entry.label}: ${entry.occurredAt.toISOString()}`)
    .join(" | ");

  const pkg = await getPrisma().evidencePackage.create({
    data: {
      tenantId,
      caseId: doc.caseId,
      consentDocumentId: doc.id,
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
      metadata: {
        source: "phase24-evidence-package-2",
        educationEventCount: educationEvents.length,
        signatureCount: doc.signatures.length,
        otpRows: otpRows.length,
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
      procedureName: procedureName ?? undefined,
      educationVersion: educationVersion ?? undefined,
      educationLanguage: educationLanguage ?? undefined,
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
      signerIdentity: latestSignature?.signerName || undefined,
      signatureTimestamp: latestSignature?.signedAt || null,
      browser,
      deviceType,
      ipAddress: latestSignature?.ipAddress || undefined,
      otpSentTime: otpSentTime ?? undefined,
      otpVerificationTime: otpVerificationTime ?? undefined,
      otpVerificationStatus: otpVerificationStatus ?? undefined,
      maskedMobileNumber: maskedMobileNumber ?? undefined,
      metadata: {
        label: item.label,
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
