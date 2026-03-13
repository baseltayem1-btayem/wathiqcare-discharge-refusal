import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

type RouteContext = { params: Promise<{ caseId: string; sessionId: string }> };

// ── helpers ────────────────────────────────────────────────────────────────

function safe(v: unknown): string {
    return (v == null ? "" : String(v)).trim();
}

function nowIso(): string {
    return new Date().toISOString();
}

// ── route ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const auth = requireAuth(request);
        const { caseId, sessionId } = await params;

        // Load session from Document record
        const doc = await prisma.document.findUnique({ where: { id: sessionId } });
        if (!doc) throw new ApiError(404, "جلسة الإقرار غير موجودة");
        if (doc.tenantId !== auth.tenant_id) throw new ApiError(403, "Tenant access denied");

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

        } else if (method === "NAFATH") {
            // Nafath is unavailable in stub mode — treat as pending
            verified = false;

        } else if (method === "TABLET_SIGNATURE") {
            const signaturePayload = safe(payload.signature_payload);
            verified = signaturePayload.length > 0;

            // If OTP was also linked, verify it too
            const expectedHash = safe(session.otp_code_hash);
            if (expectedHash) {
                const submittedOtp = safe(payload.otp_code);
                if (!submittedOtp) throw new ApiError(400, "otp_code is required when mobile linkage is enabled");
                const otpOk = crypto.createHash("sha256").update(submittedOtp).digest("hex") === expectedHash;
                verified = verified && otpOk;
            }
        }

        const newStatus = verified ? "verified" : (method === "NAFATH" ? "unavailable" : "failed");

        // Update session state in Document
        const updatedSession: Record<string, unknown> = {
            ...session,
            verification_status: newStatus,
            verified_at: verified ? verificationTimestamp : null,
            updated_at: verificationTimestamp,
        };

        await prisma.document.update({
            where: { id: sessionId },
            data: {
                status: verified ? "SIGNED" : "DRAFT",
                payloadJson: updatedSession as Prisma.InputJsonValue,
                signedAt: verified ? new Date() : null,
                signedByUserId: verified ? auth.sub : null,
            },
        });

        // If verified, upsert a DischargeRefusalCase record to capture the signature
        if (verified) {
            const templateKey = String(session.document_type ?? "");
            const signatureHash = crypto
                .createHash("sha256")
                .update(`${sessionId}:${caseId}:${verificationTimestamp}`)
                .digest("hex");

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
                        signatureDevice: safe(payload.device ?? payload.device_source),
                        signatureIpAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
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
                        signatureDevice: safe(payload.device ?? payload.device_source),
                        signatureIpAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
                    },
                });
            }

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
        }

        return NextResponse.json({
            verification_status: newStatus,
            verified,
            session_id: sessionId,
            pdf_path: null, // PDF generation not available in serverless; use document record
        });
    } catch (error) {
        return handleApiError(error);
    }
}
