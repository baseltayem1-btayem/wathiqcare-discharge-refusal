import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { getConfiguredBackendApiBaseUrl } from "@/lib/server/backend";
import { ApiError, handleApiError } from "@/lib/server/http";
<<<<<<< HEAD
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import { buildAcknowledgmentMethods } from "../method-availability";

type RouteContext = { params: Promise<{ caseId: string }> };

// ── constants ───────────────────────────────────────────────────────────────
=======
import { prisma } from "@/lib/server/prisma";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import { buildAcknowledgmentMethods } from "../method-availability";
type RouteContext = { params: Promise<{ caseId: string }> };

// ── helpers ────────────────────────────────────────────────────────────────
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e

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
<<<<<<< HEAD
};

// ── helpers ────────────────────────────────────────────────────────────────

=======
    home_healthcare: "home_healthcare_agreement",
    hhc_pdn_agreement: "home_healthcare_agreement",
};

>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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

<<<<<<< HEAD
=======
const AUTH_DEBUG = process.env.AUTH_DEBUG === "true";

function authDebugLog(event: string, details: Record<string, unknown> = {}): void {
    if (!AUTH_DEBUG) {
        return;
    }
    console.info("[auth-debug]", event, details);
}

>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
function nowIso(): string {
    return new Date().toISOString();
}

<<<<<<< HEAD
function extractBearerToken(request: NextRequest): string | null {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.trim()) return authHeader.trim();

    const cookieToken = request.cookies.get("wathiqcare_access_token")?.value?.trim();
    if (cookieToken) return `Bearer ${cookieToken}`;
=======
type EmailSendResponse = {
    log_id: string;
    status: string;
    provider: string;
    subject: string;
    recipients: string[];
    cc: string[];
    sent_at?: string | null;
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
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e

    return null;
}

