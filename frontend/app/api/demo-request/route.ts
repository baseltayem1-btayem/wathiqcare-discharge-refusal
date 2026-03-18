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
  website?: string;
};

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
};

function buildDemoRequestTextBody(args: DemoRequestEmailArgs): string {
  return [
    "New WathiqCare demo request",
    "",
    `Organization: ${args.facilityName}`,
    `Contact person: ${args.contactName}`,
    `Contact email: ${args.contactEmail}`,
    `Contact phone: ${args.contactPhone}`,
    `Contact address: ${args.contactAddress}`,
    `Employee count: ${args.employeeCount}`,
    "",
    "Thank you for the request. A company representative should contact this organization promptly.",
  ].join("\n");
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

  const subject = `Demo Request - ${args.facilityName}`;
  const textBody = buildDemoRequestTextBody(args);
  const graphEndpoint = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(graph.senderEmail)}/sendMail`;

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
          contentType: "Text",
          content: textBody,
        },
        toRecipients: [{ emailAddress: { address: ADMIN_EMAIL } }],
        replyTo: [{ emailAddress: { address: args.contactEmail } }],
      },
      saveToSentItems: true,
    }),
  });

  if (!sendResponse.ok) {
    const detail = await sendResponse.text().catch(() => "");
    throw new ApiError(502, `Microsoft Graph email send failed. ${detail}`.trim());
  }

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

  const subject = `Demo Request - ${args.facilityName}`;
  const textBody = buildDemoRequestTextBody(args);
  const from = process.env.SMTP_FROM ?? "WathiqCare Demo Requests <no-reply@wathiqcare.med.sa>";

  const transporter = createTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from,
        to: ADMIN_EMAIL,
        replyTo: args.contactEmail,
        subject,
        text: textBody,
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

  throw new ApiError(503, "Mail service is not configured. Please contact support.");
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => null)) as DemoRequestPayload | null;
    if (!payload) {
      throw new ApiError(400, "Invalid request body");
    }

    if (typeof payload.website === "string" && payload.website.trim()) {
      return NextResponse.json({
        ok: true,
        message: "Thank you for your request. A WathiqCare representative will contact you shortly.",
      });
    }

    const facilityName = normalizeText(payload.facilityName, "facilityName", 200);
    const contactName = normalizeText(payload.contactName, "contactName", 150);
    const contactEmail = normalizeEmail(payload.contactEmail);
    const contactPhone = normalizeText(payload.contactPhone, "contactPhone", 50);
    const contactAddress = normalizeText(payload.contactAddress, "contactAddress", 300);
    const employeeCount = normalizeEmployeeCount(payload.employeeCount);

    await sendDemoRequestEmail({
      facilityName,
      contactName,
      contactEmail,
      contactPhone,
      contactAddress,
      employeeCount,
    });

    return NextResponse.json({
      ok: true,
      message: "Thank you for your request. A WathiqCare representative will contact you shortly.",
    });
  } catch (error) {
    if (error instanceof ApiError && error.message === "Mail service is not configured. Please contact support.") {
      // Do not block the requester UX when infrastructure mail channels are temporarily unavailable.
      return NextResponse.json({
        ok: true,
        message: "Thank you for your request. A WathiqCare representative will contact you shortly.",
      });
    }

    return handleApiError(error);
  }
}