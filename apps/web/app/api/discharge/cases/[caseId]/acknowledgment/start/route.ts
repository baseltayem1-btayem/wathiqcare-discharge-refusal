import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantId } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import {
    buildWathiqCareEmailHtml,
    buildWathiqCareEmailText,
    sendEmailWithDiagnostics,
} from "@/lib/server/email-provider";
import { buildAcknowledgmentMethods } from "../method-availability";
type RouteContext = { params: Promise<{ caseId: string }> };

// ── helpers ────────────────────────────────────────────────────────────────

const SUPPORTED_METHODS = new Set(["TABLET_SIGNATURE", "EMAIL_NOTICE"]);

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

type EmailSendResponse = {
    log_id: string;
    status: string;
    provider: string;
    subject: string;
    recipients: string[];
    cc: string[];
    sent_at?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }
    return value as Record<string, unknown>;
}

function resolveRecipientEmail(inputPayload: Record<string, unknown>, caseMetadata: Record<string, unknown> | null): string {
    const candidate = safe(
        inputPayload.email
        ?? inputPayload.patient_email
        ?? caseMetadata?.email
        ?? caseMetadata?.patient_email
        ?? asRecord(caseMetadata?.discharge_plan)?.email
        ?? asRecord(caseMetadata?.notifications)?.recipient_email,
    ).toLowerCase();

    if (!candidate) {
        throw new ApiError(400, "email is required for EMAIL_NOTICE");
    }

    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(candidate);
    if (!valid) {
        throw new ApiError(400, "Invalid recipient email");
    }

    return candidate;
}

function buildEmailContent(documentType: string, caseId: string, patientName: string, recipientEmail: string): {
    subject: string;
    html: string;
    text: string;
} {
    const commonBody = {
        caseId,
        patientName: patientName || "N/A",
        recipient: recipientEmail,
    };

    if (documentType === "informed_consent") {
        const subject = `WathiqCare | Informed Consent Notification - Case ${caseId.slice(0, 8).toUpperCase()}`;
        const html = buildWathiqCareEmailHtml({
            title: "Informed Consent Notification",
            preheader: "A new informed consent acknowledgment has been initiated.",
            bodyHtml: `<p>Informed consent acknowledgment has been initiated for case <strong>${commonBody.caseId}</strong>.</p><p>Patient: <strong>${commonBody.patientName}</strong></p><p>Recipient: <strong>${commonBody.recipient}</strong></p>`,
            ctaUrl: `${process.env.NEXT_PUBLIC_APP_BASE_URL || "https://wathiqcare.online"}/cases/${caseId}/informed-consent`,
            ctaText: "Open Informed Consent",
            securityNote: "This communication is generated as part of a verified discharge workflow.",
        });
        const text = buildWathiqCareEmailText({
            title: "Informed Consent Notification",
            bodyLines: [
                `Informed consent acknowledgment started for case ${commonBody.caseId}.`,
                `Patient: ${commonBody.patientName}`,
                `Recipient: ${commonBody.recipient}`,
            ],
            ctaUrl: `${process.env.NEXT_PUBLIC_APP_BASE_URL || "https://wathiqcare.online"}/cases/${caseId}/informed-consent`,
            ctaLabel: "Open Informed Consent",
            securityNote: "This communication is generated as part of a verified discharge workflow.",
        });
        return { subject, html, text };
    }

    if (documentType === "home_healthcare_agreement") {
        const subject = `WathiqCare | Home Healthcare Agreement Notification - Case ${caseId.slice(0, 8).toUpperCase()}`;
        const html = buildWathiqCareEmailHtml({
            title: "Home Healthcare Agreement Notification",
            preheader: "A home healthcare agreement acknowledgment has been initiated.",
            bodyHtml: `<p>Home healthcare agreement acknowledgment has been initiated for case <strong>${commonBody.caseId}</strong>.</p><p>Patient: <strong>${commonBody.patientName}</strong></p><p>Recipient: <strong>${commonBody.recipient}</strong></p>`,
            ctaUrl: `${process.env.NEXT_PUBLIC_APP_BASE_URL || "https://wathiqcare.online"}/cases/${caseId}/home-healthcare-agreement`,
            ctaText: "Open Home Healthcare Agreement",
            securityNote: "This communication is generated as part of a verified discharge workflow.",
        });
        const text = buildWathiqCareEmailText({
            title: "Home Healthcare Agreement Notification",
            bodyLines: [
                `Home healthcare agreement acknowledgment started for case ${commonBody.caseId}.`,
                `Patient: ${commonBody.patientName}`,
                `Recipient: ${commonBody.recipient}`,
            ],
            ctaUrl: `${process.env.NEXT_PUBLIC_APP_BASE_URL || "https://wathiqcare.online"}/cases/${caseId}/home-healthcare-agreement`,
            ctaLabel: "Open Home Healthcare Agreement",
            securityNote: "This communication is generated as part of a verified discharge workflow.",
        });
        return { subject, html, text };
    }

    const subject = `WathiqCare | Medical Discharge Refusal Notification - Case ${caseId.slice(0, 8).toUpperCase()}`;
    const html = buildWathiqCareEmailHtml({
        title: "Medical Discharge Refusal Notification",
        preheader: "A discharge refusal acknowledgment has been initiated.",
        bodyHtml: `<p>Discharge refusal acknowledgment has been initiated for case <strong>${commonBody.caseId}</strong>.</p><p>Patient: <strong>${commonBody.patientName}</strong></p><p>Recipient: <strong>${commonBody.recipient}</strong></p>`,
        ctaUrl: `${process.env.NEXT_PUBLIC_APP_BASE_URL || "https://wathiqcare.online"}/cases/${caseId}/refusal-form`,
        ctaText: "Open Medical Discharge Refusal Form",
        securityNote: "This communication is generated as part of a verified discharge workflow.",
    });
    const text = buildWathiqCareEmailText({
        title: "Medical Discharge Refusal Notification",
        bodyLines: [
            `Discharge refusal acknowledgment started for case ${commonBody.caseId}.`,
            `Patient: ${commonBody.patientName}`,
            `Recipient: ${commonBody.recipient}`,
        ],
        ctaUrl: `${process.env.NEXT_PUBLIC_APP_BASE_URL || "https://wathiqcare.online"}/cases/${caseId}/refusal-form`,
        ctaLabel: "Open Medical Discharge Refusal Form",
        securityNote: "This communication is generated as part of a verified discharge workflow.",
    });
    return { subject, html, text };
}

