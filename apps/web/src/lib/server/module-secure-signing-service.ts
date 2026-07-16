import crypto from "node:crypto";
import { Prisma, PatientMessageChannel, PatientMessageStatus } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { createSigningSessionIdempotent } from "@/lib/server/signing-session-service";
import { getPrisma } from "@/lib/server/prisma";
import { appendAuditChainEvent } from "@/lib/server/audit-chain-service";
import { ApiError } from "@/lib/server/http";
import { logRuntimeIncident } from "@/lib/server/runtime-observability";
import {
  deriveRootOperationKey,
  deriveChildIdempotencyKey,
  computePayloadFingerprint,
  hashRecipient,
  validateIdempotencyKey,
} from "@/lib/server/idempotency-core";
import {
  generateGovernedPatientCopy,
  isAcroFormBackedPatientCopy,
  type ConsentDocumentForPatientCopy,
} from "@/lib/server/acroform/patient-copy-dispatch-service";

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

export type SafeSecureSigningWorkflow = {
  sessionId: string;
  moduleKey:
    | "discharge_refusal"
    | "informed_consent"
    | "legal_evidence"
    | "promissory_note";
  documentId: string;
  expiresAt: string;
  smsDispatchId: string;
  emailDispatchId: string;
  dispatchStatuses: {
    sms: PatientMessageStatus;
    email: PatientMessageStatus;
  };
  createdAt: string;
  updatedAt: string;
  status: SecureSigningBadgeFlags;
};

/**
 * @deprecated Use SafeSecureSigningWorkflow. Sensitive fields are intentionally
 * redacted from production responses; this type is kept for compatibility with
 * legacy callers while migration is in progress.
 */
export type SecureSigningWorkflow = SafeSecureSigningWorkflow & {
  tokenHash?: string;
  signingUrl?: string;
  recipientMobile?: string;
  recipientEmail?: string;
  smsDeliveryStatus?: "sent" | "failed";
  smsFailureReason?: string | null;
  emailDeliveryStatus?: "sent" | "failed";
  emailDeliveryReason?: string | null;
};

export type SendModuleSecureSigningLinkResult = SafeSecureSigningWorkflow &
  Partial<
    Pick<
      SecureSigningWorkflow,
      | "smsDeliveryStatus"
      | "smsFailureReason"
      | "emailDeliveryStatus"
      | "emailDeliveryReason"
    >
  >;

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

function envBool(value: string | undefined): boolean {
  return /^(true|1|yes)$/i.test(value ?? "");
}

export function isPreviewOtpInspectionEnabled(): boolean {
  return (
    process.env.VERCEL_ENV === "preview" &&
    envBool(process.env.ENABLE_IMC_PILOT_PATIENTS)
  );
}

function parseRecord(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function deriveOtpCodeFromHash(expectedHash: string): string | null {
  const pepper = process.env.PUBLIC_SIGNING_OTP_PEPPER?.trim();
  if (!pepper) {
    throw new ApiError(500, "Preview OTP inspector is unavailable");
  }

  for (let otp = 0; otp < 1_000_000; otp += 1) {
    const candidate = otp.toString().padStart(6, "0");
    const candidateHash = crypto.createHmac("sha256", pepper).update(candidate).digest("hex");
    if (candidateHash === expectedHash) {
      return candidate;
    }
  }

  return null;
}

function isValidRecipientEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
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

export function isDispatchConsideredSent(
  status: PatientMessageStatus | undefined,
): boolean {
  return (
    status === PatientMessageStatus.ACCEPTED ||
    status === PatientMessageStatus.SENT ||
    status === PatientMessageStatus.DELIVERED
  );
}

export function toLegacyDeliveryStatus(
  status: PatientMessageStatus | undefined,
): "sent" | "failed" | undefined {
  if (isDispatchConsideredSent(status)) return "sent";
  if (
    status === PatientMessageStatus.FAILED ||
    status === PatientMessageStatus.PERMANENT_FAILURE
  ) {
    return "failed";
  }
  // PENDING and CLAIMED are queued, not sent or failed.
  return undefined;
}

async function loadBadgeFlags(args: {
  sessionId: string;
  tenantId: string;
  smsStatus: PatientMessageStatus | undefined;
  client?: PrismaClient;
}): Promise<SecureSigningBadgeFlags> {
  const db = args.client ?? prisma();
  const token = await db.signingSecureToken.findFirst({
    where: {
      sessionId: args.sessionId,
      tenantId: args.tenantId,
      signerRole: "PATIENT",
    },
    orderBy: { createdAt: "desc" },
  });

  const expiresAt = toDate(token?.expiresAt);
  const revokedAt = toDate(token?.revokedAt);

  const otpRows = await db.$queryRaw<Array<{ event_type: string; count: number }>>(
    Prisma.sql`SELECT event_type, COUNT(*)::int AS count
     FROM webhook_events
     WHERE provider_key = ${OTP_PROVIDER_KEY}
       AND raw_payload ->> 'tokenHash' = ${token?.tokenHash ?? ""}
       AND event_type IN (${OTP_REQUESTED_EVENT}, ${OTP_VERIFIED_EVENT}, ${OTP_VERIFY_FAILED_EVENT})
     GROUP BY event_type`,
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
    tokenUsed: Boolean(token?.usedAt),
    tokenRevoked: Boolean(revokedAt),
    otpRequestedCount: requested,
    otpVerifiedCount: verified,
    otpFailedCount: failed,
    smsSent: isDispatchConsideredSent(args.smsStatus),
    smsFailed: args.smsStatus === PatientMessageStatus.PERMANENT_FAILURE,
  });
}

