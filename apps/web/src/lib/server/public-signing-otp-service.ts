import crypto from "node:crypto";
import type { PrismaClient, Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { appendAuditChainEvent } from "@/lib/server/audit-chain-service";
import { ensureEvidenceEventSchema, recordEvidenceEvent } from "@/lib/server/evidence-package-2-service";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { createPublicSigningSessionCookieValue } from "@/lib/server/public-signing-session";
import {
  sendPilotSigningOtpEmail,
  sendSigningOtpEmail,
} from "@/lib/server/pilot-email-override";
import {
  computeDocumentHash,
  getEducationStatus,
  getLinkedEducationPackage,
  getString,
  loadPublicDocumentRecord,
  tokenHash,
  writePublicConsentAudit,
} from "@/lib/server/public-signing-decision-service";
import { getSigningTokenContext } from "@/lib/server/signing-token-context-service";
import { buildSigningOtpSms } from "@/services/sms/smsTemplates";
import { isTaqnyatReady, sendTaqnyatMessage } from "@/services/sms/taqnyatClient";
import { recordSmsAuditAttempt, type SmsProvider } from "@/services/sms/smsAuditService";

const prisma = () => getPrisma();

const OTP_PROVIDER_KEY = "public_signing_otp";
const OTP_REQUESTED_EVENT = "OTP_REQUESTED";
const OTP_VERIFIED_EVENT = "OTP_VERIFIED";
const OTP_VERIFY_FAILED_EVENT = "OTP_VERIFY_FAILED";
const OTP_MAX_ATTEMPTS = 3;
const OTP_EXPIRY_MINUTES = 10;
const PUBLIC_SIGNING_SESSION_TTL_MINUTES = 30;

type OtpChallengePayload = {
  challengeId: string;
  tokenHash: string;
  otpHash: string;
  phoneNumber: string;
  maskedPhone: string;
  expiresAt: string;
  sessionId: string;
  documentId: string;
  moduleType: string;
  ipAddress?: string | null;
};

type OtpEventRow = {
  id: string;
  raw_payload: unknown;
  received_at: Date | string;
};

function normalizePhoneNumber(value: string): string {
  const compact = value.replace(/[\s\-()]/g, "");
  if (!compact) return "";

  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("00")) return `+${compact.slice(2)}`;
  if (compact.startsWith("966")) return `+${compact}`;
  if (compact.startsWith("05") && compact.length === 10) return `+966${compact.slice(1)}`;
  return `+${compact}`;
}

function normalizeRecipientEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidRecipientEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}

function getSecureSigningRecipientEmail(metadata: unknown): string | null {
  const root = typeof metadata === "object" && metadata && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : null;
  const workflow = root && typeof root.secureSigningWorkflow === "object" && root.secureSigningWorkflow && !Array.isArray(root.secureSigningWorkflow)
    ? (root.secureSigningWorkflow as Record<string, unknown>)
    : null;
  const recipientEmail = normalizeRecipientEmail(getString(workflow?.recipientEmail));
  if (!recipientEmail || !isValidRecipientEmail(recipientEmail)) {
    return null;
  }
  return recipientEmail;
}

function maskPhone(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return "****";
  return `${"*".repeat(Math.max(0, trimmed.length - 4))}${trimmed.slice(-4)}`;
}

function otpHash(otpCode: string): string {
  const pepper = process.env.PUBLIC_SIGNING_OTP_PEPPER?.trim();
  if (!pepper) {
    throw new Error("PUBLIC_SIGNING_OTP_PEPPER is required for OTP hashing.");
  }
  return crypto.createHmac("sha256", pepper).update(otpCode).digest("hex");
}

