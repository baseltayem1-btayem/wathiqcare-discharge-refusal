import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantId } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

type RouteContext = { params: Promise<{ caseId: string; sessionId: string }> };

const DEFAULT_MAX_OTP_RETRIES = 3;

function safe(v: unknown): string {
    return (v == null ? "" : String(v)).trim();
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
        throw new ApiError(400, "signature_payload is too small to be a valid tablet signature");
    }

    return buffer;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const auth = await requireAuth(request);
        const tenantId = requireTenantId(auth);

        const prisma = getPrisma(); // ✅ FIX

        const { caseId, sessionId } = await params;

        const doc = await prisma.document.findFirst({
            where: { id: sessionId, tenantId },
        });

        if (!doc) throw new ApiError(404, "جلسة الإقرار غير موجودة");

        if (doc.status === "SIGNED" || doc.signedAt) {
            throw new ApiError(409, "جلسة الإقرار تم التحقق منها بالفعل");
        }

        if (!doc.payloadJson || typeof doc.payloadJson !== "object" || Array.isArray(doc.payloadJson)) {
            throw new ApiError(500, "بيانات الجلسة تالفة");
        }

        const session = doc.payloadJson as Record<string, unknown>;

        if (session.case_id !== caseId) {
            throw new ApiError(400, "جلسة الإقرار لا تطابق الحالة");
        }

        const bodyRaw = (await request.json().catch(() => null)) as {
            payload?: Record<string, unknown>;
        } | null;

        const payload = (bodyRaw?.payload ?? {}) as Record<string, unknown>;

        const method = String(session.acknowledgment_method ?? "").toUpperCase();
        const verificationTimestamp = nowIso();

        let verified = false;
        let signatureHash: string | null = null;

        const expectedHash = safe(session.otp_code_hash ?? session.otpCodeHash);

        let attemptCount = Math.max(
            0,
            Number(session.attempt_count ?? session.attemptCount ?? 0) || 0
        );

        const maxRetries = Math.min(
            Math.max(Number(session.max_retries ?? session.maxRetries ?? DEFAULT_MAX_OTP_RETRIES) || DEFAULT_MAX_OTP_RETRIES, 1),
            10
        );

        let locked = Boolean(session.locked) || attemptCount >= maxRetries;
        let lockedAt = safe(session.locked_at ?? session.lockedAt) || null;

        const verifyOtp = (): boolean => {
            if (!expectedHash) {
                throw new ApiError(400, "لا يوجد رمز OTP مرتبط بهذه الجلسة");
            }

            if (locked) {
                throw new ApiError(429, "OTP attempts exceeded. Please request a new verification session.");
            }

            const submitted = safe(payload.otp_code);

            if (!submitted) {
                throw new ApiError(400, "otp_code is required");
            }

            const isValid =
                crypto.createHash("sha256").update(submitted).digest("hex") === expectedHash;

            if (!isValid) {
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

            signatureHash = crypto.createHash("sha256")
                .update(signatureBytes)
                .digest("hex");

            verified = true;

            if (expectedHash) {
                verified = verified && verifyOtp();
            }
        } else if (method === "EMAIL_NOTICE") {
            verified = false;
        }

        const newStatus =
            verified
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

        const providerResult =
            updatedSession.provider_result &&
            typeof updatedSession.provider_result === "object" &&
            !Array.isArray(updatedSession.provider_result)
                ? (updatedSession.provider_result as Record<string, unknown>)
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
            const persistedSignatureHash =
                signatureHash ??
                crypto.createHash("sha256")
                    .update(`${sessionId}:${caseId}:${verificationTimestamp}`)
                    .digest("hex");

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
                console.error("verify-ack: dischargeRefusalCase upsert failed", dbErr);
            }

            await writeAuditLog({
                tenantId,
                userId: auth.sub,
                caseId,
                action: "acknowledgment_verified",
                entityType: "document",
                entityId: sessionId,
                documentId: sessionId,
                metadataJson: { method, session_id: sessionId },
            });
        }

        return NextResponse.json({
            verification_status: newStatus,
            verified,
            session_id: sessionId,
        });

    } catch (error) {
        return handleApiError(error);
    }
}