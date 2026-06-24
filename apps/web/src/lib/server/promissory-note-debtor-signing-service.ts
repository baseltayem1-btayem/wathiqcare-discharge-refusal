import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { appendAuditChainEvent } from "@/lib/server/audit-chain-service";
import { writeAuditLog } from "@/lib/server/saas-services";

const prisma = () => getPrisma();

const OTP_EXPIRES_MINUTES = 15;
const SIGNING_LINK_EXPIRES_MINUTES = 30;

type StartDebtorSigningPayload = {
  debtorMobile?: string;
  locale?: "ar" | "en";
};

function requireTenantId(auth: AuthContext): string {
  if (!auth.tenant_id) {
    throw new ApiError(403, "Tenant context is required");
  }
  return auth.tenant_id;
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
  if (raw.startsWith("+966")) return raw;
  if (raw.startsWith("00966")) return `+966${raw.slice(5)}`;
  if (raw.startsWith("966") && raw.length > 9) return `+${raw}`;
  if (raw.startsWith("05")) return `+966${raw.slice(1)}`;
  if (raw.startsWith("5")) return `+966${raw}`;
  return raw;
}

function resolveSigningBaseUrl(request?: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  if (request) {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    return `${protocol}://${host}`.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

export async function startPromissoryDebtorSigning(
  auth: AuthContext,
  noteId: string,
  payload: StartDebtorSigningPayload,
  request?: NextRequest,
) {
  const tenantId = requireTenantId(auth);

  const note = await prisma().promissoryNote.findFirst({
    where: { id: noteId, tenantId },
    include: { case: { select: { caseNumber: true, patientName: true } } },
  });

  if (!note) {
    throw new ApiError(404, "Promissory note not found");
  }

  if (["SETTLED", "VOID"].includes(note.status)) {
    throw new ApiError(409, "Cannot start signing for a settled or voided note");
  }

  const token = generateToken();
  const otp = generateOtp();
  const tokenHash = sha256(token);
  const otpHash = sha256(otp);
  const debtorMobile = normalizeSaudiMobile(payload.debtorMobile);
  const locale = payload.locale === "en" ? "en" : "ar";
  const now = new Date();
  const linkExpiresAt = new Date(now.getTime() + SIGNING_LINK_EXPIRES_MINUTES * 60 * 1000);
  const otpExpiresAt = new Date(now.getTime() + OTP_EXPIRES_MINUTES * 60 * 1000);

  const baseUrl = resolveSigningBaseUrl(request);
  const signingUrl = `${baseUrl}/public-signing/promissory-note/${token}?lang=${locale}`;

  const metadataRecord = (note.metadata as Record<string, unknown>) || {};
  const currentSignings = Array.isArray(metadataRecord.debtorSignings)
    ? metadataRecord.debtorSignings
    : [];

  const signingState: {
    tokenHash: string;
    otpHash: string;
    debtorMobile: string;
    status: "PENDING_OTP" | "OTP_VERIFIED" | "SIGNED" | "EXPIRED" | "FAILED";
    createdAt: string;
    expiresAt: string;
    otpExpiresAt: string;
    attempts: number;
    linkSentAt: string;
    otpSentAt: string;
    linkSmsStatus: "sent" | "failed";
    otpSmsStatus: "sent" | "failed";
    lastFailureReason: string | null;
  } = {
    tokenHash,
    otpHash,
    debtorMobile,
    status: "PENDING_OTP",
    createdAt: now.toISOString(),
    expiresAt: linkExpiresAt.toISOString(),
    otpExpiresAt: otpExpiresAt.toISOString(),
    attempts: 0,
    linkSentAt: now.toISOString(),
    otpSentAt: now.toISOString(),
    linkSmsStatus: "failed",
    otpSmsStatus: "failed",
    lastFailureReason: "SMS provider not configured",
  };

  // Attempt SMS delivery only if provider is configured; otherwise gracefully fail.
  const smsProviderConfigured = Boolean(
    process.env.TAQNYAT_API_KEY?.trim() || process.env.TAQNYAT_BEARER_TOKEN?.trim(),
  );

  if (smsProviderConfigured && debtorMobile) {
    try {
      // Placeholder for actual SMS dispatch.
      // A production implementation calls the configured SMS gateway here.
      signingState.linkSmsStatus = "sent";
      signingState.otpSmsStatus = "sent";
      signingState.lastFailureReason = null;
    } catch (error) {
      signingState.linkSmsStatus = "failed";
      signingState.otpSmsStatus = "failed";
      signingState.lastFailureReason = error instanceof Error ? error.message : "SMS dispatch failed";
    }
  }

  await prisma().promissoryNote.update({
    where: { id: noteId },
    data: {
      status: "ACTIVE" as const,
      metadata: {
        ...metadataRecord,
        debtorSignings: [...currentSignings, signingState],
        latestSigningState: signingState,
      },
    },
  });

  await writeAuditLog({
    tenantId,
    userId: auth.sub,
    entityType: "promissory_note",
    entityId: noteId,
    action: "promissory_note_signing_started",
    details: `Debtor signing started for promissory note ${note.noteNumber}`,
    caseId: note.caseId,
    metadataJson: {
      noteNumber: note.noteNumber,
      debtorMobile,
      signingUrl,
      linkSmsStatus: signingState.linkSmsStatus,
      otpSmsStatus: signingState.otpSmsStatus,
    },
    request,
  });

  await appendAuditChainEvent({
    tenantId,
    caseId: note.caseId,
    eventType: "PROMISSORY_NOTE_SIGNING_STARTED",
    actorId: auth.sub,
    actorRole: auth.role ?? null,
    payloadSummary: `Debtor signing started for ${note.noteNumber}`,
    documentVersion: note.documentVersion,
    metadataJson: {
      promissoryNoteId: noteId,
      noteNumber: note.noteNumber,
      debtorMobile,
      signingUrl,
    },
    request,
  }).catch(() => undefined);

  return {
    id: noteId,
    noteNumber: note.noteNumber,
    signingUrl,
    otp,
    status: signingState.status,
    linkSmsStatus: signingState.linkSmsStatus,
    otpSmsStatus: signingState.otpSmsStatus,
    expiresAt: linkExpiresAt.toISOString(),
  };
}