function generateOtpCode(): string {
  const number = crypto.randomInt(0, 1_000_000);
  return number.toString().padStart(6, "0");
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseOtpPayload(raw: unknown): OtpChallengePayload | null {
  if (!raw) return null;
  const value = typeof raw === "string" ? safeJsonParse(raw) : raw;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const payload = value as Partial<OtpChallengePayload>;
  if (!payload.challengeId || !payload.tokenHash || !payload.otpHash || !payload.expiresAt) {
    return null;
  }

  return {
    challengeId: String(payload.challengeId),
    tokenHash: String(payload.tokenHash),
    otpHash: String(payload.otpHash),
    phoneNumber: String(payload.phoneNumber || ""),
    maskedPhone: String(payload.maskedPhone || ""),
    expiresAt: String(payload.expiresAt),
    sessionId: String(payload.sessionId || ""),
    documentId: String(payload.documentId || ""),
    moduleType: String(payload.moduleType || ""),
  };
}

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_BASE_URL?.trim()
    || process.env.NEXT_PUBLIC_APP_URL?.trim()
    || process.env.APP_BASE_URL?.trim()
    || "https://wathiqcare.online"
  ).replace(/\/$/, "");
}

function computePublicSessionExpiry(): string {
  return new Date(Date.now() + PUBLIC_SIGNING_SESSION_TTL_MINUTES * 60 * 1000).toISOString();
}

function getClientIpAddress(request?: NextRequest): string | null {
  return request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}

async function getLatestActiveOtpChallenge(token: string): Promise<{ rowId: string; payload: OtpChallengePayload; createdAt: Date } | null> {
  const rows = await prisma().$queryRawUnsafe<OtpEventRow[]>(
    `SELECT id, raw_payload, received_at
     FROM webhook_events
     WHERE provider_key = $1
       AND event_type = $2
       AND COALESCE(processed, FALSE) = FALSE
       AND raw_payload ->> 'tokenHash' = $3
     ORDER BY received_at DESC
     LIMIT 1`,
    OTP_PROVIDER_KEY,
    OTP_REQUESTED_EVENT,
    tokenHash(token),
  );

  const row = rows[0];
  if (!row) return null;

  const payload = parseOtpPayload(row.raw_payload);
  if (!payload) return null;

  return {
    rowId: row.id,
    payload,
    createdAt: row.received_at instanceof Date ? row.received_at : new Date(row.received_at),
  };
}

async function getFailedAttemptCount(challengeId: string): Promise<number> {
  const rows = await prisma().$queryRawUnsafe<Array<{ count: string | number }>>(
    `SELECT COUNT(*)::int AS count
     FROM webhook_events
     WHERE provider_key = $1
       AND event_type = $2
       AND raw_payload ->> 'challengeId' = $3`,
    OTP_PROVIDER_KEY,
    OTP_VERIFY_FAILED_EVENT,
    challengeId,
  );

  const raw = rows[0]?.count ?? 0;
  return typeof raw === "string" ? Number.parseInt(raw, 10) : Number(raw);
}

async function insertOtpEvent(
  eventType: string,
  payload: Record<string, unknown>,
  processed = false,
  tx?: PrismaClient | Prisma.TransactionClient,
): Promise<void> {
  const client = tx ?? prisma();
  await client.$executeRawUnsafe(
    `INSERT INTO webhook_events (provider_key, event_type, raw_payload, hmac_verified, processed)
     VALUES ($1, $2, $3::jsonb, TRUE, $4)`,
    OTP_PROVIDER_KEY,
    eventType,
    JSON.stringify(payload),
    processed,
  );
}

async function markOtpChallengeProcessed(rowId: string, tx?: PrismaClient | Prisma.TransactionClient): Promise<void> {
  const client = tx ?? prisma();
  await client.$executeRawUnsafe(
    `UPDATE webhook_events
     SET processed = TRUE, processed_at = NOW()
     WHERE id = $1::uuid`,
    rowId,
  );
}

