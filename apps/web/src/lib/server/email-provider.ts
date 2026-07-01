import nodemailer from "nodemailer";

// ---------------------------------------------------------------------------
// Shared WathiqCare brand email template
// ---------------------------------------------------------------------------

type EmailTemplateOptions = {
    title: string;
    preheader?: string;
    bodyHtml: string;
    ctaUrl?: string;
    ctaText?: string;
    expiresNote?: string;
    securityNote: string;
};

type EmailTextOptions = {
    title: string;
    bodyLines: string[];
    ctaUrl?: string;
    ctaLabel?: string;
    expiresNote?: string;
    securityNote: string;
};

export function buildWathiqCareEmailHtml(opts: EmailTemplateOptions): string {
    const preheaderHtml = opts.preheader
        ? `<div style="display:none;font-size:1px;color:#eef7fb;line-height:1px;max-height:0;overflow:hidden;mso-hide:all;">${opts.preheader}</div>`
        : "";
    const expiresHtml = opts.expiresNote
        ? `<p style="margin:20px 0 0;padding:12px 16px;background:#f0f9ff;border-radius:8px;border-left:4px solid #0891b2;font-size:13px;color:#0f172a;line-height:1.6;">&#9200; ${opts.expiresNote}</p>`
        : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:#eef7fb;font-family:Arial,Helvetica,sans-serif;">
${preheaderHtml}
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef7fb;">
    <tr><td align="center" style="padding:36px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f766e 0%,#0891b2 100%);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
            <div style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">WathiqCare</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.75);margin-top:4px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">Healthcare Discharge Compliance Platform</div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:32px 32px 24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;line-height:1.3;">${opts.title}</h1>
            ${opts.bodyHtml}
            ${opts.ctaUrl && opts.ctaText ? `
            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;">
              <tr><td align="center">
                <a href="${opts.ctaUrl}"
                   style="display:inline-block;background:linear-gradient(135deg,#0f766e 0%,#0891b2 100%);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;line-height:1.4;min-width:200px;text-align:center;mso-padding-alt:14px 36px;">
                  ${opts.ctaText}
                </a>
              </td></tr>
            </table>
            <!-- Fallback link -->
            <p style="margin:20px 0 0;font-size:12px;color:#64748b;text-align:center;line-height:1.7;">
              If the button doesn't work, copy this link into your browser:<br />
              <a href="${opts.ctaUrl}" style="color:#0891b2;word-break:break-all;">${opts.ctaUrl}</a>
            </p>
            ` : ""}
            ${expiresHtml}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:20px 32px;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.7;">
              &#128274; ${opts.securityNote}
            </p>
            <p style="margin:14px 0 0;font-size:11px;color:#cbd5e1;border-top:1px solid #e2e8f0;padding-top:14px;line-height:1.6;">
              WathiqCare &mdash; Healthcare Discharge Compliance Platform<br />
              <a href="https://wathiqcare.online" style="color:#94a3b8;text-decoration:none;">wathiqcare.online</a>
              &nbsp;&middot;&nbsp;
              <a href="mailto:support@wathiqcare.online" style="color:#94a3b8;text-decoration:none;">support@wathiqcare.online</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildWathiqCareEmailText(opts: EmailTextOptions): string {
    const lines: string[] = [
        opts.title,
        "─".repeat(Math.min(opts.title.length, 60)),
        "",
        ...opts.bodyLines,
        "",
    ];

    if (opts.ctaLabel && opts.ctaUrl) {
        lines.push(`${opts.ctaLabel}: ${opts.ctaUrl}`, "");
    }
    if (opts.expiresNote) {
        lines.push(opts.expiresNote, "");
    }
    lines.push(
        opts.securityNote,
        "If you did not request this, please ignore this email. Your account remains secure.",
        "",
        "─────────────────────────────────────",
        "WathiqCare — Healthcare Discharge Compliance Platform",
        "https://wathiqcare.online  |  support@wathiqcare.online",
    );
    return lines.join("\n");
}

// ---------------------------------------------------------------------------

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

function smtpConfigured(): boolean {
    const pass = process.env.SMTP_PASS?.trim() || process.env.RESEND_API_KEY?.trim();
    return !!pass;
}

async function sendViaSmtp(args: SendEmailArgs): Promise<EmailDiagnostics> {
    const host = process.env.SMTP_HOST?.trim() || "smtp.resend.com";
    const port = Number(process.env.SMTP_PORT || "587");
    const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
    const user = process.env.SMTP_USER?.trim() || "resend";
    const pass = process.env.SMTP_PASS?.trim() || process.env.RESEND_API_KEY?.trim();
    const from = process.env.EMAIL_FROM?.trim() || process.env.SMTP_FROM?.trim() || process.env.MICROSOFT_SENDER_EMAIL?.trim() || "noreply@wathiqcare.online";

    if (!pass) {
        throw new Error("SMTP email configuration is missing: SMTP_PASS or RESEND_API_KEY must be set");
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

export async function sendEmailWithDiagnostics(args: SendEmailArgs): Promise<EmailDiagnostics> {
    if (!smtpConfigured()) {
        throw new Error("SMTP email configuration is missing: SMTP_PASS or RESEND_API_KEY must be set");
    }
    return sendViaSmtp(args);
}
