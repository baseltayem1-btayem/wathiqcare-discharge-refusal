import { NextResponse } from "next/server";
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

type DemoRequestEmailArgs = {
  facilityName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  employeeCount: number;
  locale: Locale;
};

const RESERVED_EMAIL_DOMAINS = new Set(["example.com", "example.org", "example.net", "invalid", "localhost"]);

function safe(value: unknown): string {
  return (value == null ? "" : String(value)).trim();
}

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

  const domain = email.split("@")[1] ?? "";
  if (RESERVED_EMAIL_DOMAINS.has(domain)) {
    throw new ApiError(400, "Please provide a valid work email address.");
  }

  return email;
}

function normalizeLocale(value: unknown): Locale {
  return safe(value).toLowerCase() === "ar" ? "ar" : "en";
}

function buildSuccessMessage(locale: Locale): string {
  if (locale === "ar") {
    return "شكرًا على طلبكم. تم إرسال رسالة تأكيد إلى بريدكم الإلكتروني، وسيقوم مندوب شركة واثق كير بالتواصل معكم قريبًا.";
  }
  return "Thank you for your request. A confirmation email has been sent to your inbox, and a WathiqCare representative will contact you shortly.";
}

async function sendDemoRequestEmail(args: DemoRequestEmailArgs): Promise<void> {
  const backendBase = getConfiguredBackendApiBaseUrl();
  if (!backendBase) {
    throw new ApiError(503, "Demo request delivery is unavailable because the backend API base URL is not configured.");
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
    throw new ApiError(503, "Demo request delivery is unavailable because the backend email service could not be reached.");
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

    throw new ApiError(response.status, detail || `Demo request delivery failed (${response.status})`);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => null)) as DemoRequestPayload | null;
    if (!payload) {
      throw new ApiError(400, "Invalid request body");
    }

    const locale = normalizeLocale(payload.locale);

    if (typeof payload.website === "string" && payload.website.trim()) {
      return NextResponse.json({
        ok: true,
        message: buildSuccessMessage(locale),
        delivery_status: "sent",
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
      locale,
    });

    return NextResponse.json({
      ok: true,
      message: buildSuccessMessage(locale),
      delivery_status: "sent",
    });
  } catch (error) {
    return handleApiError(error);
  }
}