async function sendEmailNotice(
    _request: NextRequest,
    caseId: string,
    patientName: string,
    recipientEmail: string,
    documentType: string,
): Promise<EmailSendResponse> {
    const startedAt = nowIso();
    const emailContent = buildEmailContent(documentType, caseId, patientName, recipientEmail);
    console.info("EMAIL_SEND_STARTED", {
        caseId,
        documentType,
        to: recipientEmail,
        subject: emailContent.subject,
        startedAt,
    });

    try {
        const diagnostics = await sendEmailWithDiagnostics({
            to: recipientEmail,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
        });

        console.info("EMAIL_SEND_SUCCESS", {
            caseId,
            documentType,
            to: recipientEmail,
            provider: diagnostics.provider,
            sendStatus: diagnostics.sendStatus ?? null,
            completedAt: nowIso(),
        });

        return {
            log_id: diagnostics.messageId || crypto.randomUUID(),
            status: "sent",
            provider: diagnostics.provider,
            subject: emailContent.subject,
            recipients: [recipientEmail],
            cc: [],
            sent_at: nowIso(),
        };
    } catch (error) {
        console.error("EMAIL_SEND_FAILURE", {
            caseId,
            documentType,
            to: recipientEmail,
            error: error instanceof Error ? error.message : String(error),
            failedAt: nowIso(),
        });
        throw new ApiError(502, "فشل إرسال إشعار البريد الإلكتروني. يرجى المحاولة مرة أخرى.");
    }
}

// ── route ──────────────────────────────────────────────────────────────────

const prisma = getPrisma();
try {
    const auth = await requireAuth(request);
    const tenantId = requireTenantId(auth);
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
    const caseRecord = await prisma.case.findFirst({ where: { id: caseId, tenantId } });
    if (!caseRecord) throw new ApiError(404, "Case not found");
    const caseMetadata = asRecord(caseRecord.metadata);

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

    const availableMethods = await buildAcknowledgmentMethods(request);

    // Method-specific setup
    if (method === "TABLET_SIGNATURE") {
        sessionState.verification_status = "awaiting_signature";
        sessionState.provider_result = { device_source: "TABLET" } as Record<string, unknown>;

        // Optional mobile OTP linkage (kept for backward compatibility)
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
    } else if (method === "EMAIL_NOTICE") {
        const email = resolveRecipientEmail(inputPayload, caseMetadata);

        const emailResult = await sendEmailNotice(request, caseId, patientName, email, templateKey);
        if (emailResult.status !== "sent") {
            throw new ApiError(502, "فشل إرسال إشعار البريد الإلكتروني. يرجى المحاولة مرة أخرى.");
        }

        sessionState.verification_status = "notification_sent";
        sessionState.provider_result = {
            channel: "email",
            recipient_email: email,
            delivery_status: emailResult.status,
            provider: emailResult.provider,
            sent_at: emailResult.sent_at ?? nowIso(),
            message_id: emailResult.log_id,
        };
    }

    // Persist session as a Document record; id becomes the session_id
    const doc = await prisma.document.create({
        data: {
            tenantId,
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
        tenantId,
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
        available_methods: availableMethods,
    });
} catch (error) {
    return handleApiError(error);
}
}
