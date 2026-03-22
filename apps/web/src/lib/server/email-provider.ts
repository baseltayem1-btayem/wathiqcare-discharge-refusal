import nodemailer from "nodemailer";

type GraphTokenPayload = {
    access_token?: string;
    [key: string]: unknown;
};

export type EmailDiagnostics = {
    provider: "microsoft-graph" | "smtp";
    tokenStatus?: number;
    tokenBody?: string;
    sendStatus?: number;
    sendBody?: string;
    smtpVerifyOk?: boolean;
    smtpVerifyError?: string;
    smtpSendResponse?: string;
    smtpAccepted?: string[];
    smtpRejected?: string[];
    messageId?: string;
};

type SendEmailArgs = {
    to: string;
    subject: string;
    html: string;
    text?: string;
};

function safeErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function redactTokenBody(body: string): string {
    try {
        const parsed = JSON.parse(body) as GraphTokenPayload;
        if (parsed.access_token) {
            parsed.access_token = "[REDACTED]";
        }
        return JSON.stringify(parsed);
    } catch {
        return body;
    }
}

function smtpConfigured(): boolean {
    return !!(process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());
}

async function sendViaSmtp(args: SendEmailArgs): Promise<EmailDiagnostics> {
    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT || "587");
    const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    const from = process.env.SMTP_FROM?.trim() || user;

    if (!host || !user || !pass || !from) {
        throw new Error("SMTP email configuration is missing");
    }

    const transport = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
    });

    const diagnostics: EmailDiagnostics = { provider: "smtp" };

    try {
        await transport.verify();
        diagnostics.smtpVerifyOk = true;
    } catch (error) {
        diagnostics.smtpVerifyOk = false;
        diagnostics.smtpVerifyError = safeErrorMessage(error);
        throw new Error(`SMTP verify failed: ${diagnostics.smtpVerifyError}`);
    }

    const result = await transport.sendMail({
        from,
        to: args.to,
        subject: args.subject,
        html: args.html,
        text: args.text,
    });

    diagnostics.messageId = result.messageId;
    diagnostics.smtpAccepted = (result.accepted || []).map(String);
    diagnostics.smtpRejected = (result.rejected || []).map(String);
    diagnostics.smtpSendResponse = result.response;
    return diagnostics;
}

async function sendViaMicrosoftGraph(args: SendEmailArgs): Promise<EmailDiagnostics> {
    const tenantId = process.env.MICROSOFT_TENANT_ID?.trim();
    const clientId = process.env.MICROSOFT_CLIENT_ID?.trim();
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET?.trim();
    const senderEmail = process.env.MICROSOFT_SENDER_EMAIL?.trim().toLowerCase();

    if (!tenantId || !clientId || !clientSecret || !senderEmail) {
        throw new Error("Microsoft Graph email configuration is missing");
    }

    const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            scope: "https://graph.microsoft.com/.default",
            grant_type: "client_credentials",
        }),
        cache: "no-store",
    });

    const tokenBodyRaw = await tokenResponse.text().catch(() => "");
    const diagnostics: EmailDiagnostics = {
        provider: "microsoft-graph",
        tokenStatus: tokenResponse.status,
        tokenBody: redactTokenBody(tokenBodyRaw),
    };

    if (!tokenResponse.ok) {
        throw new Error(`Failed to get Microsoft Graph token (${tokenResponse.status}): ${tokenBodyRaw}`);
    }

    let tokenJson: GraphTokenPayload;
    try {
        tokenJson = JSON.parse(tokenBodyRaw) as GraphTokenPayload;
    } catch {
        throw new Error("Microsoft Graph token response was not valid JSON");
    }

    if (!tokenJson.access_token) {
        throw new Error("Microsoft Graph token response did not include access_token");
    }

    const sendResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`, {
        method: "POST",
        headers: {
            authorization: `Bearer ${tokenJson.access_token}`,
            "content-type": "application/json",
        },
        body: JSON.stringify({
            message: {
                subject: args.subject,
                body: {
                    contentType: "HTML",
                    content: args.html,
                },
                toRecipients: [{ emailAddress: { address: args.to } }],
            },
            saveToSentItems: true,
        }),
        cache: "no-store",
    });

    const sendBodyRaw = await sendResponse.text().catch(() => "");
    diagnostics.sendStatus = sendResponse.status;
    diagnostics.sendBody = sendBodyRaw;

    if (!sendResponse.ok) {
        throw new Error(`Failed to send email via Microsoft Graph (${sendResponse.status}): ${sendBodyRaw}`);
    }

    return diagnostics;
}

export async function sendEmailWithDiagnostics(args: SendEmailArgs): Promise<EmailDiagnostics> {
    if (smtpConfigured()) {
        return sendViaSmtp(args);
    }
    return sendViaMicrosoftGraph(args);
}
