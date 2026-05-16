import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { appendAuditChainEvent } from "@/lib/server/audit-chain-service";
import { validateSigningToken } from "@/lib/server/signature-orchestration-service";
import { buildSigningOtpSms } from "@/services/sms/smsTemplates";
import { isTaqnyatReady, sendTaqnyatMessage } from "@/services/sms/taqnyatClient";
import { recordSmsAuditAttempt } from "@/services/sms/smsAuditService";

const prisma = () => getPrisma();

const OTP_PROVIDER_KEY = "public_signing_otp";
const OTP_REQUESTED_EVENT = "OTP_REQUESTED";
const OTP_VERIFIED_EVENT = "OTP_VERIFIED";
const OTP_VERIFY_FAILED_EVENT = "OTP_VERIFY_FAILED";
const OTP_MAX_ATTEMPTS = 3;
const OTP_EXPIRY_MINUTES = 10;

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
};

type OtpEventRow = {
  id: string;
  raw_payload: unknown;
  created_at: Date | string;
};

export type SigningTokenContext = {
  tenantId: string;
  sessionId: string;
  documentId: string;
  moduleType: string;
  redirectPath: string;
};

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_BASE_URL?.trim()
    || process.env.NEXT_PUBLIC_APP_URL?.trim()
    || process.env.APP_BASE_URL?.trim()
    || "https://wathiqcare.online"
  ).replace(/\/$/, "");
}

function normalizePhoneNumber(value: string): string {
  const compact = value.replace(/[\s\-()]/g, "");
  if (!compact) return "";

  if (compact.startsWith("+")) return compact;
  if (compact.startsWith("00")) return `+${compact.slice(2)}`;
  if (compact.startsWith("966")) return `+${compact}`;
  if (compact.startsWith("05") && compact.length === 10) return `+966${compact.slice(1)}`;
  return `+${compact}`;
}

function maskPhone(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return "****";
  return `${"*".repeat(Math.max(0, trimmed.length - 4))}${trimmed.slice(-4)}`;
}

function tokenHash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function otpHash(otpCode: string): string {
  const pepper = process.env.PUBLIC_SIGNING_OTP_PEPPER?.trim() || "wathiqcare-signing-otp-pepper";
  return crypto.createHmac("sha256", pepper).update(otpCode).digest("hex");
}

