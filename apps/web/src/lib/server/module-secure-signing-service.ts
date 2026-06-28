import crypto from "node:crypto";
import { createSigningSession } from "@/lib/server/signature-orchestration-service";
import { sendSecureSigningLinkEmail } from "@/lib/server/pilot-email-override";
import { getPrisma } from "@/lib/server/prisma";
import { appendAuditChainEvent } from "@/lib/server/audit-chain-service";
import { ApiError } from "@/lib/server/http";
import { buildSecureSigningLinkSms } from "@/services/sms/smsTemplates";
import { isTaqnyatReady, sendTaqnyatMessage } from "@/services/sms/taqnyatClient";
import { recordSmsAuditAttempt } from "@/services/sms/smsAuditService";
import { logRuntimeIncident } from "@/lib/server/runtime-observability";

const prisma = () => getPrisma();

const OTP_PROVIDER_KEY = "public_signing_otp";
const OTP_REQUESTED_EVENT = "OTP_REQUESTED";
const OTP_VERIFIED_EVENT = "OTP_VERIFIED";
const OTP_VERIFY_FAILED_EVENT = "OTP_VERIFY_FAILED";

const OTP_MAX_ATTEMPTS = 3;

export type SecureSigningBadgeFlags = {
  linkCreated: boolean;
  smsSent: boolean;
  opened: boolean;
  otpRequested: boolean;
  otpVerified: boolean;
  signed: boolean;
  expired: boolean;
  revoked: boolean;
  failed: boolean;
  failedAttempts: number;
};

export type SecureSigningWorkflow = {
  sessionId: string;
  moduleKey: "discharge_refusal" | "informed_consent" | "legal_evidence";
  documentId: string;
  tokenHash: string;
  signingUrl: string;
  recipientMobile: string;
  recipientEmail?: string;
  smsDeliveryStatus: "sent" | "failed";
  smsFailureReason: string | null;
  emailDeliveryStatus?: "sent" | "failed";
  emailFailureReason?: string | null;
  createdAt: string;
  updatedAt: string;
  status: SecureSigningBadgeFlags;
};