<<<<<<< HEAD
async function sendEmailNotice(
=======
async function sendEmailNoticeViaBackend(
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    request: NextRequest,
    caseId: string,
    patientName: string,
    recipientEmail: string,
<<<<<<< HEAD
) {
    const backendBase = getConfiguredBackendApiBaseUrl();
    if (!backendBase) {
        throw new ApiError(503, "تعذر إرسال إشعار البريد");
=======
): Promise<EmailSendResponse> {
    const backendBase = getConfiguredBackendApiBaseUrl();
    if (!backendBase) {
        throw new ApiError(503, "تعذر إرسال إشعار البريد: خدمة الواجهة الخلفية غير متاحة حالياً.");
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    }

    const authHeader = extractBearerToken(request);
    if (!authHeader) {
        throw new ApiError(401, "Not authenticated");
    }

    const endpoint = new URL("/api/emails/send", `${backendBase}/`);
<<<<<<< HEAD

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            authorization: authHeader,
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

    if (!response.ok) {
        throw new ApiError(response.status, "Email sending failed");
    }

    return response.json();
=======
    authDebugLog("email_notice_backend_request_start", {
        endpoint: endpoint.toString(),
        caseId,
        recipientEmail,
        hasAuthorizationHeader: Boolean(authHeader),
    });

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

    authDebugLog("email_notice_backend_response", {
        endpoint: endpoint.toString(),
        status: response.status,
        ok: response.ok,
        isJson,
        payloadPreview:
            typeof responseBody === "string"
                ? responseBody.slice(0, 300)
                : responseBody && typeof responseBody === "object"
                    ? JSON.stringify(responseBody).slice(0, 300)
                    : null,
    });

    if (!response.ok) {
        const detail =
            responseBody && typeof responseBody === "object" && "detail" in responseBody
                ? String((responseBody as { detail?: unknown }).detail ?? "")
                : responseBody && typeof responseBody === "object" && "message" in responseBody
                    ? String((responseBody as { message?: unknown }).message ?? "")
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
): Promise<EmailSendResponse> {
    return sendEmailNoticeViaBackend(request, caseId, patientName, recipientEmail);
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
}

// ── route ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
<<<<<<< HEAD
        const prisma = getPrisma();

        const auth = await requireAuth(request); // ✅ FIX
=======
        const auth = requireAuth(request);
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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
<<<<<<< HEAD
        const inputPayload = body.payload ?? {};

        const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });

        if (!caseRecord) throw new ApiError(404, "Case not found");
        if (caseRecord.tenantId !== auth.tenant_id) throw new ApiError(403, "Tenant access denied");

        const patientName = safe(inputPayload["patient_name"] ?? caseRecord.patientName);
        const refNum = `ACK-${caseId.slice(0, 8)}-${Date.now()}`;

=======
        const inputPayload = (body.payload ?? {}) as Record<string, unknown>;

        // Verify case ownership
        const prisma = getPrisma();
        const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
        if (!caseRecord) throw new ApiError(404, "Case not found");
        if (caseRecord.tenantId !== auth.tenant_id) throw new ApiError(403, "Tenant access denied");

        // Build context from case record + payload
        const patientName = safe(inputPayload.patient_name ?? caseRecord.patientName);
        const medicalRecordNo = safe(inputPayload.medical_record_number ?? inputPayload.urn ?? caseRecord.medicalRecordNo);
        const refNum = `ACK-${caseId.slice(0, 8).toUpperCase()}-${new Date().toISOString().replace(/\D/g, "").slice(0, 12)}`;

        // Session state stored in Document.payloadJson
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        const sessionState: Record<string, unknown> = {
            case_id: caseId,
            tenant_id: auth.tenant_id,
            document_type: templateKey,
            acknowledgment_method: method,
            verification_status: "pending",
            created_at: nowIso(),
            patient_name: patientName,
<<<<<<< HEAD
            reference_number: refNum,
            provider_result: {},
        };

        if (method === "TABLET_SIGNATURE") {
            sessionState.verification_status = "awaiting_signature";
        }

        if (method === "EMAIL_NOTICE") {
            const email = safe(inputPayload["email"]);
            if (!email) throw new ApiError(400, "email required");

            const result = await sendEmailNotice(request, caseId, patientName, email);

            sessionState.verification_status = "notification_sent";
            sessionState.provider_result = result;
        }

=======
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
            const email = safe(inputPayload.email ?? inputPayload.patient_email);
            if (!email) throw new ApiError(400, "email is required for EMAIL_NOTICE");

            const emailResult = await sendEmailNotice(request, caseId, patientName, email);
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
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        const doc = await prisma.document.create({
            data: {
                tenantId: auth.tenant_id,
                caseId,
                documentType: "OTHER",
                templateKey: `ack_session:${templateKey}`,
<<<<<<< HEAD
                titleEn: "Acknowledgment Session",
=======
                titleEn: `Acknowledgment Session – ${templateKey}`,
                titleAr: "جلسة إقرار",
                fileName: `ack_session_${templateKey}.json`,
                mimeType: "application/json",
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
                status: "DRAFT",
                payloadJson: sessionState as Prisma.InputJsonValue,
                generatedByUserId: auth.sub,
            },
        });

<<<<<<< HEAD
=======
        // Write audit log
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        await writeAuditLog({
            tenantId: auth.tenant_id,
            userId: auth.sub,
            caseId,
            action: "acknowledgment_session_started",
            entityType: "document",
            entityId: doc.id,
<<<<<<< HEAD
=======
            documentId: doc.id,
            metadataJson: { document_type: templateKey, method },
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        });

        return NextResponse.json({
            session_id: doc.id,
            verification_status: sessionState.verification_status,
<<<<<<< HEAD
=======
            provider_result: sessionState.provider_result,
            available_methods: availableMethods,
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        });
    } catch (error) {
        return handleApiError(error);
    }
<<<<<<< HEAD
}
=======
}
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