export type SendModuleSecureSigningLinkOptions = {
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
  baseUrl?: string;
  explicitResend?: boolean;
  resendRequestKey?: string;
  idempotencyKey?: string;
  client?: PrismaClient;
  approvedConsentFormKey?: string;
  approvedTemplateVersionId?: string;
  immutablePdfHash?: string;
};

function normalizeSendOptions(args: SendModuleSecureSigningLinkOptions): {
  normalizedMobile: string;
  normalizedEmail: string;
} {
  return {
    normalizedMobile: normalizePhoneNumber(args.mobileNumber),
    normalizedEmail: normalizeRecipientEmail(args.recipientEmail),
  };
}

function buildSendPayloadFingerprint(args: SendModuleSecureSigningLinkOptions): string {
  const { normalizedMobile, normalizedEmail } = normalizeSendOptions(args);

  return computePayloadFingerprint({
    tenantId: args.tenantId,
    caseId: args.caseId,
    documentId: args.documentId,
    approvedConsentFormKey: args.approvedConsentFormKey,
    approvedTemplateVersionId: args.approvedTemplateVersionId,
    immutablePdfHash: args.immutablePdfHash,
    mobileHash: hashRecipient(normalizedMobile, { tenantId: args.tenantId }),
    emailHash: hashRecipient(normalizedEmail, { tenantId: args.tenantId }),
    locale: args.locale || "en",
  });
}

/**
 * Derive a stable canonical root idempotency key from authoritative send values.
 * This lets every active send route obtain the same key for the same medical intent,
 * so retries reuse the session even when the caller does not supply an Idempotency-Key.
 */
