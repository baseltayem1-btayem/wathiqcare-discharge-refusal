import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { getConfiguredBackendApiBaseUrl } from "@/lib/server/backend";
import { ApiError, handleApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

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
    template_name?: string;
    template_vars?: Record<string, unknown>;
};

type MicrosoftGraphConfig = {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    senderEmail: string;
};

function safe(value: unknown): string {
    return (value == null ? "" : String(value)).trim();
}

function nowIso(): string {
    return new Date().toISOString();
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

function buildGraphTemplatePayload(args: {
    templateName: string;
    caseId: string;
    patientName: string;
    appBaseUrl: string;
    extra?: Record<string, unknown>;
}): { subject: string; htmlBody: string } {
    const { templateName, caseId, patientName, appBaseUrl, extra } = args;
    const caseUrl = `${appBaseUrl}/cases/${encodeURIComponent(caseId)}`;
    const reason = safe(extra?.reason || extra?.refusal_reason || extra?.discussion_summary);

    if (templateName === "legal_escalation_notice") {
        return {
            subject: `Legal Escalation Notice - Case ${caseId}`,
            htmlBody: `<div style="font-family: Arial, sans-serif; line-height: 1.7; color: #0f172a;"><p>Legal escalation is required for case <strong>${caseId}</strong>.</p><p>Patient: <strong>${patientName || "-"}</strong></p><p>${reason || "This case requires legal/compliance review."}</p><p><a href="${caseUrl}">Open case workspace</a></p></div>`,
        };
    }

    return {
        subject: `Discharge Refusal Follow-up - Case ${caseId}`,
        htmlBody: `<div style="font-family: Arial, sans-serif; line-height: 1.7; color: #0f172a;"><p>Discharge refusal follow-up for case <strong>${caseId}</strong>.</p><p>Patient: <strong>${patientName || "-"}</strong></p><p>${reason || "Please complete pending discharge-refusal workflow steps."}</p><p><a href="${caseUrl}">Open case workspace</a></p></div>`,
    };
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

    const endpoint = new URL("/api/emails/send", `${backendBase}/`);

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

async function sendViaMicrosoftGraphFallback(args: {
    request: NextRequest;
    caseId: string;
    patientName: string;
    to: string[];
    templateName: string;
    templateVars?: Record<string, unknown>;
}): Promise<EmailSendResponse> {
    const graph = getMicrosoftGraphConfig();
    if (!graph) {
        throw new ApiError(503, "إشعار البريد غير متاح: إعداد Microsoft Graph غير مكتمل.");
    }

    const tokenEndpoint = `https://login.microsoftonline.com/${graph.tenantId}/oauth2/v2.0/token`;
    const tokenBody = new URLSearchParams({
        client_id: graph.clientId,
        client_secret: graph.clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
    });

    const tokenResponse = await fetch(tokenEndpoint, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: tokenBody.toString(),
    });

    if (!tokenResponse.ok) {
        throw new ApiError(502, "تعذر الحصول على صلاحية إرسال البريد من Microsoft Graph.");
    }

    const tokenJson = (await tokenResponse.json().catch(() => null)) as { access_token?: string } | null;
    const accessToken = safe(tokenJson?.access_token);
    if (!accessToken) {
        throw new ApiError(502, "استجابة Microsoft Graph لا تحتوي access_token.");
    }

    const appBaseUrl = resolvePublicAppBaseUrl(args.request);
    const template = buildGraphTemplatePayload({
        templateName: args.templateName,
        caseId: args.caseId,
        patientName: args.patientName,
        appBaseUrl,
        extra: args.templateVars,
    });

    const graphEndpoint = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(graph.senderEmail)}/sendMail`;
    const sendResponse = await fetch(graphEndpoint, {
        method: "POST",
        headers: {
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
        },
        body: JSON.stringify({
            message: {
                subject: template.subject,
                body: {
                    contentType: "HTML",
                    content: template.htmlBody,
                },
                toRecipients: args.to.map((email) => ({ emailAddress: { address: email } })),
            },
            saveToSentItems: true,
        }),
    });

    if (!sendResponse.ok) {
        const detail = await sendResponse.text().catch(() => "");
        throw new ApiError(502, `تعذر إرسال البريد عبر Microsoft Graph. ${detail || ""}`.trim());
    }

    return {
        status: "sent",
        provider: "microsoft_graph_direct",
        recipients: args.to,
        subject: template.subject,
        log_id: `graph-fallback-${crypto.randomUUID()}`,
        sent_at: nowIso(),
    };
}

export async function POST(request: NextRequest) {
    try {
        const auth = requireAuth(request);

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

        let result: EmailSendResponse;
        try {
            result = await sendViaBackend({
                request,
                body: {
                    case_id: caseId,
                    to: recipients,
                    template_name: templateName,
                    template_vars: templateVars,
                },
            });
        } catch (error) {
            if (!(error instanceof ApiError) || error.status < 500) {
                throw error;
            }

            result = await sendViaMicrosoftGraphFallback({
                request,
                caseId,
                patientName: safe(templateVars.patient_name),
                to: recipients,
                templateName,
                templateVars,
            });
        }

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
            sent_at: result.sent_at || nowIso(),
        });
    } catch (error) {
        return handleApiError(error);
    }
}
