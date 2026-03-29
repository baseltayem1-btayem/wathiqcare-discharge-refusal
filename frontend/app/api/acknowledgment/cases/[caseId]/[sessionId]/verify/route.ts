import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

type RouteContext = { params: Promise<{ caseId: string; sessionId: string }> };

function safe(v: unknown): string {
    return (v == null ? "" : String(v)).trim();
}

function nowIso(): string {
    return new Date().toISOString();
}

try {
    const prisma = getPrisma();
    const auth = requireAuth(request);
    const { caseId, sessionId } = await params;

    const doc = await prisma.document.findUnique({ where: { id: sessionId } });
    if (!doc) throw new ApiError(404, "جلسة الإقرار غير موجودة");
    if (doc.tenantId !== auth.tenant_id) throw new ApiError(403, "Tenant access denied");

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

    if (method === "SMS_OTP") {
        const submitted = safe(payload.otp_code);
        if (!submitted) throw new ApiError(400, "otp_code is required");
        const expectedHash = safe(session.otp_code_hash);
        if (!expectedHash) throw new ApiError(400, "لا يوجد رمز OTP مرتبط بهذه الجلسة");
        verified = crypto.createHash("sha256").update(submitted).digest("hex") === expectedHash;
    } else if (method === "TABLET_SIGNATURE") {
        const signaturePayload = safe(payload.signature_payload);
        verified = signaturePayload.length > 0;

        const expectedHash = safe(session.otp_code_hash);
        if (expectedHash) {
            const submittedOtp = safe(payload.otp_code);
            if (!submittedOtp) throw new ApiError(400, "otp_code is required when mobile linkage is enabled");
            const otpOk = crypto.createHash("sha256").update(submittedOtp).digest("hex") === expectedHash;
            verified = verified && otpOk;
        }
    } else if (method === "EMAIL_NOTICE") {
        verified = false;
    }

    const newStatus = verified ? "verified" : (method === "EMAIL_NOTICE" ? "notification_sent" : "failed");

    const updatedSession: Record<string, unknown> = {
        ...session,
        verification_status: newStatus,
        verified_at: verified ? verificationTimestamp : null,
        updated_at: verificationTimestamp,
    };

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
            signedAt: verified ? new Date() : null,
            signedByUserId: verified ? auth.sub : null,
        },
    });

    if (verified) {
        const templateKey = String(session.document_type ?? "");
        const signatureHash = crypto
            .createHash("sha256")
            .update(`${sessionId}:${caseId}:${verificationTimestamp}`)
            .digest("hex");
        const signatureDevice = safe(payload.device ?? payload.device_source);
        const signatureIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

        try {
            const existing = await prisma.dischargeRefusalCase.findFirst({
                where: { caseId, tenantId: auth.tenant_id },
            });

            if (existing) {
                await prisma.dischargeRefusalCase.update({
                    where: { id: existing.id },
                    data: {
                        signatureMethod: method,
                        signatureTimestamp: new Date(),
                        signatureHash,
                        signatureDevice,
                        signatureIpAddress: signatureIp,
                    },
                });
            } else {
                await prisma.dischargeRefusalCase.create({
                    data: {
                        tenantId: auth.tenant_id,
                        caseId,
                        dischargeStatus: "acknowledged",
                        signatureMethod: method,
                        signatureTimestamp: new Date(),
                        signatureHash,
                        signatureDevice,
                        signatureIpAddress: signatureIp,
                    },
                });
            }
        } catch (dbErr) {
            console.error("verify-ack: dischargeRefusalCase upsert failed (non-fatal)", dbErr);
        }

        try {
            await writeAuditLog({
                tenantId: auth.tenant_id,
                userId: auth.sub,
                caseId,
                action: "acknowledgment_verified",
                entityType: "document",
                entityId: sessionId,
                documentId: sessionId,
                metadataJson: { document_type: templateKey, method, session_id: sessionId },
            });
        } catch (auditErr) {
            console.error("verify-ack: audit log write failed (non-fatal)", auditErr);
        }
    }

    if (method === "EMAIL_NOTICE") {
        try {
            await writeAuditLog({
                tenantId: auth.tenant_id,
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
                    recipient_email: providerResult ? safe(providerResult.recipient_email) : null,
                    message_id: providerResult ? safe(providerResult.message_id) : null,
                    provider: providerResult ? safe(providerResult.provider) : null,
                },
            });
        } catch (auditErr) {
            console.error("verify-ack: email notification audit log write failed (non-fatal)", auditErr);
        }
    }

    return NextResponse.json({
        verification_status: newStatus,
        verified,
        session_id: sessionId,
        pdf_path: null,
        delivery_status: providerResult ? safe(providerResult.delivery_status) : null,
        provider: providerResult ? safe(providerResult.provider) : null,
        recipient_email: providerResult ? safe(providerResult.recipient_email) : null,
    });
} catch (error) {
    return handleApiError(error);
}
}
