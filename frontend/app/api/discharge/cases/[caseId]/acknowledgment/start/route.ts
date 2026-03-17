import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { getConfiguredBackendApiBaseUrl } from "@/lib/server/backend";
import { ApiError, handleApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
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

type MicrosoftGraphConfig = {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    senderEmail: string;
};

function extractBearerToken(request: NextRequest): string | null {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.trim()) {
        return authHeader.trim();
    }

    const cookieToken = request.cookies.get("wathiqcare_access_token")?.value?.trim();
    if (cookieToken) {
        return `Bearer ${cookieToken}`;
    }

    return null;
}

function getMicrosoftGraphConfig(): MicrosoftGraphConfig | null {
    const tenantId = safe(process.env.MICROSOFT_TENANT_ID);
    const clientId = safe(process.env.MICROSOFT_CLIENT_ID);
    const clientSecret = safe(process.env.MICROSOFT_CLIENT_SECRET);
    const senderEmail = safe(process.env.MICROSOFT_SENDER_EMAIL).toLowerCase();

    if (!tenantId || !clientId || !clientSecret || !senderEmail) {
        return null;
    }

    return { tenantId, clientId, clientSecret, senderEmail };
}

function resolvePublicAppBaseUrl(request: NextRequest): string {
    const fromEnv = safe(process.env.NEXT_PUBLIC_APP_URL);
    if (fromEnv && /^https?:\/\//i.test(fromEnv)) {
        return fromEnv.replace(/\/$/, "");
    }

    const host = request.headers.get("host") || "";
    if (!host) {
        return "http://localhost:3000";
    }

    const proto = safe(request.headers.get("x-forwarded-proto")) || (host.includes("localhost") ? "http" : "https");
    return `${proto}://${host}`;
}

function resolvePatientActionUrl(request: NextRequest, caseId: string, templateKey: string): string {
    const baseUrl = resolvePublicAppBaseUrl(request);
    const pathByTemplate: Record<string, string> = {
        informed_consent: "informed-consent",
        financial_responsibility_notice: "financial-notice",
        discharge_refusal_form: "refusal-form",
        home_healthcare_agreement: "home-healthcare-agreement",
    };

    const routePath = pathByTemplate[templateKey] || "informed-consent";
    return `${baseUrl}/cases/${encodeURIComponent(caseId)}/${routePath}?method=EMAIL_NOTICE`;
}

async function sendViaMicrosoftGraphDirect(
    request: NextRequest,
    caseId: string,
    patientName: string,
    recipientEmail: string,
    templateKey: string,
): Promise<EmailSendResponse> {
    const graphConfig = getMicrosoftGraphConfig();
    if (!graphConfig) {
        throw new ApiError(503, "تعذر إرسال إشعار البريد: إعدادات Microsoft Graph غير مكتملة.");
    }

    const tokenEndpoint = `https://login.microsoftonline.com/${graphConfig.tenantId}/oauth2/v2.0/token`;
    const tokenParams = new URLSearchParams({
        client_id: graphConfig.clientId,
        client_secret: graphConfig.clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
    });

    const tokenResponse = await fetch(tokenEndpoint, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
        throw new ApiError(502, "تعذر الحصول على صلاحية إرسال البريد من Microsoft Graph.");
    }

    const tokenJson = (await tokenResponse.json().catch(() => null)) as { access_token?: string } | null;
    const accessToken = safe(tokenJson?.access_token);
    if (!accessToken) {
        throw new ApiError(502, "استجابة Microsoft Graph لا تحتوي access_token.");
    }

    const actionUrl = resolvePatientActionUrl(request, caseId, templateKey);
    const subject = `إشعار إقرار طبي - الحالة ${caseId}`;
    const htmlBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #0f172a;">
            <p>عزيزي/عزيزتي ${patientName || "المريض"}،</p>
            <p>تم إنشاء جلسة إقرار مرتبطة بحالتك الطبية. يرجى فتح الرابط التالي لإكمال الإقرار/التوقيع:</p>
            <p><a href="${actionUrl}">${actionUrl}</a></p>
            <p>رقم الحالة: <strong>${caseId}</strong></p>
            <p>فريق واثق كير</p>
        </div>
    `;
    const textBody = `عزيزي/عزيزتي ${patientName || "المريض"},\n\nيرجى إكمال الإقرار عبر الرابط التالي:\n${actionUrl}\n\nرقم الحالة: ${caseId}\nفريق واثق كير`;

    const graphEndpoint = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(graphConfig.senderEmail)}/sendMail`;
    const sendResponse = await fetch(graphEndpoint, {
        method: "POST",
        headers: {
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
        },
        body: JSON.stringify({
            message: {
                subject,
                body: {
                    contentType: "HTML",
                    content: htmlBody,
                },
                toRecipients: [{ emailAddress: { address: recipientEmail } }],
            },
            saveToSentItems: true,
        }),
    });

    if (!sendResponse.ok) {
        const detail = await sendResponse.text().catch(() => "");
        throw new ApiError(502, `تعذر إرسال البريد عبر Microsoft Graph. ${detail || ""}`.trim());
    }

    return {
        log_id: `graph-direct-${crypto.randomUUID()}`,
        status: "sent",
        provider: "microsoft_graph_direct",
        subject,
        recipients: [recipientEmail],
        cc: [],
        sent_at: nowIso(),
    };
}

