import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
type RouteContext = { params: Promise<{ caseId: string }> };

// ── helpers ────────────────────────────────────────────────────────────────

const SUPPORTED_METHODS = new Set(["SMS_OTP", "TABLET_SIGNATURE", "NAFATH"]);

const SUPPORTED_DOCUMENT_TYPES: Record<string, string> = {
    discharge_refusal_form: "discharge_refusal_form",
    medical_discharge_refusal_form: "discharge_refusal_form",
    financial_responsibility_notice: "financial_responsibility_notice",
    financial_notice: "financial_responsibility_notice",
    informed_consent: "informed_consent",
    consent: "informed_consent",
    patient_consent: "informed_consent",
    home_healthcare_agreement: "home_healthcare_agreement",
    home_healthcare: "home_healthcare_agreement",
    hhc_pdn_agreement: "home_healthcare_agreement",
};

function normalizeDocumentType(raw: string): string {
    const key = raw.trim().toLowerCase();
    const resolved = SUPPORTED_DOCUMENT_TYPES[key];
    if (!resolved) throw new ApiError(400, "نوع المستند غير مدعوم");
    return resolved;
}

function normalizeMethod(raw: string): string {
    const upper = raw.trim().toUpperCase();
    if (!SUPPORTED_METHODS.has(upper)) throw new ApiError(400, "طريقة الإقرار غير مدعومة");
    return upper;
}

function generateOtp(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(code: string): string {
    return crypto.createHash("sha256").update(code).digest("hex");
}

function maskPhone(phone: string): string {
    if (phone.length <= 4) return "****";
    return phone.slice(0, -4).replace(/./g, "*") + phone.slice(-4);
}

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
        const { caseId } = await params;

        const body = (await request.json().catch(() => null)) as {
            document_type?: string;
            method?: string;
            payload?: Record<string, unknown>;
        } | null;

        if (!body?.document_type || !body?.method) {
            throw new ApiError(400, "document_type and method are required");
        }

        const templateKey = normalizeDocumentType(body.document_type);
        const method = normalizeMethod(body.method);
        const inputPayload = (body.payload ?? {}) as Record<string, unknown>;

        // Verify case ownership
        const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
        if (!caseRecord) throw new ApiError(404, "Case not found");
        if (caseRecord.tenantId !== auth.tenant_id) throw new ApiError(403, "Tenant access denied");

        // Build context from case record + payload
        const patientName = safe(inputPayload.patient_name ?? caseRecord.patientName);
        const medicalRecordNo = safe(inputPayload.medical_record_number ?? inputPayload.urn ?? caseRecord.medicalRecordNo);
        const refNum = `ACK-${caseId.slice(0, 8).toUpperCase()}-${new Date().toISOString().replace(/\D/g, "").slice(0, 12)}`;

        // Session state stored in Document.payloadJson
        const sessionState: Record<string, unknown> = {
            case_id: caseId,
            tenant_id: auth.tenant_id,
            document_type: templateKey,
            acknowledgment_method: method,
            verification_status: "pending",
            created_at: nowIso(),
            patient_name: patientName,
            medical_record_number: medicalRecordNo,
            patient_id_number: safe(inputPayload.patient_id_number ?? caseRecord.patientIdNumber),
            reference_number: refNum,
            provider_result: {} as Record<string, unknown>,
        };

        // Method-specific setup
        if (method === "SMS_OTP") {
            const phone = safe(inputPayload.phone_number);
            if (!phone) throw new ApiError(400, "phone_number is required for SMS OTP");
            const otpCode = generateOtp();
            const otpHash = hashOtp(otpCode);
            sessionState.otp_code_hash = otpHash;
            sessionState.phone_number_masked = maskPhone(phone);
            sessionState.otp_sent_at = nowIso();
            sessionState.provider_result = {
                delivery_status: "stub_delivered",
                challenge_id: crypto.randomUUID(),
                provider: "stub",
                stub_mode: true,
                otp_debug_code: otpCode, // returned to frontend for dev/demo use
            };
        } else if (method === "NAFATH") {
            sessionState.verification_status = "unavailable";
            sessionState.provider_result = {
                request_id: crypto.randomUUID(),
                status: "unavailable",
                provider: "nafath_stub",
            };
        } else if (method === "TABLET_SIGNATURE") {
            sessionState.verification_status = "awaiting_signature";
            sessionState.provider_result = { device_source: "TABLET" } as Record<string, unknown>;

            // Optional mobile OTP linkage
            const phone = safe(inputPayload.phone_number);
            if (phone) {
                const otpCode = generateOtp();
                const otpHash = hashOtp(otpCode);
                sessionState.otp_code_hash = otpHash;
                sessionState.phone_number_masked = maskPhone(phone);
                sessionState.otp_sent_at = nowIso();
                (sessionState.provider_result as Record<string, unknown>).otp_debug_code = otpCode;
                (sessionState.provider_result as Record<string, unknown>).stub_mode = true;
                (sessionState.provider_result as Record<string, unknown>).challenge_id = crypto.randomUUID();
            }
        }

        // Persist session as a Document record; id becomes the session_id
        const doc = await prisma.document.create({
            data: {
                tenantId: auth.tenant_id,
                caseId,
                documentType: "OTHER",
                templateKey: `ack_session:${templateKey}`,
                titleEn: `Acknowledgment Session – ${templateKey}`,
                titleAr: "جلسة إقرار",
                fileName: `ack_session_${templateKey}.json`,
                mimeType: "application/json",
                status: "DRAFT",
                payloadJson: sessionState as Prisma.InputJsonValue,
                generatedByUserId: auth.sub,
            },
        });

        // Write audit log
        await writeAuditLog({
            tenantId: auth.tenant_id,
            userId: auth.sub,
            caseId,
            action: "acknowledgment_session_started",
            entityType: "document",
            entityId: doc.id,
            documentId: doc.id,
            metadataJson: { document_type: templateKey, method },
        });

        return NextResponse.json({
            session_id: doc.id,
            verification_status: sessionState.verification_status,
            provider_result: sessionState.provider_result,
            available_methods: [
                { method: "SMS_OTP", legacy_method: "sms_otp", available: true, label_ar: "رمز التحقق برسالة نصية", reason: null },
                { method: "TABLET_SIGNATURE", legacy_method: "tablet_signature", available: true, label_ar: "توقيع الجهاز اللوحي", reason: null },
                { method: "NAFATH", legacy_method: "nafath", available: false, label_ar: "نفاذ", reason: "غير مفعّل" },
            ],
        });
    } catch (error) {
        return handleApiError(error);
    }
}