export async function requestSigningOtp(args: {
  token: string;
  mobileNumber: string;
  locale?: "ar" | "en";
  request?: NextRequest;
}) {
  const context = await getSigningTokenContext(args.token);
  const doc = await loadPublicDocumentRecord(context.tenantId, context.documentId);
  if (doc.status === "SIGNED" || doc.status === "FINALIZED") {
    throw new ApiError(409, "Signing flow already completed for this document");
  }
  const recipientEmail = getSecureSigningRecipientEmail(doc.metadata);
  const mobile = normalizePhoneNumber(args.mobileNumber || "");

  if (!mobile) {
    throw new ApiError(400, "mobileNumber is required");
  }

  const challengeId = crypto.randomUUID();
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
  const payload: OtpChallengePayload = {
    challengeId,
    tokenHash: tokenHash(args.token),
    otpHash: otpHash(code),
    phoneNumber: maskPhone(mobile),
    maskedPhone: maskPhone(mobile),
    expiresAt,
    sessionId: context.sessionId,
    documentId: context.documentId,
    moduleType: context.moduleType,
    ipAddress: getClientIpAddress(args.request),
  };

  const linkUrl = `${getBaseUrl()}/sign/${encodeURIComponent(args.token)}`;
  const message = buildSigningOtpSms({
    otpCode: code,
    linkUrl,
    expiresMinutes: OTP_EXPIRY_MINUTES,
    locale: args.locale,
  });

  let deliveryStatus: "sent" | "failed" = "failed";
  let statusCode: number | null = null;
  let providerResponse: Record<string, unknown> | null = null;
  let failureReason: string | null = null;
  let smsProvider: SmsProvider | null = null;
  let otpEmailDeliveryStatus: "sent" | "failed" | "disabled" = "disabled";
  let otpEmailAuditId: string | null = null;
  let otpEmailRecipient: string | null = null;

  if (recipientEmail) {
    const otpEmailDelivery = await sendSigningOtpEmail({
      tenantId: context.tenantId,
      caseId: doc.caseId,
      recipientEmail,
      otpCode: code,
      linkUrl,
      expiresMinutes: OTP_EXPIRY_MINUTES,
      sessionId: context.sessionId,
      documentId: context.documentId,
      challengeId,
      mobileNumber: mobile,
      moduleType: context.moduleType,
      locale: args.locale,
    });

    otpEmailDeliveryStatus = otpEmailDelivery.status;
    otpEmailAuditId = otpEmailDelivery.auditId;
    otpEmailRecipient = otpEmailDelivery.recipient;

    await sendPilotSigningOtpEmail({
      tenantId: context.tenantId,
      caseId: doc.caseId,
      otpCode: code,
      linkUrl,
      expiresMinutes: OTP_EXPIRY_MINUTES,
      sessionId: context.sessionId,
      documentId: context.documentId,
      challengeId,
      mobileNumber: mobile,
      moduleType: context.moduleType,
      locale: args.locale,
    });
  }

  let smsDeliveryStatus: "sent" | "failed" = "failed";
  if (isTaqnyatReady()) {
    const sendResult = await sendTaqnyatMessage({ recipient: mobile, message });
    smsDeliveryStatus = sendResult.ok ? "sent" : "failed";
    statusCode = sendResult.statusCode;
    providerResponse = sendResult.response;
    smsProvider = sendResult.provider;
    failureReason = sendResult.ok ? null : "TAQNYAT_DELIVERY_FAILED";
  } else {
    failureReason = "TAQNYAT_NOT_CONFIGURED";
  }

  deliveryStatus = otpEmailDeliveryStatus === "sent" || smsDeliveryStatus === "sent" ? "sent" : "failed";

  await prisma().$transaction(async (tx) => {
    await insertOtpEvent(OTP_REQUESTED_EVENT, payload, false, tx);

    await recordEvidenceEvent({
      tenantId: context.tenantId,
      consentDocumentId: context.documentId,
      eventType: "OTP_REQUESTED",
      eventTimestamp: new Date(),
      otpSentTime: new Date(),
      otpVerificationStatus: deliveryStatus === "sent" ? "SENT" : "FAILED_TO_SEND",
      maskedMobileNumber: payload.maskedPhone,
      metadata: {
        moduleType: context.moduleType,
        sessionId: context.sessionId,
        challengeId,
        otpEmailDeliveryStatus,
        otpEmailAuditId,
        otpEmailRecipient,
        smsDeliveryStatus,
      },
    }, tx);

    await appendAuditChainEvent({
      tenantId: context.tenantId,
      eventType: "PUBLIC_SIGNING_OTP_REQUESTED",
      actorId: "public_signer",
      actorRole: "patient",
      payloadSummary: `OTP requested for signing session ${context.sessionId}`,
      metadataJson: {
        challengeId,
        tokenHash: payload.tokenHash,
        maskedPhone: payload.maskedPhone,
        moduleType: context.moduleType,
        deliveryStatus,
        otpEmailDeliveryStatus,
        otpEmailAuditId,
        otpEmailRecipient,
        smsDeliveryStatus,
      },
      request: args.request,
    }, tx);

    await recordSmsAuditAttempt({
      tenantId: context.tenantId,
      recipient: mobile,
      status: smsDeliveryStatus,
      statusCode,
      failureReason,
      notificationType: "secure_signing_otp",
      provider: smsProvider,
      metadata: {
        challengeId,
        sessionId: context.sessionId,
        documentId: context.documentId,
        moduleType: context.moduleType,
        providerResponse,
        otpEmailDeliveryStatus,
        otpEmailAuditId,
        otpEmailRecipient,
      },
    }, tx);
  });

  return {
    challengeId,
    expiresAt,
    deliveryStatus,
    fallbackMode: !isTaqnyatReady(),
    maskedPhone: payload.maskedPhone,
  };
}

