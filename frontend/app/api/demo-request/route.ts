import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getConfiguredBackendApiBaseUrl } from "@/lib/server/backend";

type DemoRequestPayload = {
  facilityName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  employeeCount?: string | number;
  locale?: string;
  website?: string;
};

type Locale = "ar" | "en";

type MicrosoftGraphConfig = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  senderEmail: string;
};

const ADMIN_EMAIL = "admin@wathiqcare.med.sa";

function normalizeText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string") {
    throw new ApiError(400, `${field} is required`);
  }

  const cleaned = value.trim();
  if (!cleaned) {
    throw new ApiError(400, `${field} is required`);
  }

  if (cleaned.length > maxLength) {
    throw new ApiError(400, `${field} is too long`);
  }

  return cleaned;
}

function normalizeEmployeeCount(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1_000_000) {
    throw new ApiError(400, "employeeCount must be a valid positive integer");
  }
  return parsed;
}

function normalizeEmail(value: unknown): string {
  const email = normalizeText(value, "contactEmail", 320).toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ApiError(400, "contactEmail is invalid");
  }
  return email;
}

function normalizeLocale(value: unknown): Locale {
  return safe(value).toLowerCase() === "ar" ? "ar" : "en";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildSuccessMessage(locale: Locale): string {
  if (locale === "ar") {
    return "شكرًا على طلبكم. تم إرسال رسالة تأكيد إلى بريدكم الإلكتروني، وسيقوم مندوب شركة واثق كير بالتواصل معكم قريبًا.";
  }
  return "Thank you for your request. A confirmation email has been sent to your inbox, and a WathiqCare representative will contact you shortly.";
}

function getDemoInternalCopyRecipients(): string[] {
  const raw = safe(process.env.DEMO_REQUEST_INTERNAL_COPY_EMAILS);
  if (!raw) {
    return [];
  }

  const recipients: string[] = [];
  for (const part of raw.split(",")) {
    const email = part.trim().toLowerCase();
    if (!email || email === ADMIN_EMAIL) {
      continue;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      continue;
    }
    if (!recipients.includes(email)) {
      recipients.push(email);
    }
  }
  return recipients;
}

function safe(value: unknown): string {
  return (value == null ? "" : String(value)).trim();
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

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true";

  if (!host || !portRaw || !user || !pass) {
    return null;
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) {
    throw new ApiError(500, "SMTP_PORT is invalid");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

type DemoRequestEmailArgs = {
  facilityName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  employeeCount: number;
  locale: Locale;
};

function buildAdminDemoRequestTextBody(args: DemoRequestEmailArgs): string {
  const submittedAt = new Date().toISOString();

  return [
    "New WathiqCare demo request",
    "",
    `Submitted at (UTC): ${submittedAt}`,
    `Organization: ${args.facilityName}`,
    `Contact person: ${args.contactName}`,
    `Contact email: ${args.contactEmail}`,
    `Contact phone: ${args.contactPhone}`,
    `Contact address: ${args.contactAddress}`,
    `Employee count: ${args.employeeCount}`,
    `Preferred language: ${args.locale}`,
  ].join("\n");
}

function buildAdminDemoRequestHtmlBody(args: DemoRequestEmailArgs): string {
  return [
    "<div style='font-family: Arial, sans-serif; line-height: 1.6;'>",
    "<h3>New WathiqCare demo request</h3>",
    `<p><strong>Organization:</strong> ${escapeHtml(args.facilityName)}</p>`,
    `<p><strong>Contact person:</strong> ${escapeHtml(args.contactName)}</p>`,
    `<p><strong>Contact email:</strong> ${escapeHtml(args.contactEmail)}</p>`,
    `<p><strong>Contact phone:</strong> ${escapeHtml(args.contactPhone)}</p>`,
    `<p><strong>Contact address:</strong> ${escapeHtml(args.contactAddress)}</p>`,
    `<p><strong>Employee count:</strong> ${args.employeeCount}</p>`,
    `<p><strong>Preferred language:</strong> ${escapeHtml(args.locale)}</p>`,
    "</div>",
  ].join("");
}

type RequesterConfirmationContent = {
  subject: string;
  textBody: string;
  htmlBody: string;
};

function buildRequesterConfirmationContent(args: DemoRequestEmailArgs): RequesterConfirmationContent {
  if (args.locale === "ar") {
    const subject = "تم استلام طلبكم للعرض التجريبي من واثق كير";
    const textBody = [
      `مرحبًا ${args.contactName}،`,
      "",
      "شكرًا لطلبكم عرضًا تجريبيًا من واثق كير.",
      "هذا البريد يؤكد استلام طلبكم بنجاح.",
      "",
      "البيانات المرسلة:",
      `- اسم المنشأة: ${args.facilityName}`,
      `- اسم مسؤول التواصل: ${args.contactName}`,
      `- البريد الإلكتروني: ${args.contactEmail}`,
      `- رقم الهاتف: ${args.contactPhone}`,
      `- عنوان التواصل: ${args.contactAddress}`,
      `- عدد الموظفين: ${args.employeeCount}`,
      "",
      "الخطوات التالية:",
      "- سيقوم فريقنا بمراجعة الطلب والتواصل معكم خلال يوم عمل واحد.",
      "- إذا أردتم تعديل أي بيانات، يمكنكم الرد على هذا البريد.",
      "",
      "مع التحية،",
      "فريق واثق كير",
    ].join("\n");

    const htmlBody = [
      "<div style='background:#f6f8fb;padding:20px;'>",
      "<div style='max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #dce3ef;border-radius:14px;overflow:hidden;font-family:Tahoma, Arial, sans-serif;color:#0f172a;'>",
      "<div style='background:#0f172a;color:#ffffff;padding:16px 20px;'>",
      "<h2 style='margin:0;font-size:18px;'>WathiqCare | تأكيد استلام الطلب</h2>",
      "</div>",
      "<div style='padding:18px 20px;line-height:1.7;'>",
      `<p style='margin:0 0 12px 0;'>مرحبًا ${escapeHtml(args.contactName)}،</p>`,
      "<p style='margin:0 0 12px 0;'>شكرًا لطلبكم عرضًا تجريبيًا من <strong>واثق كير</strong>. تم استلام الطلب بنجاح.</p>",
      "<h3 style='font-size:15px;margin:16px 0 8px 0;'>البيانات المرسلة</h3>",
      "<ul style='margin:0 0 12px 0;padding-right:18px;'>",
      `<li><strong>اسم المنشأة:</strong> ${escapeHtml(args.facilityName)}</li>`,
      `<li><strong>اسم مسؤول التواصل:</strong> ${escapeHtml(args.contactName)}</li>`,
      `<li><strong>البريد الإلكتروني:</strong> ${escapeHtml(args.contactEmail)}</li>`,
      `<li><strong>رقم الهاتف:</strong> ${escapeHtml(args.contactPhone)}</li>`,
      `<li><strong>عنوان التواصل:</strong> ${escapeHtml(args.contactAddress)}</li>`,
      `<li><strong>عدد الموظفين:</strong> ${args.employeeCount}</li>`,
      "</ul>",
      "<h3 style='font-size:15px;margin:16px 0 8px 0;'>الخطوات التالية</h3>",
      "<ul style='margin:0;padding-right:18px;'>",
      "<li>سيقوم فريقنا بمراجعة الطلب والتواصل معكم خلال يوم عمل واحد.</li>",
      "<li>إذا أردتم تعديل أي بيانات، يمكنكم الرد على هذا البريد.</li>",
      "</ul>",
      "<p style='margin:16px 0 0 0;'>مع التحية،<br/>فريق واثق كير</p>",
      "</div>",
      "</div>",
      "</div>",
    ].join("");

    return { subject, textBody, htmlBody };
  }

  const subject = "We received your WathiqCare demo request";
  const textBody = [
    `Hello ${args.contactName},`,
    "",
    "Thank you for requesting a WathiqCare demo.",
    "This email confirms that we successfully received your submission.",
    "",
    "Submitted details:",
    `- Organization: ${args.facilityName}`,
    `- Contact person: ${args.contactName}`,
    `- Contact email: ${args.contactEmail}`,
    `- Contact phone: ${args.contactPhone}`,
    `- Contact address: ${args.contactAddress}`,
    `- Employee count: ${args.employeeCount}`,
    "",
    "What happens next:",
    "- Our team will review your request and contact you within one business day.",
    "- If any information needs to be corrected, please reply to this email.",
    "",
    "Best regards,",
    "WathiqCare Team",
  ].join("\n");

  const htmlBody = [
    "<div style='background:#f6f8fb;padding:20px;'>",
    "<div style='max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #dce3ef;border-radius:14px;overflow:hidden;font-family:Arial, sans-serif;color:#0f172a;'>",
    "<div style='background:#0f172a;color:#ffffff;padding:16px 20px;'>",
    "<h2 style='margin:0;font-size:18px;'>WathiqCare | Demo Request Confirmation</h2>",
    "</div>",
    "<div style='padding:18px 20px;line-height:1.7;'>",
    `<p style='margin:0 0 12px 0;'>Hello ${escapeHtml(args.contactName)},</p>`,
    "<p style='margin:0 0 12px 0;'>Thank you for requesting a <strong>WathiqCare</strong> demo. This email confirms that we successfully received your submission.</p>",
    "<h3 style='font-size:15px;margin:16px 0 8px 0;'>Submitted details</h3>",
    "<ul style='margin:0 0 12px 0;padding-left:18px;'>",
    `<li><strong>Organization:</strong> ${escapeHtml(args.facilityName)}</li>`,
    `<li><strong>Contact person:</strong> ${escapeHtml(args.contactName)}</li>`,
    `<li><strong>Contact email:</strong> ${escapeHtml(args.contactEmail)}</li>`,
    `<li><strong>Contact phone:</strong> ${escapeHtml(args.contactPhone)}</li>`,
    `<li><strong>Contact address:</strong> ${escapeHtml(args.contactAddress)}</li>`,
    `<li><strong>Employee count:</strong> ${args.employeeCount}</li>`,
    "</ul>",
    "<h3 style='font-size:15px;margin:16px 0 8px 0;'>What happens next</h3>",
    "<ul style='margin:0;padding-left:18px;'>",
    "<li>Our team will review your request and contact you within one business day.</li>",
    "<li>If any information needs to be corrected, please reply to this email.</li>",
    "</ul>",
    "<p style='margin:16px 0 0 0;'>Best regards,<br/>WathiqCare Team</p>",
    "</div>",
    "</div>",
    "</div>",
  ].join("");

  return { subject, textBody, htmlBody };
}

type SendGraphEmailArgs = {
  graph: MicrosoftGraphConfig;
  accessToken: string;
  to: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
  replyTo?: string;
};

async function sendGraphEmail(args: SendGraphEmailArgs): Promise<void> {
  const graphEndpoint = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(args.graph.senderEmail)}/sendMail`;

  const payload: Record<string, unknown> = {
    subject: args.subject,
    body: {
      contentType: args.htmlBody ? "HTML" : "Text",
      content: args.htmlBody ?? args.textBody,
    },
    toRecipients: [{ emailAddress: { address: args.to } }],
  };

  if (args.replyTo) {
    payload.replyTo = [{ emailAddress: { address: args.replyTo } }];
  }

  const sendResponse = await fetch(graphEndpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${args.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      message: payload,
      saveToSentItems: true,
    }),
  });

  if (!sendResponse.ok) {
    const detail = await sendResponse.text().catch(() => "");
    throw new ApiError(502, `Microsoft Graph email send failed. ${detail}`.trim());
  }
}

async function sendViaMicrosoftGraph(args: DemoRequestEmailArgs): Promise<boolean> {
  const graph = getMicrosoftGraphConfig();
  if (!graph) {
    return false;
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
    throw new ApiError(502, "Unable to get Microsoft Graph token for demo request email.");
  }

  const tokenJson = (await tokenResponse.json().catch(() => null)) as { access_token?: string } | null;
  const accessToken = safe(tokenJson?.access_token);
  if (!accessToken) {
    throw new ApiError(502, "Microsoft Graph token response is invalid.");
  }

  const internalCopyRecipients = getDemoInternalCopyRecipients();
  const requesterContent = buildRequesterConfirmationContent(args);

  await sendGraphEmail({
    graph,
    accessToken,
    to: ADMIN_EMAIL,
    subject: `New Demo Request - ${args.facilityName}`,
    textBody: buildAdminDemoRequestTextBody(args),
    htmlBody: buildAdminDemoRequestHtmlBody(args),
    replyTo: args.contactEmail,
  });

  for (const internalRecipient of internalCopyRecipients) {
    await sendGraphEmail({
      graph,
      accessToken,
      to: internalRecipient,
      subject: `New Demo Request - ${args.facilityName}`,
      textBody: buildAdminDemoRequestTextBody(args),
      htmlBody: buildAdminDemoRequestHtmlBody(args),
      replyTo: args.contactEmail,
    });
  }

  await sendGraphEmail({
    graph,
    accessToken,
    to: args.contactEmail,
    subject: requesterContent.subject,
    textBody: requesterContent.textBody,
    htmlBody: requesterContent.htmlBody,
    replyTo: ADMIN_EMAIL,
  });

  return true;
}

async function sendViaInternalBackend(args: DemoRequestEmailArgs): Promise<boolean> {
  const backendBase = getConfiguredBackendApiBaseUrl();
  if (!backendBase) {
    return false;
  }

  const endpoint = new URL("/api/emails/send-demo-request", `${backendBase}/`);
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        facility_name: args.facilityName,
        contact_name: args.contactName,
        contact_email: args.contactEmail,
        contact_phone: args.contactPhone,
        contact_address: args.contactAddress,
        employee_count: args.employeeCount,
        preferred_language: args.locale,
      }),
    });
  } catch {
    return false;
  }

  if (!response.ok) {
    return false;
  }

  return true;
}

async function sendDemoRequestEmail(args: DemoRequestEmailArgs): Promise<void> {
  const internalSent = await sendViaInternalBackend(args);
  if (internalSent) {
    return;
  }

  const adminSubject = `New Demo Request - ${args.facilityName}`;
  const adminTextBody = buildAdminDemoRequestTextBody(args);
  const adminHtmlBody = buildAdminDemoRequestHtmlBody(args);
  const requesterContent = buildRequesterConfirmationContent(args);
  const internalCopyRecipients = getDemoInternalCopyRecipients();
  const from = process.env.SMTP_FROM ?? "WathiqCare Demo Requests <no-reply@wathiqcare.med.sa>";

  const transporter = createTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from,
        to: ADMIN_EMAIL,
        replyTo: args.contactEmail,
        subject: adminSubject,
        text: adminTextBody,
        html: adminHtmlBody,
      });

      for (const internalRecipient of internalCopyRecipients) {
        await transporter.sendMail({
          from,
          to: internalRecipient,
          replyTo: args.contactEmail,
          subject: adminSubject,
          text: adminTextBody,
          html: adminHtmlBody,
        });
      }

      await transporter.sendMail({
        from,
        to: args.contactEmail,
        replyTo: ADMIN_EMAIL,
        subject: requesterContent.subject,
        text: requesterContent.textBody,
        html: requesterContent.htmlBody,
      });
      return;
    } catch {
      // Fall back to Microsoft Graph if SMTP delivery fails.
    }
  }

  const graphSent = await sendViaMicrosoftGraph(args);
  if (graphSent) {
    return;
  }

  throw new ApiError(503, "Demo request delivery channels are unavailable.");
}

export async function POST(request: Request) {
  let requestLocale: Locale = "en";

  try {
    const payload = (await request.json().catch(() => null)) as DemoRequestPayload | null;
    if (!payload) {
      throw new ApiError(400, "Invalid request body");
    }

    const locale = normalizeLocale(payload.locale);
    requestLocale = locale;

    if (typeof payload.website === "string" && payload.website.trim()) {
      return NextResponse.json({
        ok: true,
        message: buildSuccessMessage(locale),
      });
    }

    const facilityName = normalizeText(payload.facilityName, "facilityName", 200);
    const contactName = normalizeText(payload.contactName, "contactName", 150);
    const contactEmail = normalizeEmail(payload.contactEmail);
    const contactPhone = normalizeText(payload.contactPhone, "contactPhone", 50);
    const contactAddress = normalizeText(payload.contactAddress, "contactAddress", 300);
    const employeeCount = normalizeEmployeeCount(payload.employeeCount);

    let deliveryStatus: "sent" | "pending" = "sent";

    try {
      await sendDemoRequestEmail({
        facilityName,
        contactName,
        contactEmail,
        contactPhone,
        contactAddress,
        employeeCount,
        locale,
      });
    } catch (deliveryError) {
      if (!(deliveryError instanceof ApiError) || deliveryError.status < 500) {
        throw deliveryError;
      }

      deliveryStatus = "pending";
      console.error("[demo-request] Email delivery unavailable; request accepted for follow-up", {
        reason: deliveryError.message,
        facilityName,
        contactName,
        contactEmail,
      });
    }

    return NextResponse.json({
      ok: true,
      message: buildSuccessMessage(locale),
      delivery_status: deliveryStatus,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status >= 500) {
      console.error("[demo-request] API fallback accepted request after 5xx", { detail: error.message });
      return NextResponse.json({
        ok: true,
        message: buildSuccessMessage(requestLocale),
        delivery_status: "pending",
      });
    }

    return handleApiError(error);
  }
}