function resolveRecord(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Extract a trustworthy approved PDF hash from the consent document.
 * Prefers the first-party column; falls back only to known approved-source
 * metadata fields (immutablePdfHash, checksum, approvedPdfHash, pdfHash).
 */
export function resolveTrustedPdfHash(document: {
  immutablePdfHash?: string | null;
  metadata?: unknown;
}): string | null {
  if (document.immutablePdfHash?.trim()) {
    return document.immutablePdfHash.trim();
  }

  const meta = resolveRecord(document.metadata);
  if (!meta) return null;

  const candidates = [
    meta.immutablePdfHash,
    meta.checksum,
    meta.approvedPdfHash,
    meta.pdfHash,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

export function deriveSendRootOperationKey(args: {
  tenantId: string;
  caseId: string;
  documentId: string;
  approvedConsentFormKey?: string;
  approvedTemplateVersionId?: string;
  immutablePdfHash?: string;
  mobileNumber: string;
  recipientEmail: string;
  locale?: "ar" | "en";
}): string {
  const normalizedMobile = normalizePhoneNumber(args.mobileNumber);
  const normalizedEmail = normalizeRecipientEmail(args.recipientEmail);

  const payloadFingerprint = computePayloadFingerprint({
    tenantId: args.tenantId,
    caseId: args.caseId,
    documentId: args.documentId,
    approvedConsentFormKey: args.approvedConsentFormKey,
    approvedTemplateVersionId: args.approvedTemplateVersionId,
    immutablePdfHash: args.immutablePdfHash,
    mobileHash: hashRecipient(normalizedMobile, { tenantId: args.tenantId }),
    emailHash: hashRecipient(normalizedEmail, { tenantId: args.tenantId }),
    locale: args.locale || "en",
  });

  return deriveRootOperationKey({
    tenantId: args.tenantId,
    encounterId: args.caseId,
    consentFormKey: args.approvedConsentFormKey || "unknown",
    consentFormVersion: args.approvedTemplateVersionId || "unknown",
    payloadFingerprint,
  });
}

export async function sendModuleSecureSigningLink(
  args: SendModuleSecureSigningLinkOptions,
): Promise<SendModuleSecureSigningLinkResult> {
  const { normalizedMobile, normalizedEmail } = normalizeSendOptions(args);

  if (!isValidRecipientEmail(normalizedEmail)) {
    throw new ApiError(400, "Invalid email address");
  }

  const payloadFingerprint = buildSendPayloadFingerprint(args);

  // The canonical server-derived identity is always used as the root for
  // explicit resends so that the resend request key is combined with stable
  // medical intent rather than a client-supplied root key.
  const canonicalRootKey = deriveSendRootOperationKey({
    tenantId: args.tenantId,
    caseId: args.caseId,
    documentId: args.documentId,
    approvedConsentFormKey: args.approvedConsentFormKey,
    approvedTemplateVersionId: args.approvedTemplateVersionId,
    immutablePdfHash: args.immutablePdfHash,
    mobileNumber: args.mobileNumber,
    recipientEmail: args.recipientEmail,
    locale: args.locale,
  });

  let rootKey: string;
  let sessionIdempotencyKey: string;

  if (args.explicitResend) {
    const resendRequestKey = args.resendRequestKey?.trim();
    if (!resendRequestKey) {
      throw new ApiError(400, "Explicit resend requires a resend request key");
    }
    validateIdempotencyKey(resendRequestKey);
    rootKey = canonicalRootKey;
    sessionIdempotencyKey = deriveChildIdempotencyKey(
      `${canonicalRootKey}:resend:${resendRequestKey}`,
      "SIGNING_SESSION_CREATE",
    );
  } else {
    const suppliedKey = args.idempotencyKey?.trim();
    if (suppliedKey) {
      validateIdempotencyKey(suppliedKey);
    }
    rootKey = suppliedKey || canonicalRootKey;
    validateIdempotencyKey(rootKey);
    sessionIdempotencyKey = deriveChildIdempotencyKey(
      rootKey,
      "SIGNING_SESSION_CREATE",
    );
  }

  let pdfBytes: Buffer;
  let sessionMetadataOverride: Record<string, unknown> | undefined;

  if (args.moduleType === "informed_consent") {
    const consentDocument = await prisma().consentDocument.findFirst({
      where: { id: args.documentId, tenantId: args.tenantId },
      select: {
        id: true,
        patientName: true,
        mrn: true,
        dob: true,
        physicianName: true,
        physicianSpecialty: true,
        metadata: true,
      },
    });

    const acroFormDocument: ConsentDocumentForPatientCopy | null = consentDocument
      ? {
          id: consentDocument.id,
          patientName: consentDocument.patientName,
          mrn: consentDocument.mrn,
          dob: consentDocument.dob,
          physicianName: consentDocument.physicianName,
          physicianSpecialty: consentDocument.physicianSpecialty,
          metadata: consentDocument.metadata,
        }
      : null;

    if (acroFormDocument && isAcroFormBackedPatientCopy(acroFormDocument)) {
      const governed = await generateGovernedPatientCopy({ document: acroFormDocument });
      pdfBytes = Buffer.from(governed.bytes);
      sessionMetadataOverride = {
        governedPatientCopy: {
          pdfHash: governed.pdfHash,
          pdfBytesBase64: pdfBytes.toString("base64"),
          fingerprint: governed.fingerprint,
          formId: governed.formId,
          approvedPdfUrl: governed.approvedPdfUrl,
          manifestHash: governed.manifestHash,
          generatedAt: governed.generatedAt,
        },
      };
    } else {
      pdfBytes = buildPdfBuffer("WathiqCare Secure Signing", [
        `Module: ${args.moduleKey}`,
        `Case: ${args.caseId}`,
        `Document: ${args.documentId}`,
        `Patient: ${args.patientName}`,
        `Generated At: ${new Date().toISOString()}`,
      ]);
    }
  } else {
    pdfBytes = buildPdfBuffer("WathiqCare Secure Signing", [
      `Module: ${args.moduleKey}`,
      `Case: ${args.caseId}`,
      `Document: ${args.documentId}`,
      `Patient: ${args.patientName}`,
      `Generated At: ${new Date().toISOString()}`,
    ]);
  }

  const session = await createSigningSessionIdempotent({
    input: {
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
          email: normalizedEmail || undefined,
        },
      ],
      expiryHours: Math.max(
        1,
        Math.ceil(Number(process.env.SIGNING_LINK_EXPIRY_MINUTES || "30") / 60),
      ),
      locale: args.locale,
    },
    idempotencyKey: sessionIdempotencyKey,
    idempotencyFingerprint: payloadFingerprint,
    approvedPdfHash: args.immutablePdfHash,
    explicitResend: args.explicitResend,
    caseId: args.caseId,
    client: args.client,
    metadata: sessionMetadataOverride,
  });

  const smsDispatch = session.dispatches?.find((d) => d.channel === "SMS");
  const emailDispatch = session.dispatches?.find((d) => d.channel === "EMAIL");

  const dispatchStatuses = {
    sms: smsDispatch ? PatientMessageStatus.PENDING : PatientMessageStatus.PERMANENT_FAILURE,
    email: emailDispatch ? PatientMessageStatus.PENDING : PatientMessageStatus.PERMANENT_FAILURE,
  };

  const now = new Date().toISOString();

  try {
    await appendAuditChainEvent({
      tenantId: args.tenantId,
      caseId: args.caseId,
      eventType: "SECURE_SIGNING_LINK_CREATED",
      actorId: args.initiatedBy,
      actorRole: "system",
      payloadSummary: `Secure signing session created for ${args.moduleKey}`,
      metadataJson: {
        moduleKey: args.moduleKey,
        documentId: args.documentId,
        sessionId: session.sessionId,
        mobileHash: hashRecipient(normalizedMobile, { tenantId: args.tenantId }),
        emailHash: hashRecipient(normalizedEmail, { tenantId: args.tenantId }),
        dispatchStatuses,
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

  const smsStatus = smsDispatch?.status;
  const emailStatus = emailDispatch?.status;

  const status = await loadBadgeFlags({
    tenantId: args.tenantId,
    sessionId: session.sessionId,
    smsStatus,
  });

  const smsDeliveryStatus = toLegacyDeliveryStatus(smsStatus);
  const emailDeliveryStatus = toLegacyDeliveryStatus(emailStatus);

  return {
    sessionId: session.sessionId,
    moduleKey: args.moduleKey,
    documentId: args.documentId,
    expiresAt: session.expiresAt?.toISOString() || now,
    smsDispatchId: smsDispatch?.id || "",
    emailDispatchId: emailDispatch?.id || "",
    dispatchStatuses,
    createdAt: now,
    updatedAt: now,
    status,
    ...(smsDeliveryStatus ? { smsDeliveryStatus } : {}),
    ...(emailDeliveryStatus ? { emailDeliveryStatus } : {}),
  };
}

export async function revokeModuleSecureSigningForDocument(args: {
  tenantId: string;
  documentId: string;
  revokedBy: string;
  reason?: string;
}) {
  const now = new Date();

  const sessions = await prisma().$queryRaw<Array<{ id: string }>>(
    Prisma.sql`SELECT id
     FROM signing_sessions
     WHERE tenant_id = ${args.tenantId}
       AND document_id = ${args.documentId}
       AND revoked_at IS NULL
       AND (status IS NULL OR status NOT IN ('REVOKED', 'SIGNED', 'COMPLETED'))`,
  );

  const sessionIds = sessions.map((item) => item.id);

  if (sessionIds.length > 0) {
    await prisma().$executeRaw(
      Prisma.sql`UPDATE signing_sessions
       SET revoked_at = ${now},
           status = 'REVOKED',
           metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
             'revokedBy', ${args.revokedBy}::text,
             'revocationReason', ${args.reason || "Revoked from informed consent status tracking"}::text,
             'revokedAt', ${now}::text
           )
       WHERE id IN (${Prisma.join(sessionIds)})`,
    );

    await prisma().$executeRaw(
      Prisma.sql`UPDATE signing_secure_tokens
       SET revoked_at = ${now}
       WHERE session_id IN (${Prisma.join(sessionIds)})
         AND used_at IS NULL
         AND revoked_at IS NULL`,
    );
  }

  await prisma().signingSession.updateMany({
    where: {
      tenantId: args.tenantId,
      documentId: args.documentId,
      status: { notIn: ["COMPLETED", "EXPIRED", "REVOKED"] },
    },
    data: {
      status: "REVOKED",
      revokedAt: now,
      revokedReason: args.reason || "Revoked from informed consent status tracking",
      updatedAt: now,
    },
  });

  await prisma().signingSecureToken.updateMany({
    where: {
      tenantId: args.tenantId,
      sessionId: { in: sessionIds },
      usedAt: null,
      revokedAt: null,
    },
    data: { revokedAt: now },
  });

  return {
    revokedAt: now.toISOString(),
    revokedSessions: sessionIds.length,
    documentId: args.documentId,
  };
}

export async function refreshModuleSecureSigningStatus(
  args: {
    tenantId: string;
    sessionId: string;
  },
  client?: PrismaClient,
): Promise<SendModuleSecureSigningLinkResult> {
  const db = client ?? prisma();

  const session = await db.signingSession.findFirst({
    where: {
      id: args.sessionId,
      tenantId: args.tenantId,
    },
    include: { dispatches: true },
  });

  if (!session) {
    throw new ApiError(404, "Signing session not found");
  }

  const smsDispatch = session.dispatches.find(
    (d) => d.channel === PatientMessageChannel.SMS,
  );
  const emailDispatch = session.dispatches.find(
    (d) => d.channel === PatientMessageChannel.EMAIL,
  );

  const dispatchStatuses = {
    sms: smsDispatch
      ? smsDispatch.status
      : PatientMessageStatus.PERMANENT_FAILURE,
    email: emailDispatch
      ? emailDispatch.status
      : PatientMessageStatus.PERMANENT_FAILURE,
  };

  const smsStatus = smsDispatch?.status;
  const emailStatus = emailDispatch?.status;

  const status = await loadBadgeFlags({
    tenantId: args.tenantId,
    sessionId: session.id,
    smsStatus,
    client,
  });

  const smsDeliveryStatus = toLegacyDeliveryStatus(smsStatus);
  const emailDeliveryStatus = toLegacyDeliveryStatus(emailStatus);

  return {
    sessionId: session.id,
    moduleKey: session.moduleType as SendModuleSecureSigningLinkResult["moduleKey"],
    documentId: session.documentId,
    expiresAt: session.expiresAt?.toISOString() || session.createdAt.toISOString(),
    smsDispatchId: smsDispatch?.id || "",
    emailDispatchId: emailDispatch?.id || "",
    dispatchStatuses,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    status,
    ...(smsDeliveryStatus ? { smsDeliveryStatus } : {}),
    ...(emailDeliveryStatus ? { emailDeliveryStatus } : {}),
  };
}

export async function getPreviewSigningOtp(args: {
  tenantId: string;
  documentId: string;
  sessionId: string;
}): Promise<{ otpCode: string; challengeId: string; expiresAt: string; maskedPhone: string }> {
  if (!isPreviewOtpInspectionEnabled()) {
    throw new ApiError(404, "Preview OTP inspector is unavailable");
  }

  const sessionRows = await prisma().$queryRaw<Array<{ id: string }>>(
    Prisma.sql`SELECT id
     FROM signing_sessions
     WHERE tenant_id = ${args.tenantId}
       AND document_id = ${args.documentId}
       AND id = ${args.sessionId}::uuid
     LIMIT 1`,
  );

  if (!sessionRows[0]?.id) {
    throw new ApiError(404, "Signing session not found");
  }

  const otpRows = await prisma().$queryRaw<Array<{ raw_payload: unknown }>>(
    Prisma.sql`SELECT raw_payload
     FROM webhook_events
     WHERE provider_key = ${OTP_PROVIDER_KEY}
       AND event_type = ${OTP_REQUESTED_EVENT}
       AND raw_payload ->> 'sessionId' = ${args.sessionId}
       AND raw_payload ->> 'documentId' = ${args.documentId}
     ORDER BY received_at DESC
     LIMIT 1`,
  );

  const payload = parseRecord(otpRows[0]?.raw_payload);
  const otpHash = typeof payload?.otpHash === "string" ? payload.otpHash : "";
  if (!otpHash) {
    throw new ApiError(404, "No preview OTP found for signing session");
  }

  const otpCode = deriveOtpCodeFromHash(otpHash);
  if (!otpCode) {
    throw new ApiError(500, "Failed to derive preview OTP");
  }

  return {
    otpCode,
    challengeId: typeof payload?.challengeId === "string" ? payload.challengeId : "",
    expiresAt: typeof payload?.expiresAt === "string" ? payload.expiresAt : "",
    maskedPhone: typeof payload?.maskedPhone === "string" ? payload.maskedPhone : "",
  };
}