export async function verifySigningOtp(args: {
  token: string;
  otpCode: string;
  request?: NextRequest;
}) {
  const context = await getSigningTokenContext(args.token);
  const active = await getLatestActiveOtpChallenge(args.token);

  if (!active) {
    throw new ApiError(404, "No active OTP challenge found for this signing token");
  }

  if (new Date(active.payload.expiresAt).getTime() <= Date.now()) {
    throw new ApiError(410, "OTP challenge has expired");
  }

  const attemptsUsed = await getFailedAttemptCount(active.payload.challengeId);
  if (attemptsUsed >= OTP_MAX_ATTEMPTS) {
    throw new ApiError(429, "OTP attempts exceeded. Request a new OTP challenge");
  }

  const submittedCode = String(args.otpCode || "").trim();
  if (!submittedCode) {
    throw new ApiError(400, "otpCode is required");
  }

  const expected = active.payload.otpHash;
  const actual = otpHash(submittedCode);
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(actual, "hex");
  const verified =
    expectedBuffer.length === actualBuffer.length
    && expectedBuffer.length > 0
    && crypto.timingSafeEqual(expectedBuffer, actualBuffer);

  if (!verified) {
    await prisma().$transaction(async (tx) => {
      await insertOtpEvent(OTP_VERIFY_FAILED_EVENT, {
        challengeId: active.payload.challengeId,
        tokenHash: active.payload.tokenHash,
        sessionId: context.sessionId,
        documentId: context.documentId,
        moduleType: context.moduleType,
      }, true, tx);

      await recordEvidenceEvent({
        tenantId: context.tenantId,
        consentDocumentId: context.documentId,
        eventType: "OTP_VERIFY_FAILED",
        eventTimestamp: new Date(),
        otpVerificationStatus: "FAILED",
        maskedMobileNumber: active.payload.maskedPhone,
        metadata: {
          moduleType: context.moduleType,
          sessionId: context.sessionId,
          challengeId: active.payload.challengeId,
        },
      }, tx);
    }, {
      timeout: 20000,
    });

    const latestAttempts = await getFailedAttemptCount(active.payload.challengeId);
    return {
      verified: false,
      redirectPath: context.redirectPath,
      moduleType: context.moduleType,
      documentId: context.documentId,
      attemptsRemaining: Math.max(0, OTP_MAX_ATTEMPTS - latestAttempts),
    };
  }

  const verifiedAt = new Date().toISOString();
  const doc = await loadPublicDocumentRecord(context.tenantId, context.documentId);
  const linkedEducationPackage = await getLinkedEducationPackage(
    context.tenantId,
    doc.templateId,
    doc.templateVersionId,
  );
  const education = await getEducationStatus(context.tenantId, context.documentId, linkedEducationPackage, context.sessionId);
  const documentHash = computeDocumentHash({
    documentId: doc.id,
    consentReference: doc.consentReference,
    status: doc.status,
    diagnosis: doc.diagnosis,
    plannedProcedure: doc.plannedProcedure,
    templateVersionId: doc.templateVersionId,
    updatedAt: doc.updatedAt.toISOString(),
  });
  const publicSessionExpiresAt = computePublicSessionExpiry();
  const publicSigningSessionValue = createPublicSigningSessionCookieValue({
    documentId: context.documentId,
    tokenHash: active.payload.tokenHash,
    signerRole: context.signerRole,
    tenantId: context.tenantId,
    moduleType: context.moduleType,
    challengeId: active.payload.challengeId,
    verifiedAt,
    expiresAt: publicSessionExpiresAt,
  });

  await prisma().$transaction(async (tx) => {
    await markOtpChallengeProcessed(active.rowId, tx);
    await insertOtpEvent(OTP_VERIFIED_EVENT, {
      challengeId: active.payload.challengeId,
      tokenHash: active.payload.tokenHash,
      sessionId: context.sessionId,
      documentId: context.documentId,
      moduleType: context.moduleType,
      verifiedAt,
    }, true, tx);

    await recordEvidenceEvent({
      tenantId: context.tenantId,
      consentDocumentId: context.documentId,
      eventType: "PATIENT_SIGNATURE_VERIFIED_BY_OTP",
      eventTimestamp: new Date(),
      otpVerificationTime: new Date(),
      otpVerificationStatus: "VERIFIED",
      maskedMobileNumber: active.payload.maskedPhone,
      educationViewed: Boolean(education.viewedAt),
      signatureTimestamp: new Date(verifiedAt),
      signerIdentity: context.signerRole,
      ipAddress: getClientIpAddress(args.request) || undefined,
      browser: args.request?.headers.get("user-agent") || undefined,
      metadata: {
        moduleType: context.moduleType,
        sessionId: context.sessionId,
        challengeId: active.payload.challengeId,
        tokenHash: active.payload.tokenHash,
        otpHash: active.payload.otpHash,
        documentHash,
        educationCompleted: education.completed,
        patientAcknowledged: education.patientAcknowledged,
        educationDisplayedAt: education.viewedAt,
        educationAcknowledgedAt: education.acknowledgedAt,
        educationDurationSeconds: education.durationSeconds,
        educationScrollCompletion: education.scrollCompletion,
        educationVersion: education.versionLabel,
        educationHash: education.contentHash,
      },
    }, tx);

    await writePublicConsentAudit({
      tenantId: context.tenantId,
      consentDocumentId: context.documentId,
      action: "PATIENT_SIGNATURE_VERIFIED_BY_OTP",
      summary: `OTP verified for ${context.signerRole.toLowerCase()} signature on consent ${doc.consentReference}`,
      signerRole: context.signerRole,
      metadata: {
        challengeId: active.payload.challengeId,
        tokenHash: active.payload.tokenHash,
        documentHash,
        educationCompleted: education.completed,
        patientAcknowledged: education.patientAcknowledged,
      },
      request: args.request,
      tx,
    });

    await writePublicConsentAudit({
      tenantId: context.tenantId,
      consentDocumentId: context.documentId,
      action: "otp_verified",
      summary: `OTP verified for ${context.signerRole.toLowerCase()} signature on consent ${doc.consentReference}`,
      signerRole: context.signerRole,
      metadata: {
        challengeId: active.payload.challengeId,
        tokenHash: active.payload.tokenHash,
        documentHash,
        educationCompleted: education.completed,
        patientAcknowledged: education.patientAcknowledged,
      },
      request: args.request,
      tx,
    });

    await appendAuditChainEvent({
      tenantId: context.tenantId,
      eventType: "PUBLIC_SIGNING_OTP_VERIFIED",
      actorId: "public_signer",
      actorRole: "patient",
      payloadSummary: `OTP verified for signing session ${context.sessionId}`,
      metadataJson: {
        challengeId: active.payload.challengeId,
        tokenHash: active.payload.tokenHash,
        moduleType: context.moduleType,
        documentId: context.documentId,
      },
      request: args.request,
    }, tx);
  });

  return {
    verified: true,
    redirectPath: context.redirectPath,
    moduleType: context.moduleType,
    documentId: context.documentId,
    attemptsRemaining: OTP_MAX_ATTEMPTS,
    publicSigningSession: {
      value: publicSigningSessionValue,
      expiresAt: publicSessionExpiresAt,
    },
  };
}