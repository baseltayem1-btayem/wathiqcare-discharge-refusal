import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantId } from "@/lib/server/auth";
import { logAcknowledgmentOtpVerify } from "@/lib/server/acknowledgment-telemetry";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

type RouteContext = { params: Promise<{ caseId: string; sessionId: string }> };

// â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function safe(v: unknown): string {
    return (v == null ? "" : String(v)).trim();
}

function nowIso(): string {
    return new Date().toISOString();
}

// â”€â”€ route â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function POST(request: NextRequest, { params }: RouteContext) {
    const prisma = getPrisma();
    try {
        const auth = await requireAuth(request);
        const tenantId = requireTenantId(auth);
        const { caseId, sessionId } = await params;

        // Load session from Document record
        const doc = await prisma.document.findFirst({ where: { id: sessionId, tenantId } });
        if (!doc) throw new ApiError(404, "Ø¬Ù„Ø³Ø© Ø§Ù„Ø¥Ù‚Ø±Ø§Ø± ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©");

        if (!doc.payloadJson || typeof doc.payloadJson !== "object" || Array.isArray(doc.payloadJson)) {
            throw new ApiError(500, "Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¬Ù„Ø³Ø© ØªØ§Ù„ÙØ©");
        }
        const session = doc.payloadJson as Record<string, unknown>;
        if (session.case_id !== caseId) {
            throw new ApiError(400, "Ø¬Ù„Ø³Ø© Ø§Ù„Ø¥Ù‚Ø±Ø§Ø± Ù„Ø§ ØªØ·Ø§Ø¨Ù‚ Ø§Ù„Ø­Ø§Ù„Ø©");
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
            if (!expectedHash) throw new ApiError(400, "Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø±Ù…Ø² OTP Ù…Ø±ØªØ¨Ø· Ø¨Ù‡Ø°Ù‡ Ø§Ù„Ø¬Ù„Ø³Ø©");
            verified = crypto.createHash("sha256").update(submitted).digest("hex") === expectedHash;
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
        } else if (method === "EMAIL_NOTICE") {
            verified = false;
        }

        const newStatus = verified ? "verified" : (method === "EMAIL_NOTICE" ? "notification_sent" : "failed");

        // Update session state in Document
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
                payloadJson: updatedSession as JsonInputValue,
                signedAt: verified ? new Date() : null,
                signedByUserId: verified ? auth.sub : null,
            },
        });
        if (method === "SMS_OTP" || (method === "TABLET_SIGNATURE" && safe(session.otp_code_hash))) {
            logAcknowledgmentOtpVerify({
                tenantId,
                caseId,
                sessionId,
                documentType: safe(session.document_type),
                acknowledgmentMethod: method,
                challengeId: safe(providerResult?.challenge_id),
                deliveryStatus: safe(providerResult?.delivery_status) || null,
                provider: safe(providerResult?.provider) || null,
                stubMode: providerResult?.stub_mode === undefined ? null : Boolean(providerResult.stub_mode),
                phoneNumberMasked: safe(session.phone_number_masked),
                outcome: verified ? "verified" : "failed",
            });
        }

        // If verified, upsert a DischargeRefusalCase record and write audit log.
        // These are secondary operations; wrap in try-catch so a missing table or
        // transient DB error does NOT roll back the document update already done above.
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
                    where: { caseId, tenantId },
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
                            tenantId,
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
                    tenantId,
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
                    tenantId,
                    userId: auth.sub,
                    caseId,
                    action: "acknowledgment_notification_confirmed",
                    entityType: "document",
                    entityId: sessionId,
                });
            } catch (auditErr) {
                console.error("verify-ack: email notification audit log write failed (non-fatal)", auditErr);
            }
        }
        return NextResponse.json({
            verification_status: newStatus,
            verified,
            session_id: sessionId,
            pdf_path: null, // PDF generation not available in serverless; use document record
            delivery_status: providerResult ? safe(providerResult.delivery_status) : null,
            provider: providerResult ? safe(providerResult.provider) : null,
            recipient_email: providerResult ? safe(providerResult.recipient_email) : null,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