type TokenRow = {
  expires_at: Date | string;
  used_at: Date | string | null;
  revoked_at: Date | string | null;
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

function extractToken(signingUrl: string): string {
  const url = new URL(signingUrl);
  const parts = url.pathname.split("/").filter(Boolean);
  return decodeURIComponent(parts[parts.length - 1] || "");
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildPdfBuffer(title: string, lines: string[]): Buffer {
  const safeTitle = (title || "WathiqCare Secure Signing Document").replace(/[()\\]/g, "");
  const safeLines = lines.map((line) => (line || "").replace(/[()\\]/g, ""));
  const textBlock = [safeTitle, ...safeLines].slice(0, 16);

  const content = [
    "BT",
    "/F1 16 Tf",
    "72 770 Td",
    `(${safeTitle}) Tj`,
    "/F1 11 Tf",
    ...textBlock.map((line, index) => `${72 + index * 0} ${740 - index * 20} Td (${line}) Tj`),
    "ET",
  ].join("\n");

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj",
    `4 0 obj\n<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream\nendobj`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
  ];

  let cursor = 9;
  const offsets = [0];
  const body = objects
    .map((obj) => {
      offsets.push(cursor);
      cursor += Buffer.byteLength(`${obj}\n`, "utf8");
      return `${obj}\n`;
    })
    .join("");

  const xrefOffset = cursor;
  const xref = [
    `xref\n0 ${offsets.length}`,
    "0000000000 65535 f ",
    ...offsets.slice(1).map((offset) => `${offset.toString().padStart(10, "0")} 00000 n `),
    "trailer\n<< /Size 6 /Root 1 0 R >>",
    `startxref\n${xrefOffset}`,
    "%%EOF",
  ].join("\n");

  return Buffer.from(`%PDF-1.4\n${body}${xref}`, "utf8");
}

function buildSigningUrlFromToken(token: string): string {
  const encoded = encodeURIComponent(token);
  const configured = process.env.SECURE_SIGNING_BASE_URL?.trim();
  if (configured) {
    const base = configured.replace(/\/$/, "");
    if (base.endsWith("/sign")) {
      return `${base}/${encoded}/workflow`;
    }
    return `${base}/sign/${encoded}/workflow`;
  }

  const fallbackBase = (
    process.env.NEXT_PUBLIC_APP_BASE_URL?.trim()
    || process.env.NEXT_PUBLIC_APP_URL?.trim()
    || process.env.APP_BASE_URL?.trim()
    || "https://wathiqcare.online"
  ).replace(/\/$/, "");

  return `${fallbackBase}/sign/${encoded}/workflow`;
}

export function deriveSecureSigningBadgeFlags(input: {
  tokenFound: boolean;
  tokenExpired: boolean;
  tokenUsed: boolean;
  tokenRevoked: boolean;
  otpRequestedCount: number;
  otpVerifiedCount: number;
  otpFailedCount: number;
  smsSent: boolean;
  smsFailed: boolean;
}): SecureSigningBadgeFlags {
  const otpRequested = input.otpRequestedCount > 0;
  const otpVerified = input.otpVerifiedCount > 0;
  const failedAttempts = Math.max(0, input.otpFailedCount);
  const failed = input.smsFailed || failedAttempts >= OTP_MAX_ATTEMPTS;

  return {
    linkCreated: input.tokenFound,
    smsSent: input.smsSent,
    opened: otpRequested,
    otpRequested,
    otpVerified,
    signed: input.tokenUsed,
    expired: input.tokenExpired,
    revoked: input.tokenRevoked,
    failed,
    failedAttempts,
  };
}

async function loadBadgeFlags(args: {
  sessionId: string;
  tokenHash: string;
  tenantId: string;
  smsDeliveryStatus: "sent" | "failed";
}): Promise<SecureSigningBadgeFlags> {
  const tokenRows = await prisma().$queryRawUnsafe<TokenRow[]>(
    `SELECT expires_at, used_at, revoked_at
     FROM signing_secure_tokens
     WHERE session_id = $1::uuid
     ORDER BY created_at DESC
     LIMIT 1`,
    args.sessionId,
  );

  const token = tokenRows[0];
  const expiresAt = toDate(token?.expires_at);
  const revokedAt = toDate(token?.revoked_at);

  const otpRows = await prisma().$queryRawUnsafe<Array<{ event_type: string; count: number }>>(
    `SELECT event_type, COUNT(*)::int AS count
     FROM webhook_events
     WHERE provider_key = $1
       AND raw_payload ->> 'tokenHash' = $2
       AND event_type IN ($3, $4, $5)
     GROUP BY event_type`,
    OTP_PROVIDER_KEY,
    args.tokenHash,
    OTP_REQUESTED_EVENT,
    OTP_VERIFIED_EVENT,
    OTP_VERIFY_FAILED_EVENT,
  );

  let requested = 0;
  let verified = 0;
  let failed = 0;

  for (const row of otpRows) {
    if (row.event_type === OTP_REQUESTED_EVENT) requested = Number(row.count || 0);
    if (row.event_type === OTP_VERIFIED_EVENT) verified = Number(row.count || 0);
    if (row.event_type === OTP_VERIFY_FAILED_EVENT) failed = Number(row.count || 0);
  }

  return deriveSecureSigningBadgeFlags({
    tokenFound: Boolean(token),
    tokenExpired: Boolean(expiresAt && expiresAt.getTime() <= Date.now()),
    tokenUsed: Boolean(token?.used_at),
    tokenRevoked: Boolean(revokedAt),
    otpRequestedCount: requested,
    otpVerifiedCount: verified,
    otpFailedCount: failed,
    smsSent: args.smsDeliveryStatus === "sent",
    smsFailed: args.smsDeliveryStatus === "failed",
  });
}

export async function sendModuleSecureSigningLink(args: {
  tenantId: string;
  initiatedBy: string;
  moduleKey: "discharge_refusal" | "informed_consent" | "legal_evidence";
  moduleType: "discharge_refusal" | "informed_consent" | "promissory_note";
  documentId: string;
  caseId: string;
  patientName: string;
  mobileNumber: string;
  recipientEmail: string;
  locale?: "ar" | "en";
}): Promise<SecureSigningWorkflow> {
  const normalizedMobile = normalizePhoneNumber(args.mobileNumber);
  const normalizedRecipientEmail = normalizeRecipientEmail(args.recipientEmail);

  if (!isValidRecipientEmail(normalizedRecipientEmail)) {
    throw new ApiError(400, "Invalid email address");
  }

  const pdfBytes = buildPdfBuffer("WathiqCare Secure Signing", [
    `Module: ${args.moduleKey}`,
    `Case: ${args.caseId}`,
    `Document: ${args.documentId}`,
    `Patient: ${args.patientName}`,
    `Generated At: ${new Date().toISOString()}`,
  ]);

  const session = await createSigningSession({
    tenantId: args.tenantId,
    documentId: args.documentId,
    moduleType: args.moduleType,
    initiatedBy: args.initiatedBy,
    pdfBytes,
    signers: [
      {
        role: "PATIENT",
        name: args.patientName || "Patient",
        mobile: normalizedMobile || undefined,
      },
    ],
    expiryHours: Math.max(1, Math.ceil(Number(process.env.SIGNING_LINK_EXPIRY_MINUTES || "30") / 60)),
  });

  const token = extractToken(session.signerLinks.PATIENT);
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const signingUrl = buildSigningUrlFromToken(token);
  const now = new Date().toISOString();

  let smsDeliveryStatus: "sent" | "failed" = "failed";
  let smsFailureReason: string | null = null;
  let statusCode: number | null = null;
  let providerResponse: Record<string, unknown> | null = null;

  if (normalizedMobile && isTaqnyatReady()) {
    const sms = await sendTaqnyatMessage({
      recipient: normalizedMobile,
      message: buildSecureSigningLinkSms({
        signingUrl,
        expiresMinutes: Number(process.env.SIGNING_LINK_EXPIRY_MINUTES || "30"),
        locale: args.locale,
      }),
    });

    smsDeliveryStatus = sms.ok ? "sent" : "failed";
    smsFailureReason = sms.ok ? null : "TAQNYAT_DELIVERY_FAILED";
    statusCode = sms.statusCode;
    providerResponse = sms.response;
  } else {
    smsFailureReason = normalizedMobile ? "TAQNYAT_NOT_CONFIGURED" : "MOBILE_NOT_AVAILABLE";
  }

  await recordSmsAuditAttempt({
    tenantId: args.tenantId,
    recipient: normalizedMobile || "unknown",
    status: smsDeliveryStatus,
    statusCode,
    failureReason: smsFailureReason,
    notificationType: "secure_signing_link",
    metadata: {
      moduleKey: args.moduleKey,
      caseId: args.caseId,
      documentId: args.documentId,
      sessionId: session.sessionId,
      tokenHash,
      signingUrl,
      providerResponse,
    },
  });

  const secureSigningEmail = await sendSecureSigningLinkEmail({
    tenantId: args.tenantId,
    caseId: args.caseId,
    patientName: args.patientName,
    recipientEmail: normalizedRecipientEmail,
    mobileNumber: normalizedMobile || "unknown",
    signingUrl,
    expiresMinutes: Number(process.env.SIGNING_LINK_EXPIRY_MINUTES || "30"),
    documentId: args.documentId,
    sessionId: session.sessionId,
    moduleKey: args.moduleKey,
    locale: args.locale,
  });

  if (secureSigningEmail.status !== "sent") {
    throw new ApiError(502, secureSigningEmail.failureReason || "Failed to send secure signing link email");
  }

  try {
    await appendAuditChainEvent({
      tenantId: args.tenantId,
      caseId: args.caseId,
      eventType: "SECURE_SIGNING_LINK_CREATED",
      actorId: args.initiatedBy,
      actorRole: "system",
      payloadSummary: `Secure signing link created for ${args.moduleKey}`,
      metadataJson: {
        moduleKey: args.moduleKey,
        documentId: args.documentId,
        sessionId: session.sessionId,
        tokenHash,
        smsDeliveryStatus,
        emailDeliveryStatus: secureSigningEmail.status,
        emailDeliveryAuditId: secureSigningEmail.auditId,
        emailRecipient: secureSigningEmail.recipient,
      },
    });
  } catch (error) {
    logRuntimeIncident({
      module: "secure_signing",
      type: "UNHANDLED_EXCEPTION",
      operation: "sendModuleSecureSigningLink",
      tenantId: args.tenantId,
      error,
      details: { reason: "append_audit_chain_event_failed" },
    });
  }

  const status = await loadBadgeFlags({
    tenantId: args.tenantId,
    sessionId: session.sessionId,
    tokenHash,
    smsDeliveryStatus,
  });

  return {
    sessionId: session.sessionId,
    moduleKey: args.moduleKey,
    documentId: args.documentId,
    tokenHash,
    signingUrl,
    recipientMobile: normalizedMobile,
    recipientEmail: normalizedRecipientEmail,
    smsDeliveryStatus,
    smsFailureReason,
    emailDeliveryStatus: secureSigningEmail.status,
    emailFailureReason: secureSigningEmail.failureReason,
    createdAt: now,
    updatedAt: now,
    status,
  };
}


export async function revokeModuleSecureSigningForDocument(args: {
  tenantId: string;
  documentId: string;
  revokedBy: string;
  reason?: string;
}) {
  const now = new Date();

  const sessions = await prisma().$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id
     FROM signing_sessions
     WHERE tenant_id = $1
       AND document_id = $2
       AND revoked_at IS NULL
       AND (status IS NULL OR status NOT IN ('REVOKED', 'SIGNED', 'COMPLETED'))`,
    args.tenantId,
    args.documentId,
  );

  const sessionIds = sessions.map((item) => item.id);

  if (sessionIds.length > 0) {
    await prisma().$executeRawUnsafe(
      `UPDATE signing_sessions
       SET revoked_at = $1,
           status = 'REVOKED',
           metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
             'revokedBy', $2::text,
             'revocationReason', $3::text,
             'revokedAt', $1::text
           )
       WHERE id = ANY($4::uuid[])`,
      now,
      args.revokedBy,
      args.reason || "Revoked from informed consent status tracking",
      sessionIds,
    );

    await prisma().$executeRawUnsafe(
      `UPDATE signing_secure_tokens
       SET revoked_at = $1
       WHERE session_id = ANY($2::uuid[])
         AND used_at IS NULL
         AND revoked_at IS NULL`,
      now,
      sessionIds,
    );
  }

  return {
    revokedAt: now.toISOString(),
    revokedSessions: sessionIds.length,
    documentId: args.documentId,
  };
}

export async function refreshModuleSecureSigningStatus(args: {
  tenantId: string;
  workflow: SecureSigningWorkflow;
}): Promise<SecureSigningWorkflow> {
  const status = await loadBadgeFlags({
    tenantId: args.tenantId,
    sessionId: args.workflow.sessionId,
    tokenHash: args.workflow.tokenHash,
    smsDeliveryStatus: args.workflow.smsDeliveryStatus,
  });

  return {
    ...args.workflow,
    status,
    updatedAt: new Date().toISOString(),
  };
}