async function sendEmailNoticeViaBackend(
    request: NextRequest,
    caseId: string,
    patientName: string,
    recipientEmail: string,
): Promise<EmailSendResponse> {
    const backendBase = getConfiguredBackendApiBaseUrl();
    if (!backendBase) {
        throw new ApiError(503, "تعذر إرسال إشعار البريد: خدمة الواجهة الخلفية غير متاحة حالياً.");
    }

    const authHeader = extractBearerToken(request);
    if (!authHeader) {
        throw new ApiError(401, "Not authenticated");
    }

    const endpoint = new URL("/api/emails/send", `${backendBase}/`);
    let response: Response;
    try {
        response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "accept": "application/json",
                "authorization": authHeader,
            },
            body: JSON.stringify({
                case_id: caseId,
                to: [recipientEmail],
                template_name: "discharge_refusal_follow_up",
                template_vars: {
                    case_id: caseId,
                    patient_name: patientName,
                },
            }),
        });
    } catch {
        throw new ApiError(503, "تعذر الاتصال بخدمة البريد في الواجهة الخلفية.");
    }

    const isJson = (response.headers.get("content-type") || "").includes("application/json");
    const responseBody = isJson
        ? await response.json().catch(() => null)
        : await response.text().catch(() => "");

    if (!response.ok) {
        const detail =
            responseBody && typeof responseBody === "object" && "detail" in responseBody
                ? String((responseBody as { detail?: unknown }).detail ?? "")
                : typeof responseBody === "string"
                    ? responseBody
                    : "";
        throw new ApiError(
            response.status,
            detail || `تعذر إرسال إشعار البريد الإلكتروني (${response.status})`,
        );
    }

    return responseBody as EmailSendResponse;
}

async function sendEmailNotice(
    request: NextRequest,
    caseId: string,
    patientName: string,
    recipientEmail: string,
    templateKey: string,
): Promise<EmailSendResponse> {
    try {
        return await sendEmailNoticeViaBackend(request, caseId, patientName, recipientEmail);
    } catch (error) {
        if (error instanceof ApiError && error.status >= 500) {
            return sendViaMicrosoftGraphDirect(request, caseId, patientName, recipientEmail, templateKey);
        }
        throw error;
    }
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
            const email = safe(inputPayload.email ?? inputPayload.patient_email);
            if (!email) throw new ApiError(400, "email is required for EMAIL_NOTICE");

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
                { method: "TABLET_SIGNATURE", legacy_method: "tablet_signature", available: true, label_ar: "توقيع الجهاز اللوحي", reason: null },
                { method: "EMAIL_NOTICE", legacy_method: "email_notice", available: true, label_ar: "إرسال إشعار عبر البريد الإلكتروني", reason: null },
            ],
        });
    } catch (error) {
        return handleApiError(error);
    }
}
