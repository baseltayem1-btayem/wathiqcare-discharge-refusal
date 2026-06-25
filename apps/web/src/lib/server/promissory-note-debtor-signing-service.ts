import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { appendAuditChainEvent } from "@/lib/server/audit-chain-service";
import { writeAuditLog } from "@/lib/server/saas-services";
import { sendTaqnyatMessage, isTaqnyatReady } from "@/services/sms/taqnyatClient";
import { recordSmsAuditAttempt } from "@/services/sms/smsAuditService";
import {
  buildPromissoryNoteSigningLinkSms,
  buildPromissoryNoteSigningOtpSms,
} from "@/services/sms/smsTemplates";

const prisma = () => getPrisma();

const OTP_EXPIRES_MINUTES = 15;
const SIGNING_LINK_EXPIRES_MINUTES = 30;
const MAX_OTP_ATTEMPTS = 5;

type JsonRecord = Record<string, unknown>;

type StartDebtorSigningPayload = {
  debtorMobile?: string;
  locale?: "ar" | "en";
};

type DebtorSigningState = {
  tokenHash: string;
  otpHash: string;
  debtorMobile: string;
  status: "PENDING_OTP" | "OTP_VERIFIED" | "SIGNED" | "EXPIRED" | "FAILED";
  expiresAt: string;
  attempts: number;
  linkSentAt?: string;
  otpSentAt?: string;
  otpVerifiedAt?: string;
  signedAt?: string;
  linkSmsStatus?: "sent" | "failed";
  otpSmsStatus?: "sent" | "failed";
  linkSmsProviderMessageId?: string | null;
  otpSmsProviderMessageId?: string | null;
  lastFailureReason?: string | null;
  signedIpAddress?: string | null;
  signedUserAgent?: string | null;
};

function requireTenantId(auth: AuthContext): string {
  if (!auth.tenant_id) {
    throw new ApiError(403, "Tenant context is required");
  }
  return auth.tenant_id;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generateOtp(): string {
  return String(crypto.randomInt(100000, 1000000));
}

function normalizeSaudiMobile(value: string | undefined): string {
  const raw = (value || "").replace(/[^\d+]/g, "");

  if (/^05\d{8}$/.test(raw)) {
    return `966${raw.slice(1)}`;
  }

  if (/^5\d{8}$/.test(raw)) {
    return `966${raw}`;
  }

  if (/^9665\d{8}$/.test(raw)) {
    return raw;
  }

  if (/^\+9665\d{8}$/.test(raw)) {
    return raw.slice(1);
  }

  throw new ApiError(400, "Valid Saudi debtor mobile number is required");
}

function getRequestBaseUrl(request: NextRequest): string {
  const origin = request.headers.get("origin");
  if (origin) return origin;

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") || "https";
    return `${proto}://${host}`;
  }

  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_PUBLIC_URL ||
    "https://wathiqcare.online"
  ).replace(/\/$/, "");
}

function getClientIp(request: NextRequest): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

function getUserAgent(request: NextRequest): string | null {
  return request.headers.get("user-agent");
}

function getDebtorSigning(metadata: unknown): DebtorSigningState | null {
  const record = asRecord(metadata);
  const signing = asRecord(record.debtorSigning);

  const tokenHash = getString(signing.tokenHash);
  const otpHash = getString(signing.otpHash);
  const debtorMobile = getString(signing.debtorMobile);
  const status = getString(signing.status);

  if (!tokenHash || !otpHash || !debtorMobile || !status) {
    return null;
  }

  return {
    tokenHash,
    otpHash,
    debtorMobile,
    status: status as DebtorSigningState["status"],
    expiresAt: getString(signing.expiresAt) || new Date(0).toISOString(),
    attempts:
      typeof signing.attempts === "number" && Number.isFinite(signing.attempts)
        ? signing.attempts
        : 0,
    linkSentAt: getString(signing.linkSentAt) || undefined,
    otpSentAt: getString(signing.otpSentAt) || undefined,
    otpVerifiedAt: getString(signing.otpVerifiedAt) || undefined,
    signedAt: getString(signing.signedAt) || undefined,
    linkSmsStatus: signing.linkSmsStatus === "sent" ? "sent" : signing.linkSmsStatus === "failed" ? "failed" : undefined,
    otpSmsStatus: signing.otpSmsStatus === "sent" ? "sent" : signing.otpSmsStatus === "failed" ? "failed" : undefined,
    linkSmsProviderMessageId: getString(signing.linkSmsProviderMessageId),
    otpSmsProviderMessageId: getString(signing.otpSmsProviderMessageId),
    lastFailureReason: getString(signing.lastFailureReason),
    signedIpAddress: getString(signing.signedIpAddress),
    signedUserAgent: getString(signing.signedUserAgent),
  };
}

