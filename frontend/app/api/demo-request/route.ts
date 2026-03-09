import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { ApiError, handleApiError } from "@/lib/server/http";

type DemoRequestPayload = {
  facilityName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
  employeeCount?: string | number;
  website?: string;
};

const ADMIN_EMAIL = "Admin@wathiqcare.med.sa";

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

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true";

  if (!host || !portRaw || !user || !pass) {
    throw new ApiError(503, "Mail service is not configured. Please contact support.");
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

    const transporter = createTransporter();
    const from = process.env.SMTP_FROM ?? "WathiqCare Demo Requests <no-reply@wathiqcare.med.sa>";

    const textBody = [
      "New WathiqCare demo request",
      "",
      `Organization: ${facilityName}`,
      `Contact person: ${contactName}`,
      `Contact email: ${contactEmail}`,
      `Contact phone: ${contactPhone}`,
      `Contact address: ${contactAddress}`,
      `Employee count: ${employeeCount}`,
      "",
      "Thank you for the request. A company representative should contact this organization promptly.",
    ].join("\n");

    await transporter.sendMail({
      from,
      to: ADMIN_EMAIL,
      replyTo: contactEmail,
      subject: `Demo Request - ${facilityName}`,
      text: textBody,
    });

    return NextResponse.json({
      ok: true,
      message: "Thank you for your request. A WathiqCare representative will contact you shortly.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}