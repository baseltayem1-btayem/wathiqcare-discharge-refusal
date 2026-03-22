import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { getConfiguredBackendApiBaseUrl } from "@/lib/server/backend";
import { ApiError, handleApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import { getSessionCookieName } from "@/lib/server/sessionCookie";

type EmailSendResponse = {
    status: string;
    provider?: string;
    recipients?: string[];
    subject?: string;
    log_id?: string;
    sent_at?: string | null;
};

type WorkflowNotificationBody = {
    case_id?: string;
    to?: string[];
    cc?: string[];
    template_name?: string;
    template_vars?: Record<string, unknown>;
    include_latest_case_documents?: boolean;
    attachment_document_ids?: string[];
};

function safe(value: unknown): string {
    return (value == null ? "" : String(value)).trim();
}

function extractBearerToken(request: NextRequest): string | null {
    const cookieToken = request.cookies.get(getSessionCookieName())?.value?.trim();
    if (cookieToken) {
        return `Bearer ${cookieToken}`;
    }

    return null;
}

async function sendViaBackend(args: {
    request: NextRequest;
    body: WorkflowNotificationBody;
}): Promise<EmailSendResponse> {
    const backendBase = getConfiguredBackendApiBaseUrl();
    if (!backendBase) {
        throw new ApiError(503, "الخدمة الخلفية غير متاحة لإرسال البريد حالياً.");
    }

    const authHeader = extractBearerToken(args.request);
    if (!authHeader) {
        throw new ApiError(401, "Not authenticated");
    }

    const endpoint = new URL("/api/emails/send-workflow-notification", `${backendBase}/`);

    let response: Response;
    try {
        response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                accept: "application/json",
                authorization: authHeader,
            },
            body: JSON.stringify(args.body),
        });
    } catch {
        throw new ApiError(503, "تعذر الاتصال بخدمة البريد في الواجهة الخلفية.");
    }

    const isJson = (response.headers.get("content-type") || "").includes("application/json");
    const payload = isJson ? await response.json().catch(() => null) : await response.text().catch(() => "");

    if (!response.ok) {
        const detail =
            payload && typeof payload === "object" && "detail" in payload
                ? String((payload as { detail?: unknown }).detail ?? "")
                : typeof payload === "string"
                    ? payload
                    : "";

        throw new ApiError(response.status, detail || `تعذر إرسال إشعار البريد الإلكتروني (${response.status})`);
    }

    return (payload || { status: "sent", provider: "backend" }) as EmailSendResponse;
}
export async function POST(request: NextRequest) {
    try {
        const auth = await requireAuth(request);

        const body = (await request.json().catch(() => null)) as WorkflowNotificationBody | null;
        const caseId = safe(body?.case_id);
        const recipients = Array.isArray(body?.to)
            ? body!.to.map((item) => safe(item).toLowerCase()).filter((item) => item.length > 0)
            : [];
        const templateName = safe(body?.template_name) || "discharge_refusal_follow_up";

        if (!caseId) {
            throw new ApiError(400, "case_id is required");
        }
        if (recipients.length === 0) {
            throw new ApiError(400, "to is required");
        }

        const caseRecord = await prisma.case.findUnique({ where: { id: caseId } });
        if (!caseRecord) {
            throw new ApiError(404, "Case not found");
        }
        if (caseRecord.tenantId !== auth.tenant_id) {
            throw new ApiError(403, "Tenant access denied");
        }

        const templateVars = {
            ...(body?.template_vars || {}),
            case_id: caseId,
            patient_name: safe(body?.template_vars?.patient_name || caseRecord.patientName),
        } as Record<string, unknown>;

        const result = await sendViaBackend({
            request,
            body: {
                case_id: caseId,
                to: recipients,
                cc: Array.isArray(body?.cc) ? body.cc.map((item) => safe(item).toLowerCase()).filter(Boolean) : [],
                template_name: templateName,
                template_vars: templateVars,
                include_latest_case_documents: Boolean(body?.include_latest_case_documents),
                attachment_document_ids: Array.isArray(body?.attachment_document_ids)
                    ? body.attachment_document_ids.map((item) => safe(item)).filter(Boolean)
                    : [],
            },
        });

        await writeAuditLog({
            tenantId: auth.tenant_id,
            userId: auth.sub,
            entityType: "case",
            entityId: caseId,
            caseId,
            action: "workflow_email_notification_sent",
            details: `Workflow email notification sent via ${result.provider || "unknown"}`,
            metadataJson: {
                template_name: templateName,
                recipients,
                provider: result.provider || null,
            },
            request,
        });

        return NextResponse.json({
            status: "sent",
            provider: result.provider || "backend",
            recipients,
            subject: result.subject || null,
            sent_at: result.sent_at || null,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