function mergeDebtorSigningMetadata(
  existingMetadata: unknown,
  signing: DebtorSigningState,
): Prisma.InputJsonValue {
  return {
    ...asRecord(existingMetadata),
    debtorSigning: signing,
  } as Prisma.InputJsonValue;
}

async function findPromissoryNoteByToken(token: string) {
  const tokenHash = sha256(token);
  const rows = await prisma().$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM promissory_notes
    WHERE metadata -> 'debtorSigning' ->> 'tokenHash' = ${tokenHash}
    LIMIT 1
  `;

  const id = rows[0]?.id;
  if (!id) return null;

  return prisma().promissoryNote.findUnique({
    where: { id },
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
  });
}

function assertNotExpired(signing: DebtorSigningState): void {
  if (Date.now() > new Date(signing.expiresAt).getTime()) {
    throw new ApiError(410, "Signing session expired");
  }
}

export async function startPromissoryDebtorSigning(
  auth: AuthContext,
  noteId: string,
  payload: StartDebtorSigningPayload,
  request: NextRequest,
) {
  const tenantId = requireTenantId(auth);
  const debtorMobile = normalizeSaudiMobile(payload.debtorMobile);
  const locale = payload.locale ?? "ar";

  const note = await prisma().promissoryNote.findFirst({
    where: { id: noteId, tenantId },
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
  });

  if (!note) {
    throw new ApiError(404, "Promissory note not found");
  }

  const token = generateToken();
  const otpCode = generateOtp();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SIGNING_LINK_EXPIRES_MINUTES * 60 * 1000);
  const signingUrl = `${getRequestBaseUrl(request)}/public-signing/promissory-note/${token}`;

  const linkMessage = buildPromissoryNoteSigningLinkSms({
    signingUrl,
    noteNumber: note.noteNumber,
    expiresMinutes: SIGNING_LINK_EXPIRES_MINUTES,
    locale,
  });

  const otpMessage = buildPromissoryNoteSigningOtpSms({
    otpCode,
    noteNumber: note.noteNumber,
    expiresMinutes: OTP_EXPIRES_MINUTES,
    locale,
  });

  const linkResult = isTaqnyatReady()
    ? await sendTaqnyatMessage({ recipient: debtorMobile, message: linkMessage })
    : {
        ok: false,
        statusCode: 503,
        providerMessageId: null,
        response: { code: "TAQNYAT_NOT_CONFIGURED" },
      };

  await recordSmsAuditAttempt({
    tenantId,
    caseId: note.caseId,
    recipient: debtorMobile,
    status: linkResult.ok ? "sent" : "failed",
    statusCode: linkResult.statusCode,
    failureReason: linkResult.ok ? null : "PROMISSORY_SIGNING_LINK_SMS_FAILED",
    notificationType: "promissory_note_signing_link",
    metadata: {
      promissoryNoteId: note.id,
      noteNumber: note.noteNumber,
      providerMessageId: linkResult.providerMessageId,
      providerResponse: linkResult.response,
    },
  });

  const otpResult = isTaqnyatReady()
    ? await sendTaqnyatMessage({ recipient: debtorMobile, message: otpMessage })
    : {
        ok: false,
        statusCode: 503,
        providerMessageId: null,
        response: { code: "TAQNYAT_NOT_CONFIGURED" },
      };

  await recordSmsAuditAttempt({
    tenantId,
    caseId: note.caseId,
    recipient: debtorMobile,
    status: otpResult.ok ? "sent" : "failed",
    statusCode: otpResult.statusCode,
    failureReason: otpResult.ok ? null : "PROMISSORY_SIGNING_OTP_SMS_FAILED",
    notificationType: "promissory_note_signing_otp",
    metadata: {
      promissoryNoteId: note.id,
      noteNumber: note.noteNumber,
      providerMessageId: otpResult.providerMessageId,
      providerResponse: otpResult.response,
    },
  });

  const signing: DebtorSigningState = {
    tokenHash: sha256(token),
    otpHash: sha256(otpCode),
    debtorMobile,
    status: linkResult.ok || otpResult.ok ? "PENDING_OTP" : "FAILED",
    expiresAt: expiresAt.toISOString(),
    attempts: 0,
    linkSentAt: now.toISOString(),
    otpSentAt: now.toISOString(),
    linkSmsStatus: linkResult.ok ? "sent" : "failed",
    otpSmsStatus: otpResult.ok ? "sent" : "failed",
    linkSmsProviderMessageId: linkResult.providerMessageId,
    otpSmsProviderMessageId: otpResult.providerMessageId,
    lastFailureReason:
      linkResult.ok && otpResult.ok
        ? null
        : "One or more promissory signing SMS messages failed",
  };

  await prisma().promissoryNote.update({
    where: { id: note.id },
    data: {
      metadata: mergeDebtorSigningMetadata(note.metadata, signing),
    },
  });

  await writeAuditLog({
    tenantId,
    userId: auth.sub,
    entityType: "promissory_note",
    entityId: note.id,
    action: "promissory_note_debtor_signing_started",
    details: `Debtor signing session started for promissory note ${note.noteNumber}`,
    caseId: note.caseId,
    metadataJson: {
      debtorMobile,
      linkSmsStatus: signing.linkSmsStatus,
      otpSmsStatus: signing.otpSmsStatus,
      expiresAt: signing.expiresAt,
    },
    request,
  });

  await appendAuditChainEvent({
    tenantId,
    caseId: note.caseId,
    eventType: "PROMISSORY_NOTE_DEBTOR_SIGNING_STARTED",
    actorId: auth.sub,
    actorRole: auth.role ?? null,
    payloadSummary: `Debtor signing started for promissory note ${note.noteNumber}`,
    documentVersion: note.documentVersion,
    metadataJson: {
      promissoryNoteId: note.id,
      noteNumber: note.noteNumber,
      debtorMobile,
      linkSmsStatus: signing.linkSmsStatus,
      otpSmsStatus: signing.otpSmsStatus,
    },
    request,
  }).catch(() => undefined);

  return {
    promissoryNoteId: note.id,
    noteNumber: note.noteNumber,
    signingUrl,
    status: signing.status,
    linkSmsStatus: signing.linkSmsStatus,
    otpSmsStatus: signing.otpSmsStatus,
    expiresAt: signing.expiresAt,
  };
}

export async function getPromissoryDebtorSigningPreview(token: string) {
  const note = await findPromissoryNoteByToken(token);

  if (!note) {
    throw new ApiError(404, "Signing session not found");
  }

  const signing = getDebtorSigning(note.metadata);
  if (!signing) {
    throw new ApiError(404, "Signing session not found");
  }

  return {
    noteNumber: note.noteNumber,
    debtorName: note.debtorName,
    debtorIdNumber: note.debtorIdNumber,
    amount: note.amount.toString(),
    currency: note.currency,
    dueDate: note.dueDate.toISOString(),
    status: signing.status,
    expiresAt: signing.expiresAt,
    otpVerified: signing.status === "OTP_VERIFIED" || signing.status === "SIGNED",
    signed: signing.status === "SIGNED",
  };
}

export async function verifyPromissoryDebtorOtp(
  token: string,
  otpCode: string,
  request: NextRequest,
) {
  const note = await findPromissoryNoteByToken(token);

  if (!note) {
    throw new ApiError(404, "Signing session not found");
  }

  const signing = getDebtorSigning(note.metadata);
  if (!signing) {
    throw new ApiError(404, "Signing session not found");
  }

  assertNotExpired(signing);

  if (signing.status === "SIGNED") {
    throw new ApiError(409, "Promissory note already signed");
  }

  if (signing.attempts >= MAX_OTP_ATTEMPTS) {
    const blocked: DebtorSigningState = {
      ...signing,
      status: "FAILED",
      lastFailureReason: "Maximum OTP attempts exceeded",
    };

    await prisma().promissoryNote.update({
      where: { id: note.id },
      data: { metadata: mergeDebtorSigningMetadata(note.metadata, blocked) },
    });

    throw new ApiError(429, "Maximum OTP attempts exceeded");
  }

  const verified = sha256(otpCode.trim()) === signing.otpHash;
  const nextSigning: DebtorSigningState = {
    ...signing,
    attempts: signing.attempts + 1,
    status: verified ? "OTP_VERIFIED" : signing.status,
    otpVerifiedAt: verified ? new Date().toISOString() : signing.otpVerifiedAt,
    lastFailureReason: verified ? null : "Invalid OTP",
  };

  await prisma().promissoryNote.update({
    where: { id: note.id },
    data: {
      metadata: mergeDebtorSigningMetadata(note.metadata, nextSigning),
    },
  });

  await appendAuditChainEvent({
    tenantId: note.tenantId,
    caseId: note.caseId,
    eventType: verified ? "PROMISSORY_NOTE_DEBTOR_OTP_VERIFIED" : "PROMISSORY_NOTE_DEBTOR_OTP_FAILED",
    actorId: null,
    actorRole: "DEBTOR",
    sourceIp: getClientIp(request),
    deviceInfo: getUserAgent(request),
    payloadSummary: verified
      ? `Debtor OTP verified for promissory note ${note.noteNumber}`
      : `Debtor OTP failed for promissory note ${note.noteNumber}`,
    documentVersion: note.documentVersion,
    metadataJson: {
      promissoryNoteId: note.id,
      noteNumber: note.noteNumber,
      attempts: nextSigning.attempts,
    },
    request,
  }).catch(() => undefined);

  if (!verified) {
    throw new ApiError(400, "Invalid OTP");
  }

  return { ok: true, status: nextSigning.status };
}

export async function signPromissoryNoteByDebtor(
  token: string,
  request: NextRequest,
) {
  const note = await findPromissoryNoteByToken(token);

  if (!note) {
    throw new ApiError(404, "Signing session not found");
  }

  const signing = getDebtorSigning(note.metadata);
  if (!signing) {
    throw new ApiError(404, "Signing session not found");
  }

  assertNotExpired(signing);

  if (signing.status === "SIGNED") {
    return { ok: true, status: "SIGNED", signedAt: signing.signedAt };
  }

  if (signing.status !== "OTP_VERIFIED") {
    throw new ApiError(403, "OTP verification required before signing");
  }

  const signedAt = new Date();
  const nextSigning: DebtorSigningState = {
    ...signing,
    status: "SIGNED",
    signedAt: signedAt.toISOString(),
    signedIpAddress: getClientIp(request),
    signedUserAgent: getUserAgent(request),
    lastFailureReason: null,
  };

  await prisma().promissoryNote.update({
    where: { id: note.id },
    data: {
      signedAt,
      metadata: mergeDebtorSigningMetadata(note.metadata, nextSigning),
    },
  });

  await appendAuditChainEvent({
    tenantId: note.tenantId,
    caseId: note.caseId,
    eventType: "PROMISSORY_NOTE_DEBTOR_SIGNED",
    actorId: null,
    actorRole: "DEBTOR",
    sourceIp: getClientIp(request),
    deviceInfo: getUserAgent(request),
    payloadSummary: `Promissory note signed by debtor (${note.noteNumber})`,
    documentVersion: note.documentVersion,
    metadataJson: {
      promissoryNoteId: note.id,
      noteNumber: note.noteNumber,
      debtorMobile: signing.debtorMobile,
      signedAt: signedAt.toISOString(),
    },
    request,
  }).catch(() => undefined);

  return { ok: true, status: "SIGNED", signedAt: signedAt.toISOString() };
}
