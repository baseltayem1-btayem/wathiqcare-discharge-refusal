import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantId } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { logRuntimeIncident, recordRuntimeMetric } from "@/lib/server/runtime-observability";
import { assertRuntimeWriteAllowed } from "@/lib/server/runtime-modes";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ caseId: string; sessionId: string }>;
};

const DEFAULT_MAX_OTP_RETRIES = 3;

function safe(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function nowIso(): string {
  return new Date().toISOString();
}

function decodeSignaturePayload(payload: string): Buffer {
  const normalized = payload.replace(/^data:[^,]+,/u, "").trim();

  if (!normalized) {
    throw new ApiError(400, "signature_payload is required");
  }

  if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(normalized)) {
    throw new ApiError(400, "signature_payload must be base64 encoded");
  }

  const buffer = Buffer.from(normalized, "base64");

  if (!buffer.length) {
    throw new ApiError(400, "signature_payload must not be empty");
  }

  if (buffer.length < 32) {
    throw new ApiError(
      400,
      "signature_payload is too small to be a valid tablet signature",
    );
  }

  return buffer;
}

function sha256(value: string | Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const startedAt = Date.now();
  try {
    assertRuntimeWriteAllowed();
    const auth = await requireAuth(request);
    const tenantId = requireTenantId(auth);
    const { caseId, sessionId } = await params;

    const prisma = getPrisma();
    const { writeAuditLog } = await import("@/lib/server/saas-services");

    const doc = await prisma.document.findFirst({
      where: {
        id: sessionId,
        tenantId,
      },
    });

    if (!doc) {
      throw new ApiError(404, "جلسة الإقرار غير موجودة");
    }

    if (doc.status === "SIGNED" || doc.signedAt) {
      throw new ApiError(409, "جلسة الإقرار تم التحقق منها بالفعل");
    }

    if (!isRecord(doc.payloadJson)) {
      throw new ApiError(500, "بيانات الجلسة تالفة");
    }

    const session = doc.payloadJson as Record<string, unknown>;

    if (session.case_id !== caseId) {
      throw new ApiError(400, "جلسة الإقرار لا تطابق الحالة");
    }

    const bodyRaw = (await request.json().catch(() => null)) as
      | {
          payload?: Record<string, unknown>;
        }
      | null;

    const payload = isRecord(bodyRaw?.payload) ? bodyRaw.payload : {};

    const method = safe(session.acknowledgment_method).toUpperCase();
    const verificationTimestamp = nowIso();

    let verified = false;
    let signatureHash: string | null = null;

    const expectedHash = safe(session.otp_code_hash ?? session.otpCodeHash);

    const parsedAttemptCount = Number(
      session.attempt_count ?? session.attemptCount ?? 0,
    );
    let attemptCount = Number.isFinite(parsedAttemptCount)
      ? Math.max(0, parsedAttemptCount)
      : 0;

    const parsedMaxRetries = Number(
      session.max_retries ?? session.maxRetries ?? DEFAULT_MAX_OTP_RETRIES,
    );
    const maxRetries = Number.isFinite(parsedMaxRetries)
      ? Math.min(Math.max(parsedMaxRetries, 1), 10)
      : DEFAULT_MAX_OTP_RETRIES;

    let locked = Boolean(session.locked) || attemptCount >= maxRetries;
    let lockedAt = safe(session.locked_at ?? session.lockedAt) || null;

    const verifyOtp = (): boolean => {
      if (!expectedHash) {
        throw new ApiError(400, "لا يوجد رمز OTP مرتبط بهذه الجلسة");
      }

      if (locked) {
        throw new ApiError(
          429,
          "OTP attempts exceeded. Please request a new verification session.",
        );
      }

      const submitted = safe(payload.otp_code);
      if (!submitted) {
        throw new ApiError(400, "otp_code is required");
      }

      const isValid = sha256(submitted) === expectedHash;

      if (!isValid) {
        logRuntimeIncident({
          request,
          auth,
          module: "acknowledgment_verification",
          type: "OTP_FAILURE",
          details: {
            sessionId,
            caseId,
            attemptCount: attemptCount + 1,
            maxRetries,
          },
        });
        attemptCount += 1;

        if (attemptCount >= maxRetries) {
          locked = true;
          lockedAt = verificationTimestamp;
        }
      }

      return isValid;
    };

    if (method === "SMS_OTP") {
      verified = verifyOtp();
    } else if (method === "TABLET_SIGNATURE") {
      const signaturePayload = safe(payload.signature_payload);
      const signatureBytes = decodeSignaturePayload(signaturePayload);

      signatureHash = sha256(signatureBytes);
      verified = true;

      if (expectedHash) {
        verified = verified && verifyOtp();
      }
    } else if (method === "EMAIL_NOTICE") {
      verified = false;
    } else {
      throw new ApiError(400, `Unsupported acknowledgment method: ${method}`);
    }

    const newStatus = verified
      ? "verified"
      : method === "EMAIL_NOTICE"
        ? "notification_sent"
        : "failed";

    const updatedSession: Record<string, unknown> = {
      ...session,
      verification_status: newStatus,
      verified_at: verified ? verificationTimestamp : null,
      updated_at: verificationTimestamp,
      attempt_count: attemptCount,
      max_retries: maxRetries,
      locked,
      locked_at: locked ? (lockedAt ?? verificationTimestamp) : null,
    };

    if (signatureHash) {
      updatedSession.signature_hash = signatureHash;
    }

    const providerResult = isRecord(updatedSession.provider_result)
      ? updatedSession.provider_result
      : null;

    if (method === "EMAIL_NOTICE" && providerResult) {
      providerResult.confirmed_at = verificationTimestamp;
      providerResult.confirmed_by_user_id = auth.sub;
      updatedSession.provider_result = providerResult;
    }

    await prisma.document.update({
      where: { id: sessionId },
      data: {
        status: verified ? "SIGNED" : "DRAFT",
        payloadJson: updatedSession as Prisma.InputJsonValue,
        signedAt: verified ? new Date() : doc.signedAt,
        signedByUserId: verified ? auth.sub : doc.signedByUserId,
      },
    });

    if (verified) {
      const templateKey = safe(session.document_type);
      const persistedSignatureHash =
        signatureHash ?? sha256(`${sessionId}:${caseId}:${verificationTimestamp}`);
      const signatureDevice = safe(payload.device ?? payload.device_source);
      const signatureIp =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

      try {
        const existing = await prisma.dischargeRefusalCase.findFirst({
          where: { caseId, tenantId },
        });

        if (existing) {
          await prisma.dischargeRefusalCase.update({
            where: { id: existing.id },
            data: {
              signatureMethod: method,
              signatureTimestamp: new Date(),
              signatureHash: persistedSignatureHash,
              signatureDevice,
              signatureIpAddress: signatureIp,
            },
          });
        } else {
          await prisma.dischargeRefusalCase.create({
            data: {
              tenantId,
              caseId,
              dischargeStatus: "acknowledged",
              signatureMethod: method,
              signatureTimestamp: new Date(),
              signatureHash: persistedSignatureHash,
              signatureDevice,
              signatureIpAddress: signatureIp,
            },
          });
        }
      } catch (dbErr) {
        console.error(
          "verify-ack: dischargeRefusalCase upsert failed (non-fatal)",
          dbErr,
        );
      }

      try {
        await writeAuditLog({
          tenantId,
          userId: auth.sub,
          caseId,
          action: "acknowledgment_verified",
          entityType: "document",
          entityId: sessionId,
          documentId: sessionId,
          metadataJson: {
            document_type: templateKey,
            method,
            session_id: sessionId,
          },
        });
      } catch (auditErr) {
        console.error(
          "verify-ack: audit log write failed (non-fatal)",
          auditErr,
        );
      }
    } else if (method !== "EMAIL_NOTICE") {
      try {
        await writeAuditLog({
          tenantId,
          userId: auth.sub,
          caseId,
          action: locked
            ? "acknowledgment_locked"
            : "acknowledgment_verification_failed",
          entityType: "document",
          entityId: sessionId,
          documentId: sessionId,
          metadataJson: {
            method,
            session_id: sessionId,
            attempt_count: attemptCount,
            max_retries: maxRetries,
            locked,
          },
        });
      } catch (auditErr) {
        console.error(
          "verify-ack: verification failure audit log write failed (non-fatal)",
          auditErr,
        );
      }
    }

    if (method === "EMAIL_NOTICE") {
      try {
        await writeAuditLog({
          tenantId,
          userId: auth.sub,
          caseId,
          action: "acknowledgment_notification_confirmed",
          entityType: "document",
          entityId: sessionId,
          documentId: sessionId,
          metadataJson: {
            method,
            session_id: sessionId,
            verification_status: newStatus,
            recipient_email: providerResult
              ? safe(providerResult.recipient_email)
              : null,
            message_id: providerResult ? safe(providerResult.message_id) : null,
            provider: providerResult ? safe(providerResult.provider) : null,
          },
        });
      } catch (auditErr) {
        console.error(
          "verify-ack: email notification audit log write failed (non-fatal)",
          auditErr,
        );
      }
    }

    return NextResponse.json({
      verification_status: newStatus,
      verified,
      session_id: sessionId,
      pdf_path: null,
      delivery_status: providerResult
        ? safe(providerResult.delivery_status)
        : null,
      provider: providerResult ? safe(providerResult.provider) : null,
      recipient_email: providerResult
        ? safe(providerResult.recipient_email)
        : null,
    });
  } catch (error) {
    logRuntimeIncident({
      request,
      module: "acknowledgment_verification",
      type: "AUTH_FAILURE",
      error,
      details: {
        route: "/api/acknowledgment/cases/[caseId]/[sessionId]/verify",
      },
    });
    return handleApiError(error);
  } finally {
    recordRuntimeMetric("response_time_ms", Date.now() - startedAt);
  }
}