function generateOtpCode(): string {
  const number = crypto.randomInt(0, 1_000_000);
  return number.toString().padStart(6, "0");
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

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function buildRedirectPath(moduleType: string, documentId: string, token: string): string {
  const normalized = moduleType.toLowerCase();
  if (normalized.includes("informed")) {
    return `/modules/informed-consents/${encodeURIComponent(documentId)}/signature`;
  }
  if (normalized.includes("discharge")) {
    return `/secure/${encodeURIComponent(token)}`;
  }
  if (normalized.includes("legal")) {
    return `/cases/${encodeURIComponent(documentId)}/legal-package`;
  }
  return `/documents/${encodeURIComponent(documentId)}`;
}

export async function getSigningTokenContext(token: string): Promise<SigningTokenContext> {
  const normalizedToken = String(token || "").trim();
  if (!normalizedToken) {
    throw new ApiError(400, "Invalid or expired signing token");
  }

  const validated = await validateSigningToken(normalizedToken);
  if (!validated.sessionId || !validated.documentId || !validated.moduleType || !validated.tenantId || !validated.signerRole) {
    throw new ApiError(404, "Invalid or expired signing token");
  }

  return {
    tenantId: validated.tenantId,
    sessionId: validated.sessionId,
    documentId: validated.documentId,
    moduleType: validated.moduleType,
    redirectPath: buildRedirectPath(validated.moduleType, validated.documentId, normalizedToken),
  };
}

async function getLatestActiveOtpChallenge(token: string): Promise<{ rowId: string; payload: OtpChallengePayload; createdAt: Date } | null> {
  const rows = await prisma().$queryRawUnsafe<OtpEventRow[]>(
    `SELECT id, raw_payload, created_at
     FROM webhook_events
     WHERE provider_key = $1
       AND event_type = $2
       AND COALESCE(processed, FALSE) = FALSE
       AND raw_payload ->> 'tokenHash' = $3
     ORDER BY created_at DESC
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
    createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
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

async function insertOtpEvent(eventType: string, payload: Record<string, unknown>, processed = false): Promise<void> {
  await prisma().$executeRawUnsafe(
    `INSERT INTO webhook_events (provider_key, event_type, raw_payload, hmac_verified, processed)
     VALUES ($1, $2, $3::jsonb, TRUE, $4)`,
    OTP_PROVIDER_KEY,
    eventType,
    JSON.stringify(payload),
    processed,
  );
}

async function markOtpChallengeProcessed(rowId: string): Promise<void> {
  await prisma().$executeRawUnsafe(
    `UPDATE webhook_events
     SET processed = TRUE, processed_at = NOW()
     WHERE id = $1`,
    rowId,
  );
}

export async function requestSigningOtp(args: {
  token: string;
  mobileNumber: string;
  locale?: "ar" | "en";
  request?: NextRequest;
}): Promise<{ challengeId: string; expiresAt: string; deliveryStatus: "sent" | "failed"; fallbackMode: boolean; maskedPhone: string }> {
  const context = await getSigningTokenContext(args.token);
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
    phoneNumber: mobile,
    maskedPhone: maskPhone(mobile),
    expiresAt,
    sessionId: context.sessionId,
    documentId: context.documentId,
    moduleType: context.moduleType,
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

  if (isTaqnyatReady()) {
    const sendResult = await sendTaqnyatMessage({ recipient: mobile, message });
    deliveryStatus = sendResult.ok ? "sent" : "failed";
    statusCode = sendResult.statusCode;
    providerResponse = sendResult.response;
    failureReason = sendResult.ok ? null : "TAQNYAT_DELIVERY_FAILED";
  } else {
    failureReason = "TAQNYAT_NOT_CONFIGURED";
  }

  await insertOtpEvent(OTP_REQUESTED_EVENT, payload, false);

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
    },
    request: args.request,
  });

  await recordSmsAuditAttempt({
    tenantId: context.tenantId,
    recipient: mobile,
    status: deliveryStatus,
    statusCode,
    failureReason,
    notificationType: "secure_signing_otp",
    metadata: {
      challengeId,
      sessionId: context.sessionId,
      documentId: context.documentId,
      moduleType: context.moduleType,
      providerResponse,
    },
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
}): Promise<{ verified: boolean; redirectPath: string; moduleType: string; documentId: string; attemptsRemaining: number }> {
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
    await insertOtpEvent(OTP_VERIFY_FAILED_EVENT, {
      challengeId: active.payload.challengeId,
      tokenHash: active.payload.tokenHash,
      sessionId: context.sessionId,
      documentId: context.documentId,
      moduleType: context.moduleType,
    }, true);

    const latestAttempts = await getFailedAttemptCount(active.payload.challengeId);
    return {
      verified: false,
      redirectPath: context.redirectPath,
      moduleType: context.moduleType,
      documentId: context.documentId,
      attemptsRemaining: Math.max(0, OTP_MAX_ATTEMPTS - latestAttempts),
    };
  }

  await markOtpChallengeProcessed(active.rowId);
  await insertOtpEvent(OTP_VERIFIED_EVENT, {
    challengeId: active.payload.challengeId,
    tokenHash: active.payload.tokenHash,
    sessionId: context.sessionId,
    documentId: context.documentId,
    moduleType: context.moduleType,
    verifiedAt: new Date().toISOString(),
  }, true);

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
  });

  return {
    verified: true,
    redirectPath: context.redirectPath,
    moduleType: context.moduleType,
    documentId: context.documentId,
    attemptsRemaining: OTP_MAX_ATTEMPTS,
  };
}
