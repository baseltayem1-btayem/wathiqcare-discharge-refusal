import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { getConfiguredBackendApiBaseUrl } from "@/lib/server/backend";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import { buildAcknowledgmentMethods } from "../method-availability";

type RouteContext = { params: Promise<{ caseId: string }> };

// ── constants ───────────────────────────────────────────────────────────────

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
};

// ── helpers ────────────────────────────────────────────────────────────────

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

function extractBearerToken(request: NextRequest): string | null {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.trim()) return authHeader.trim();

    const cookieToken = request.cookies.get("wathiqcare_access_token")?.value?.trim();
    if (cookieToken) return `Bearer ${cookieToken}`;

    return null;
}

async function sendEmailNotice(
    request: NextRequest,
    caseId: string,
    patientName: string,
    recipientEmail: string,
) {
    const backendBase = getConfiguredBackendApiBaseUrl();
    if (!backendBase) {
        throw new ApiError(503, "تعذر إرسال إشعار البريد");
    }

    const authHeader = extractBearerToken(request);
    if (!authHeader) {
        throw new ApiError(401, "Not authenticated");
    }

    const endpoint = new URL("/api/emails/send", `${backendBase}/`);

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
}

// ── route ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest, { params }: RouteContext) {
    try {
        const prisma = getPrisma();

        const auth = await requireAuth(request); // ✅ FIX
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
        const inputPayload = body.payload ?? {};

        const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });

        if (!caseRecord) throw new ApiError(404, "Case not found");
        if (caseRecord.tenantId !== auth.tenant_id) throw new ApiError(403, "Tenant access denied");

        const patientName = safe(inputPayload["patient_name"] ?? caseRecord.patientName);
        const refNum = `ACK-${caseId.slice(0, 8)}-${Date.now()}`;

        const sessionState: Record<string, unknown> = {
            case_id: caseId,
            tenant_id: auth.tenant_id,
            document_type: templateKey,
            acknowledgment_method: method,
            verification_status: "pending",
            created_at: nowIso(),
            patient_name: patientName,
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

        const doc = await prisma.document.create({
            data: {
                tenantId: auth.tenant_id,
                caseId,
                documentType: "OTHER",
                templateKey: `ack_session:${templateKey}`,
                titleEn: "Acknowledgment Session",
                status: "DRAFT",
                payloadJson: sessionState as Prisma.InputJsonValue,
                generatedByUserId: auth.sub,
            },
        });

        await writeAuditLog({
            tenantId: auth.tenant_id,
            userId: auth.sub,
            caseId,
            action: "acknowledgment_session_started",
            entityType: "document",
            entityId: doc.id,
        });

        return NextResponse.json({
            session_id: doc.id,
            verification_status: sessionState.verification_status,
        });
    } catch (error) {
        return handleApiError(error);
    }
}